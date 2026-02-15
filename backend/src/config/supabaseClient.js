import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  throw new Error('Missing Supabase configuration');
}

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);
