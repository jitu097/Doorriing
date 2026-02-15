import { supabase } from '../config/supabaseClient.js';

async function checkCategories() {
    console.log('Fetching all categories...\n');

    const { data: categories, error } = await supabase
        .from('categories')
        .select('id, shop_id, name, is_active, display_order');

    if (error) {
        console.error('Error:', error);
        process.exit(1);
    }

    console.log(`Total categories in database: ${categories.length}\n`);

    // Group by shop
    const byShop = {};
    categories.forEach(cat => {
        if (!byShop[cat.shop_id]) {
            byShop[cat.shop_id] = [];
        }
        byShop[cat.shop_id].push(cat);
    });

    console.log('Categories by Shop:');
    console.log('='.repeat(60));

    for (const [shopId, cats] of Object.entries(byShop)) {
        console.log(`\nShop ID: ${shopId}`);
        console.log(`  Total categories: ${cats.length}`);
        console.log(`  Active: ${cats.filter(c => c.is_active).length}`);
        console.log(`  Categories:`);
        cats.forEach(c => {
            console.log(`    - ${c.name} (Active: ${c.is_active}, Order: ${c.display_order || 'N/A'})`);
        });
    }

    process.exit(0);
}

checkCategories();
