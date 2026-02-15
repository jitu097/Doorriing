import { supabase } from '../config/supabaseClient.js';

async function debugActiveFilter() {
    const shopId = '7f4f06b8-1f88-4d91-b3b9-5c74d22c563e';

    console.log(`Debugging is_active filter for shop: ${shopId}\n`);

    // Query WITHOUT any filters
    console.log('Query 1: No filters at all');
    let { data, error } = await supabase
        .from('categories')
        .select('id, name, shop_id, is_active');
    console.log(`Total categories in database: ${data?.length || 0}`);
    console.log('Sample:', data ? data.slice(0, 3) : []);

    // Query with ONLY shop_id filter
    console.log(`\nQuery 2: Only shop_id = ${shopId}`);
    ({ data, error } = await supabase
        .from('categories')
        .select('id, name, shop_id, is_active')
        .eq('shop_id', shopId));
    console.log(`Result: ${data?.length || 0} categories`);
    console.log('Data:', JSON.stringify(data, null, 2));

    // Query with shop_id AND is_active = true
    console.log(`\nQuery 3: shop_id AND is_active = true`);
    ({ data, error } = await supabase
        .from('categories')
        .select('id, name, shop_id, is_active')
        .eq('shop_id', shopId)
        .eq('is_active', true));
    console.log(`Result: ${data?.length || 0} categories`);
    console.log('Error:', error);
    console.log('Data:', JSON.stringify(data, null, 2));

    process.exit(0);
}

debugActiveFilter();
