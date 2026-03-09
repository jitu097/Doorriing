import { supabase } from './src/config/supabaseClient.js';

async function checkOrderItems() {
  // Find orders with items_total = 3
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, items_total, delivery_charge, total_amount')
    .eq('items_total', 3);

  if (ordersError) {
    console.error('Error fetching orders:', ordersError);
    return;
  }

  console.log(`Found ${orders.length} orders with items_total = 3:`);
  
  for (const order of orders) {
    console.log(`\n--- Order ID: ${order.id} ---`);
    console.log(`Items Total: ${order.items_total}`);
    console.log(`Delivery: ${order.delivery_charge}`);
    console.log(`Total Amount: ${order.total_amount}`);
    
    // Get order items for this order
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('item_name, item_price, quantity, subtotal')
      .eq('order_id', order.id);
    
    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      continue;
    }
    
    console.log('Order Items:');
    let calculatedTotal = 0;
    items.forEach(item => {
      console.log(`  - ${item.item_name}: ₹${item.item_price} × ${item.quantity} = ₹${item.subtotal}`);
      calculatedTotal += item.subtotal;
    });
    console.log(`Calculated Total: ₹${calculatedTotal}`);
    console.log(`Stored Total: ₹${order.items_total}`);
    
    if (calculatedTotal !== order.items_total) {
      console.log('⚠️ MISMATCH DETECTED!');
    }
  }
}

checkOrderItems().then(() => {
  console.log('\n✅ Check complete');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
