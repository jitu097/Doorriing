import { supabase } from './src/config/supabaseClient.js';

async function debugCartItems() {
  // Get the most recent cart for debugging
  const { data: cart, error: cartError } = await supabase
    .from('carts')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (cartError) {
    console.error('Cart error:', cartError);
    return;
  }

  console.log('Cart ID:', cart.id);
  console.log('Customer ID:', cart.customer_id);

  // Get cart items with full details
  const { data: cartItems, error: itemsError } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cart.id);

  if (itemsError) {
    console.error('Items error:', itemsError);
    return;
  }

  console.log('\n📦 Raw Cart Items:');
  console.log(JSON.stringify(cartItems, null, 2));

  // Get item variants if variant_id exists
  for (const ci of cartItems) {
    if (ci.variant_id) {
      const { data: variant } = await supabase
        .from('item_variants')
        .select('*')
        .eq('id', ci.variant_id)
        .single();
      
      ci.variant_data = variant;
    }
    
    // Get base item
    const { data: item } = await supabase
      .from('items')
      .select('id, name, price')
      .eq('id', ci.item_id)
      .single();
    
    ci.item_data = item;
  }

  console.log('\n📦 Cart Items with Details:');
  cartItems.forEach((ci, idx) => {
    console.log(`\n${idx + 1}. Cart Item:`);
    console.log('   Quantity:', ci.quantity);
    console.log('   Variant ID:', ci.variant_id);
    console.log('   Base Item:', ci.item_data);
    console.log('   Variant:', ci.variant_data);
    
    const effectivePrice = ci.variant_id && ci.variant_data?.price 
      ? ci.variant_data.price 
      : ci.item_data?.price;
    
    console.log('   ✅ Should use price:', effectivePrice);
    console.log('   Subtotal:', effectivePrice * ci.quantity);
  });
}

debugCartItems().then(() => {
  console.log('\n✅ Done');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
