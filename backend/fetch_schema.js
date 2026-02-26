import { supabase } from './src/config/supabaseClient.js';

async function checkSchema() {
    // Attempt to select everything from order_items just to see the shape if there is a row, else we might not get shape
    const { data: rows, error: rowsError } = await supabase.from('order_items').select('*').limit(1);
    console.log('--- ERROR ---', rowsError);
    console.log('--- ROWS (Shape) ---', rows);

    // We can also try inserting an invalid empty row just to read the error hints which often list columns
    const { data, error } = await supabase.from('order_items').insert({}).select();
    console.log('--- INSERT ERROR ---', error);
}

checkSchema();
