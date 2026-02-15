import { supabase } from '../config/supabaseClient.js';

async function inspectCategoriesTable() {
    console.log('Inspecting categories table schema...\n');

    // Get one row to see what columns actually exist
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        process.exit(1);
    }

    if (data && data.length > 0) {
        console.log('Available columns in categories table:');
        console.log('='.repeat(80));
        Object.keys(data[0]).forEach(col => {
            console.log(`  - ${col}: ${typeof data[0][col]}`);
        });
        console.log();
        console.log('Sample row:');
        console.log(JSON.stringify(data[0], null, 2));
    } else {
        console.log('No categories found');
    }

    process.exit(0);
}

inspectCategoriesTable();
