import { supabase } from '../config/supabaseClient.js';

async function testCategoryQuery() {
    const shopId = '7f4f06b8-1f88-4d91-b3b9-5c74d22c563e';

    console.log('Testing category query for shop:', shopId);
    console.log('='.repeat(80));
    console.log();

    // Test 1: Direct Supabase query (what the service SHOULD do)
    console.log('Test 1: Direct Supabase Query');
    console.log('-'.repeat(80));
    const { data: directData, error: directError } = await supabase
        .from('categories')
        .select('id, shop_id, name, description, display_order, is_active, created_at')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

    console.log('Direct query result:');
    console.log('  Error:', directError);
    console.log('  Data:', JSON.stringify(directData, null, 2));
    console.log();

    // Test 2: Try without is_active filter
    console.log('Test 2: Query WITHOUT is_active filter');
    console.log('-'.repeat(80));
    const { data: allData, error: allError } = await supabase
        .from('categories')
        .select('id, shop_id, name, is_active')
        .eq('shop_id', shopId);

    console.log('Query without filter result:');
    console.log('  Error:', allError);
    console.log('  Data:', JSON.stringify(allData, null, 2));
    console.log();

    process.exit(0);
}

testCategoryQuery();
