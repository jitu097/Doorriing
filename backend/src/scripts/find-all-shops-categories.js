import { supabase } from '../config/supabaseClient.js';

async function findAllShopsWithCategories() {
    // Get ALL shops (grocery AND restaurant)
    const { data: allShops } = await supabase
        .from('shops')
        .select('id, name, business_type')
        .limit(20);

    console.log('Checking ALL shops for categories...\n');

    for (const shop of allShops) {
        const { data: categories } = await supabase
            .from('categories')
            .select('id, name, is_active')
            .eq('shop_id', shop.id)
            .eq('is_active', true);

        if (categories && categories.length > 0) {
            console.log(`✅ [${shop.business_type.toUpperCase()}] ${shop.name}`);
            console.log(`   Shop ID: ${shop.id}`);
            console.log(`   Categories (${categories.length}):`);
            categories.forEach(c => console.log(`     - ${c.name}`));
            console.log();
        }
    }

    process.exit(0);
}

findAllShopsWithCategories();
