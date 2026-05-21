import { supabase } from '../config/supabaseClient.js';

async function check() {
  console.log('Checking views in database...');
  
  const views = ['item_reviews_summary', 'shop_reviews_summary', 'shop_inventory_summary'];
  
  for (const view of views) {
    const { data, error } = await supabase.from(view).select('*').limit(1);
    if (error) {
      console.log(`❌ View "${view}" check failed: ${error.message} (${error.code})`);
    } else {
      console.log(`✅ View "${view}" exists! Data sample:`, data);
    }
  }
}

check();
