import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

import fs from 'fs';

async function testTableExists() {
    console.log('Checking insert...');

    const { data: cData } = await supabase.from('customers').select('id').limit(1);
    if (!cData || cData.length === 0) return console.log('No customers');

    const customerId = cData[0].id;
    const payload = {
        customer_id: customerId,
        full_name: 'Test Setup',
        phone: '1234567890',
        address_line_1: 'B 404',
        address_line_2: 'Locality Test',
        city: 'City',
        state: 'State',
        pincode: '12345',
        landmark: 'Near Tree',
        address_type: 'Home',
        is_default: true
    };

    const { data, error } = await supabase.from('customer_addresses').insert(payload).select();
    if (error) {
        fs.writeFileSync('error.json', JSON.stringify(error, null, 2));
        console.log('Error written to error.json');
    } else {
        console.log('Success!', data);
    }
}
testTableExists();
