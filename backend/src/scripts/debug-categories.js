import { supabase } from '../config/supabaseClient.js';

/**
 * Debug script to investigate category loading issues
 * Usage: node src/scripts/debug-categories.js --shopId=<shop-id>
 */

async function debugCategories() {
    const args = process.argv.slice(2);
    const shopIdArg = args.find(arg => arg.startsWith('--shopId='));
    const shopId = shopIdArg ? shopIdArg.split('=')[1] : null;

    console.log('='.repeat(60));
    console.log('CATEGORY DEBUG SCRIPT');
    console.log('='.repeat(60));
    console.log();

    try {
        // Test 1: Check total categories in database
        console.log('📊 Test 1: Total Categories in Database');
        console.log('-'.repeat(60));
        const { data: allCategories, error: allError } = await supabase
            .from('categories')
            .select('id, shop_id, name, is_active, created_at');

        if (allError) {
            console.error('❌ Error fetching all categories:', allError);
        } else {
            console.log(`✅ Total categories: ${allCategories.length}`);
            console.log(`   Active: ${allCategories.filter(c => c.is_active).length}`);
            console.log(`   Inactive: ${allCategories.filter(c => !c.is_active).length}`);
        }
        console.log();

        // Test 2: Check categories for specific shop (if provided)
        if (shopId) {
            console.log(`📊 Test 2: Categories for Shop: ${shopId}`);
            console.log('-'.repeat(60));

            // Without is_active filter
            const { data: shopCategoriesAll, error: shopErrorAll } = await supabase
                .from('categories')
                .select('id, name, is_active, display_order, created_at')
                .eq('shop_id', shopId)
                .order('display_order', { ascending: true });

            if (shopErrorAll) {
                console.error('❌ Error fetching shop categories:', shopErrorAll);
            } else {
                console.log(`✅ Total categories for shop: ${shopCategoriesAll.length}`);
                if (shopCategoriesAll.length > 0) {
                    console.log('   Categories:');
                    shopCategoriesAll.forEach((cat, idx) => {
                        console.log(`      ${idx + 1}. ${cat.name} (Active: ${cat.is_active}, Order: ${cat.display_order || 'N/A'})`);
                    });
                }
            }
            console.log();

            // With is_active filter (same as backend)
            console.log('📊 Test 3: Categories with is_active=true filter');
            console.log('-'.repeat(60));
            const { data: shopCategoriesActive, error: shopErrorActive } = await supabase
                .from('categories')
                .select('id, name, is_active, display_order, created_at')
                .eq('shop_id', shopId)
                .eq('is_active', true)
                .order('display_order', { ascending: true });

            if (shopErrorActive) {
                console.error('❌ Error fetching active categories:', shopErrorActive);
            } else {
                console.log(`✅ Active categories for shop: ${shopCategoriesActive.length}`);
                if (shopCategoriesActive.length > 0) {
                    console.log('   Categories:');
                    shopCategoriesActive.forEach((cat, idx) => {
                        console.log(`      ${idx + 1}. ${cat.name} (Order: ${cat.display_order || 'N/A'})`);
                    });
                } else {
                    console.log('   ⚠️  No active categories found!');
                    console.log('   This explains why the user app shows "No categories available"');
                    if (shopCategoriesAll && shopCategoriesAll.length > 0) {
                        console.log('   💡 Solution: Activate categories in the seller dashboard');
                    }
                }
            }
            console.log();

            // Test 4: Check shop details
            console.log('📊 Test 4: Shop Details');
            console.log('-'.repeat(60));
            const { data: shopData, error: shopError } = await supabase
                .from('shops')
                .select('id, name, business_type, is_active, created_at')
                .eq('id', shopId)
                .single();

            if (shopError) {
                console.error('❌ Error fetching shop:', shopError);
            } else {
                console.log(`✅ Shop: ${shopData.name}`);
                console.log(`   Business Type: ${shopData.business_type}`);
                console.log(`   Active: ${shopData.is_active}`);
            }
        } else {
            console.log('ℹ️  No shop ID provided. Use --shopId=<id> to test specific shop.');
        }

        console.log();
        console.log('='.repeat(60));
        console.log('DEBUG COMPLETE');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }

    process.exit(0);
}

debugCategories();
