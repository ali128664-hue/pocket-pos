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

/**
 * Uploads a product image to Supabase Storage bucket 'shop-assets'
 * Isolated by shop: products/<shopId>/<timestamp>.<ext>
 * Returns the public URL or null if upload failed or was skipped.
 */
export async function uploadProductImage(
  fileUri: string,
  shopId: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { url: fileUri, error: null };
    }

    // Determine extension and path
    const fileExt = fileUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `products/${shopId}/${fileName}`;

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
      console.warn('Product image upload warning:', uploadError.message);
      return { url: null, error: new Error(uploadError.message) };
    }

    const { data } = supabase.storage.from('shop-assets').getPublicUrl(filePath);
    return { url: data.publicUrl, error: null };
  } catch (err: any) {
    console.warn('uploadProductImage exception:', err);
    return { url: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

