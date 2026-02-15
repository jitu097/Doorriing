import { supabase } from '../config/supabaseClient.js';

async function checkRecentCategories() {
    console.log('Checking for recently added categories...\n');

    // Get all categories, sorted by creation time
    const { data: allCategories } = await supabase
        .from('categories')
        .select('id, shop_id, name, is_active, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

    console.log(`Total categories found: ${allCategories?.length || 0}\n`);

    if (allCategories && allCategories.length > 0) {
        console.log('Recent categories:');
        console.log('='.repeat(80));

        for (const cat of allCategories) {
            // Get shop info
            const { data: shop } = await supabase
                .from('shops')
                .select('name, business_type')
                .eq('id', cat.shop_id)
                .single();

            console.log(`Category: ${cat.name}`);
            console.log(`  Shop: ${shop?.name || 'Unknown'} (${shop?.business_type || 'N/A'})`);
            console.log(`  Shop ID: ${cat.shop_id}`);
            console.log(`  Active: ${cat.is_active}`);
            console.log(`  Created: ${cat.created_at}`);
            console.log();
        }
    }

    process.exit(0);
}

checkRecentCategories();
