// Test the fixed booking API
import { supabase } from './src/config/supabaseClient.js';

async function testFixedBooking() {
  console.log('Testing FIXED booking creation...\n');
  
  // Get a real shop
  const { data: shops } = await supabase.from('shops').select('id, name').limit(1);
  
  if (!shops || shops.length === 0) {
    console.log('No shops found');
    return;
  }
  
  console.log('Using shop:', shops[0].name, '(', shops[0].id, ')');
  
  // Test the exact data structure that will be sent from frontend
  const bookingData = {
    shop_id: shops[0].id,
    customer_name: 'John Doe',
    customer_phone: '9876543210',
    number_of_guests: 4,
    booking_date: '2026-03-15',
    booking_time: '19:00',
    status: 'Pending'
  };
  
  console.log('\nInserting booking with data:', JSON.stringify(bookingData, null, 2));
  
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert([bookingData])
    .select()
    .single();
  
  if (error) {
    console.error('\n❌ FAILED:', error);
    return;
  }
  
  console.log('\n✅ SUCCESS! Booking created:');
  console.log(JSON.stringify(booking, null, 2));
  
  // Clean up
  await supabase.from('bookings').delete().eq('id', booking.id);
  console.log('\n✅ Test booking cleaned up');
}

testFixedBooking().catch(console.error);
