// Test booking via HTTP API endpoint
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testBookingAPI() {
  const bookingData = {
    shopId: 'b0ee0f05-5184-41a0-b1d3-c907d90a3f68', // Using the shop ID we found earlier
    customerName: 'Test Customer',
    customerPhone: '1234567890',
    numberOfGuests: 4,
    bookingDate: '2026-03-15',
    bookingTime: '19:00'
  };
  
  console.log('Testing POST /api/bookings');
  console.log('Request body:', JSON.stringify(bookingData, null, 2));
  
  try {
    const response = await fetch('http://localhost:5000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData)
    });
    
    const responseText = await response.text();
    console.log('\nResponse status:', response.status);
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('\n✅ SUCCESS! Booking API is working!');
    } else {
      console.log('\n❌ FAILED with status:', response.status);
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

testBookingAPI();
