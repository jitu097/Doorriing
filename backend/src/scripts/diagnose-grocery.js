import { supabase } from '../config/supabaseClient.js';

async function diagnoseGroceryCategories() {
    console.log('GROCERY CATEGORY DIAGNOSIS');
    console.log('='.repeat(80));
    console.log();

    // Step 1: Get ALL grocery shops
    const { data: groceryShops } = await supabase
        .from('shops')
        .select('id, name')
        .eq('business_type', 'grocery');

    console.log(`Found ${groceryShops?.length || 0} grocery shops\n`);

    if (!groceryShops || groceryShops.length === 0) {
        console.log('❌ No grocery shops found in database!');
        process.exit(0);
    }

    // Step 2: Check categories for EACH grocery shop
    for (const shop of groceryShops) {
        console.log(`\n🏪 Shop: ${shop.name}`);
        console.log(`   ID: ${shop.id}`);

        // Get ALL categories (regardless of is_active)
        const { data: allCats } = await supabase
            .from('categories')
            .select('id, name, is_active')
            .eq('shop_id', shop.id);

        // Get ACTIVE categories only
        const { data: activeCats } = await supabase
            .from('categories')
            .select('id, name')
            .eq('shop_id', shop.id)
            .eq('is_active', true);

        console.log(`   Total categories: ${allCats?.length || 0}`);
        console.log(`   Active categories: ${activeCats?.length || 0}`);

        if (allCats && allCats.length > 0) {
            console.log(`   Categories:`);
            allCats.forEach(c => {
                console.log(`      - ${c.name} (${c.is_active ? 'ACTIVE ✓' : 'INACTIVE ✗'})`);
            });
        }
    }

    process.exit(0);
}

diagnoseGroceryCategories();
