// Final test - find correct status values
import { supabase } from './src/config/supabaseClient.js';

async function finalTest() {
  const { data: shops } = await supabase.from('shops').select('id').limit(1);
  
  if (!shops || shops.length === 0) {
    console.log('No shops found');
    return;
  }
  
  const statuses = ['Pending', 'Confirmed', 'Cancelled', 'Completed', 'pending', 'confirmed'];
  
  for (const status of statuses) {
    console.log(`\nTrying status: "${status}"...`);
    const { data, error } = await supabase
      .from('bookings')
      .insert([{
        shop_id: shops[0].id,
        customer_name: 'Test Customer',
        customer_phone: '1234567890',
        number_of_guests: 2,
        booking_date: '2026-03-01',
        booking_time: '19:00',
        status: status
      }])
      .select();
    
    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      console.log('✅ SUCCESS! Status value works:', status);
      console.log('Inserted record columns:', Object.keys(data[0]));
      console.log('Full record:', JSON.stringify(data[0], null, 2));
      
      // Clean up
      await supabase.from('bookings').delete().eq('id', data[0].id);
      console.log('✅ Test record cleaned up');
      break;
    }
  }
}

finalTest().catch(console.error);
