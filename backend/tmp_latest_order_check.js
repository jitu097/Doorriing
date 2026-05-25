import { supabase } from './src/config/supabaseClient.js';

const { data: order } = await supabase
  .from('orders')
  .select('id, order_number, items_total, total_amount, created_at, payment_method')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

console.log('LATEST_ORDER', order);

if (order?.id) {
  const { data: items } = await supabase
    .from('order_items')
    .select('item_id, item_name, quantity, item_price, subtotal, portion, portion_type')
    .eq('order_id', order.id);

  console.log('LATEST_ORDER_ITEMS', JSON.stringify(items, null, 2));
}
