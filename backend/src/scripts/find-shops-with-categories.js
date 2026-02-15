import { supabase } from '../config/supabaseClient.js';

async function findShopsWithCategories() {
    // Get all shops
    const { data: shops } = await supabase
        .from('shops')
        .select('id, name, business_type')
        .eq('business_type', 'grocery')
        .limit(10);

    console.log('Checking grocery shops for categories...\n');

    for (const shop of shops) {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('id, name, is_active')
            .eq('shop_id', shop.id)
            .eq('is_active', true);

        if (categories && categories.length > 0) {
            console.log(`✅ Shop: ${shop.name} (ID: ${shop.id})`);
            console.log(`   Categories (${categories.length}):`);
            categories.forEach(c => console.log(`     - ${c.name}`));
            console.log();
        } else {
            console.log(`❌ Shop: ${shop.name} (ID: ${shop.id}) - No active categories`);
        }
    }

    process.exit(0);
}

findShopsWithCategories();
