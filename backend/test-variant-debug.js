// Test script to debug variant issue
import { supabase } from './src/config/supabaseClient.js';

async function testVariantInsert() {
  console.log('=== VARIANT DEBUG TEST ===\n');

  // Step 1: Get a sample restaurant item with variants
  console.log('1. Fetching a restaurant item with variants...');
  const { data: items, error: itemError } = await supabase
    .from('items')
    .select('id, name, price, half_portion_price, full_price, has_variants, shop_id, shops!inner(business_type)')
    .eq('shops.business_type', 'restaurant')
    .not('half_portion_price', 'is', null)
    .limit(1);

  if (itemError) {
    console.error('❌ Failed to fetch item:', itemError);
    return;
  }

  if (!items || items.length === 0) {
    console.log('⚠️  No restaurant items with variants found');
    return;
  }

  const testItem = items[0];
  console.log('✅ Found test item:', {
    id: testItem.id,
    name: testItem.name,
    price: testItem.price,
    half_portion_price: testItem.half_portion_price,
    full_price: testItem.full_price,
    has_variants: testItem.has_variants
  });

  // Step 2: Get or create a test cart
  console.log('\n2. Getting/creating test cart...');
  
  // Get a real customer from the database
  const { data: customers } = await supabase
    .from('customers')
    .select('id')
    .limit(1)
    .single();
  
  if (!customers) {
    console.log('⚠️  No customers found in database');
    return;
  }
  
  const testCustomerId = customers.id;
  console.log('Using customer:', testCustomerId);
  
  let { data: cart, error: cartError } = await supabase
    .from('carts')
    .select('id')
    .eq('shop_id', testItem.shop_id)
    .eq('customer_id', testCustomerId)
    .limit(1)
    .maybeSingle();

  if (!cart) {
    console.log('Creating new cart...');
    // Delete any existing carts for this customer first
    await supabase.from('carts').delete().eq('customer_id', testCustomerId);
    
    const { data: newCart, error: createError } = await supabase
      .from('carts')
      .insert({
        customer_id: testCustomerId,
        shop_id: testItem.shop_id
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Failed to create cart:', createError);
      return;
    }
    cart = newCart;
  }

  console.log('✅ Using cart:', cart.id);

  // Step 3: Test inserting Half variant
  console.log('\n3. Testing Half variant insert...');
  const halfPayload = {
    cart_id: cart.id,
    item_id: testItem.id,
    quantity: 1,
    variant: 'Half'
  };
  console.log('Payload:', JSON.stringify(halfPayload, null, 2));

  const { data: halfInsert, error: halfError } = await supabase
    .from('cart_items')
    .insert(halfPayload)
    .select();

  if (halfError) {
    console.error('❌ Half variant insert failed:', {
      message: halfError.message,
      code: halfError.code,
      details: halfError.details,
      hint: halfError.hint
    });
  } else {
    console.log('✅ Half variant inserted successfully:', halfInsert);
  }

  // Step 4: Test inserting Full variant
  console.log('\n4. Testing Full variant insert...');
  const fullPayload = {
    cart_id: cart.id,
    item_id: testItem.id,
    quantity: 1,
    variant: 'Full'
  };
  console.log('Payload:', JSON.stringify(fullPayload, null, 2));

  const { data: fullInsert, error: fullError } = await supabase
    .from('cart_items')
    .insert(fullPayload)
    .select();

  if (fullError) {
    console.error('❌ Full variant insert failed:', {
      message: fullError.message,
      code: fullError.code,
      details: fullError.details,
      hint: fullError.hint
    });
  } else {
    console.log('✅ Full variant inserted successfully:', fullInsert);
  }

  // Step 5: Check what was actually inserted
  console.log('\n5. Verifying inserts in database...');
  const { data: cartItems, error: fetchError } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cart.id);

  if (fetchError) {
    console.error('❌ Failed to fetch cart items:', fetchError);
  } else {
    console.log('✅ Cart items in database:', JSON.stringify(cartItems, null, 2));
  }

  // Cleanup
  console.log('\n6. Cleaning up test data...');
  await supabase.from('cart_items').delete().eq('cart_id', cart.id);
  console.log('✅ Cleanup complete');

  console.log('\n=== TEST COMPLETE ===');
}

testVariantInsert().catch(console.error);
