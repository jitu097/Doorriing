// Quick test to check bookings table and API
import { supabase } from './src/config/supabaseClient.js';

async function testBooking() {
  console.log('Testing bookings table...\n');
  
  // Test 1: Check if table exists and its structure
  console.log('1. Checking bookings table structure...');
  const { data: tableData, error: tableError } = await supabase
    .from('bookings')
    .select('*')
    .limit(1);
  
  if (tableError) {
    console.error('❌ Error accessing bookings table:', tableError);
    console.error('Full error:', JSON.stringify(tableError, null, 2));
  } else {
    console.log('✅ Bookings table exists');
    console.log('Sample data:', tableData);
  }
  
  // Test 2: Check shops table
  console.log('\n2. Checking shops table...');
  const { data: shopData, error: shopError } = await supabase
    .from('shops')
    .select('id, name, seller_id')
    .limit(1);
  
  if (shopError) {
    console.error('❌ Error accessing shops table:', shopError);
  } else {
    console.log('✅ Shops table accessible');
    console.log('Sample shop:', shopData[0]);
  }
  
  // Test 3: Try to insert a test booking (if shop exists)
  if (shopData && shopData.length > 0) {
    console.log('\n3. Testing booking insert...');
    const testBooking = {
      shop_id: shopData[0].id,
      customer_id: null,
      customer_name: 'Test Customer',
      customer_phone: '1234567890',
      number_of_guests: 4,
      booking_date: '2026-03-01',
      booking_time: '19:00',
      status: 'pending'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('bookings')
      .insert([testBooking])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error inserting booking:', insertError);
      console.error('Full error:', JSON.stringify(insertError, null, 2));
    } else {
      console.log('✅ Booking inserted successfully');
      console.log('Inserted booking:', insertData);
      
      // Clean up - delete test booking
      await supabase.from('bookings').delete().eq('id', insertData.id);
      console.log('✅ Test booking cleaned up');
    }
  }
}

testBooking().catch(console.error);
