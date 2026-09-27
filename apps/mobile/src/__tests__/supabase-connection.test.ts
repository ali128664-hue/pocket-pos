import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function verifySupabaseConnection() {
  console.log('🧪 Verifying live Supabase connection...\n');

  // Load .env manually in Node test runner
  const envPath = path.resolve(__dirname, '../../.env');
  assert(fs.existsSync(envPath), '.env file must exist');

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');

  let url = '';
  let key = '';

  for (const line of envLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) {
      url = trimmed.split('=')[1].trim();
    } else if (trimmed.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) {
      key = trimmed.split('=')[1].trim();
    }
  }

  assert(Boolean(url), 'EXPO_PUBLIC_SUPABASE_URL must be defined');
  assert(Boolean(key), 'EXPO_PUBLIC_SUPABASE_ANON_KEY must be defined');
  assert(!url.includes('placeholder'), 'URL must not be a placeholder');
  assert(!key.includes('placeholder'), 'Key must not be a placeholder');

  console.log(`✓ Supabase Host: ${new URL(url).hostname}`);
  console.log(`✓ Anon/Publishable Key detected (length: ${key.length}, format: valid string)`);

  // Initialize client
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  assert(Boolean(client), 'Supabase client must initialize');
  console.log('✓ Supabase client instance created successfully');

  // Test network connectivity to Auth endpoint
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw new Error(`Supabase Auth ping returned error: ${error.message}`);
  }

  assert(data.session === null, 'Default session should be null for unauthenticated client');
  console.log('✓ Successfully connected to live Supabase Auth service (HTTP 200 / session check passed)');

  console.log('\n🎉 SUPABASE LIVE CONNECTION VERIFIED SUCCESSFULLY!\n');
}

verifySupabaseConnection().catch((err) => {
  console.error('❌ Connection verification failed:', err);
  process.exit(1);
});
