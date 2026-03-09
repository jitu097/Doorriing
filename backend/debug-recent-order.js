import { supabase } from './src/config/supabaseClient.js';

async function debugRecentOrder() {
  // Get the most recent order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (orderError) {
    console.error('Order error:', orderError);
    return;
  }

  console.log('📝 Most Recent Order:');
  console.log('Order ID:', order.id);
  console.log('Order Number:', order.order_number);
  console.log('Items Total:', order.items_total);
  console.log('Delivery Charge:', order.delivery_charge);
  console.log('Handling Charge:', order.handling_charge);
  console.log('Total Amount:', order.total_amount);
  console.log('Created:', order.created_at);

  // Get order items
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id);

  if (itemsError) {
    console.error('Items error:', itemsError);
    return;
  }

  console.log('\n📦 Order Items:');
  let calculatedTotal = 0;
  orderItems.forEach((item, idx) => {
    console.log(`\n${idx + 1}. ${item.item_name}`);
    console.log('   Item ID:', item.item_id);
    console.log('   Item Price:', item.item_price);
    console.log('   Quantity:', item.quantity);
    console.log('   Subtotal:', item.subtotal);
    calculatedTotal += item.subtotal;
  });

  console.log('\n💰 Calculations:');
  console.log('Sum of Subtotals:', calculatedTotal);
  console.log('Stored Items Total:', order.items_total);
  console.log('Match?', calculatedTotal === order.items_total ? '✅ YES' : '❌ NO');
  console.log('\nExpected Total:', calculatedTotal + order.delivery_charge + order.handling_charge);
  console.log('Stored Total:', order.total_amount);
  console.log('Match?', (calculatedTotal + order.delivery_charge + order.handling_charge) === order.total_amount ? '✅ YES' : '❌ NO');
}

debugRecentOrder().then(() => {
  console.log('\n✅ Done');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
