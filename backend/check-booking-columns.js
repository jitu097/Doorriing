// Check actual bookings table columns
import { supabase } from './src/config/supabaseClient.js';

async function checkColumns() {
  // Insert a minimal booking to see which columns are actually available
  const { data: shops } = await supabase.from('shops').select('id').limit(1);
  
  if (!shops || shops.length === 0) {
    console.log('No shops found');
    return;
  }
  
  // Try different column combinations
  console.log('Testing column combinations...\n');
  
  // Test 1: Minimal insert
  const tests = [
    {
      name: 'Test with user_id instead of customer_id',
      data: {
        shop_id: shops[0].id,
        user_id: null,
        customer_name: 'Test',
        customer_phone: '1234567890',
        number_of_guests: 2,
        booking_date: '2026-03-01',
        booking_time: '19:00',
        status: 'pending'
      }
    },
    {
      name: 'Test without customer/user id',
      data: {
        shop_id: shops[0].id,
        customer_name: 'Test',
        customer_phone: '1234567890',
        number_of_guests: 2,
        booking_date: '2026-03-01',
        booking_time: '19:00',
        status: 'pending'
      }
    }
  ];
  
  for (const test of tests) {
    console.log(`\n${test.name}...`);
    const { data, error } = await supabase
      .from('bookings')
      .insert([test.data])
      .select();
    
    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      console.log('✅ Success! Columns accepted:', Object.keys(data[0]));
      // Clean up
      if (data[0]) {
        await supabase.from('bookings').delete().eq('id', data[0].id);
      }
      break;
    }
  }
  
  // Also try to get the table structure
  console.log('\n\nGetting existing records structure...');
  const { data: existing } = await supabase.from('bookings').select('*').limit(1);
  if (existing && existing.length > 0) {
    console.log('Existing columns:', Object.keys(existing[0]));
  } else {
    console.log('No existing records to examine');
  }
}

checkColumns().catch(console.error);
