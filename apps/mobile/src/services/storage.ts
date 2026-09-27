import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Uploads a shop logo to Supabase Storage bucket 'shop-assets'
 * Returns the public URL or null if upload failed or was skipped.
 */
export async function uploadShopLogo(
  fileUri: string,
  userId: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { url: fileUri, error: null };
    }

    // Determine extension and path
    const fileExt = fileUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    // Read image as ArrayBuffer for reliable mobile binary upload
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('shop-assets')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
        upsert: true,
      });

    if (uploadError) {
      console.warn('Shop logo upload warning:', uploadError.message);
      return { url: null, error: new Error(uploadError.message) };
    }

    const { data } = supabase.storage.from('shop-assets').getPublicUrl(filePath);
    return { url: data.publicUrl, error: null };
  } catch (err: any) {
    console.warn('uploadShopLogo exception:', err);
    return { url: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
