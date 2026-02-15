import { supabase } from '../config/supabaseClient.js';

async function testMinimalQuery() {
    const shopId = '7f4f06b8-1f88-4d91-b3b9-5c74d22c563e';

    console.log(`Testing different column combinations for shop: ${shopId}\n`);

    // Test 1: Just id and name
    console.log('Test 1: id, name');
    let { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('shop_id', shopId);
    console.log('Result:', error ? error.message : `✓ Found ${data?.length} categories`);

    // Test 2: Add description
    console.log('\nTest 2: id, name, description');
    ({ data, error } = await supabase
        .from('categories')
        .select('id, name, description')
        .eq('shop_id', shopId));
    console.log('Result:', error ? `✗ ${error.message}` : `✓ Found ${data?.length} categories`);

    // Test 3: Add display_order
    console.log('\nTest 3: id, name, display_order');
    ({ data, error } = await supabase
        .from('categories')
        .select('id, name, display_order')
        .eq('shop_id', shopId));
    console.log('Result:', error ? `✗ ${error.message}` : `✓ Found ${data?.length} categories`);

    // Test 4: All individual columns
    console.log('\nTest 4: id');
    ({ data, error } = await supabase.from('categories').select('id').eq('shop_id', shopId));
    console.log('  id:', error ? '✗' : '✓');

    console.log('Test shop_id:');
    ({ data, error } = await supabase.from('categories').select('shop_id').eq('shop_id', shopId));
    console.log('  shop_id:', error ? '✗' : '✓');

    console.log('Test is_active:');
    ({ data, error } = await supabase.from('categories').select('is_active').eq('shop_id', shopId));
    console.log('  is_active:', error ? '✗' : '✓');

    console.log('Test created_at:');
    ({ data, error } = await supabase.from('categories').select('created_at').eq('shop_id', shopId));
    console.log('  created_at:', error ? '✗' : '✓');

    process.exit(0);
}

testMinimalQuery();
