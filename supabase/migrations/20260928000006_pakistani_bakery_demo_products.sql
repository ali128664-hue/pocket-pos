-- ==============================================================================
-- POCKETPOS: Demo Pakistani Bakery Products & Categories Seed Script
-- ==============================================================================
-- Run this script in your Supabase SQL Editor.
-- It automatically adds popular Pakistani Bakery Categories and Products
-- with real barcodes to ALL existing shops (or a specific shop).
-- ==============================================================================

DO $$
DECLARE
    r_shop RECORD;
    v_cat_bread_id UUID;
    v_cat_rusk_id UUID;
    v_cat_cake_id UUID;
    v_cat_biscuit_id UUID;
    v_cat_savory_id UUID;
    v_cat_sweets_id UUID;
    v_cat_dairy_id UUID;
BEGIN
    -- Loop through all registered shops to populate demo bakery data
    FOR r_shop IN SELECT id, name FROM public.shops LOOP
        RAISE NOTICE 'Seeding Pakistani Bakery items for Shop: % (ID: %)', r_shop.name, r_shop.id;

        -- 1. Insert Categories
        INSERT INTO public.categories (shop_id, name, description)
        VALUES 
            (r_shop.id, 'Breads & Buns', 'Freshly baked sliced breads, burger buns, shawarma & pita breads')
        ON CONFLICT (shop_id, name) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_cat_bread_id;

        INSERT INTO public.categories (shop_id, name, description)
        VALUES 
            (r_shop.id, 'Rusks & Toasts', 'Crispy traditional breakfast rusks, cake rusks, and multigrain toasts')
        ON CONFLICT (shop_id, name) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_cat_rusk_id;

        INSERT INTO public.categories (shop_id, name, description)
        VALUES 
            (r_shop.id, 'Cakes & Pastries', 'Fresh cream cakes, fudge cakes, cup cakes, and Swiss rolls')
        ON CONFLICT (shop_id, name) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_cat_cake_id;

        INSERT INTO public.categories (shop_id, name, description)
        VALUES 
            (r_shop.id, 'Biscuits & Cookies', 'Nan khatai, zeera biscuits, coconut cookies, and bakery khatai')
        ON CONFLICT (shop_id, name) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_cat_biscuit_id;

        INSERT INTO public.categories (shop_id, name, description)
        VALUES 
            (r_shop.id, 'Savories & Snacks', 'Chicken patties, samosas, rolls, cheese straws, and pizza slices')
        ON CONFLICT (shop_id, name) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_cat_savory_id;

        INSERT INTO public.categories (shop_id, name, description)
        VALUES 
            (r_shop.id, 'Traditional Sweets & Nimko', 'Gulab jamun, barfi, mixed nimko, dal moth, and baklava')
        ON CONFLICT (shop_id, name) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_cat_sweets_id;

        INSERT INTO public.categories (shop_id, name, description)
        VALUES 
            (r_shop.id, 'Dairy & Beverages', 'Fresh milk, flavoured milk, butter, and bakery yogurt')
        ON CONFLICT (shop_id, name) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_cat_dairy_id;

        -- 2. Insert Products with Pakistani Barcodes (EAN-13 prefix 896 for Pakistan)

        -- Category: Breads & Buns
        INSERT INTO public.products (
            shop_id, category_id, name, sku, barcode, brand, unit, purchase_price, selling_price, current_stock, minimum_stock
        ) VALUES 
        (r_shop.id, v_cat_bread_id, 'Dawn Plain Bread (Large)', 'DWN-BRD-LRG', '8964000101018', 'Dawn', 'pcs', 170.00, 200.00, 35.000, 10.000),
        (r_shop.id, v_cat_bread_id, 'Dawn Milky Bread (Medium)', 'DWN-BRD-MED', '8964000101025', 'Dawn', 'pcs', 130.00, 150.00, 40.000, 10.000),
        (r_shop.id, v_cat_bread_id, 'Bake Parlor Bran Bread', 'BP-BRD-BRAN', '8964000101032', 'Bake Parlor', 'pcs', 160.00, 190.00, 25.000, 5.000),
        (r_shop.id, v_cat_bread_id, 'Dawn Burger Buns (4 Pcs Pack)', 'DWN-BUN-4PC', '8964000101049', 'Dawn', 'pack', 100.00, 120.00, 50.000, 15.000),
        (r_shop.id, v_cat_bread_id, 'Shawarma Pita Bread (5 Pcs)', 'SHW-PITA-5PC', '8964000101056', 'Bakery Fresh', 'pack', 80.00, 100.00, 30.000, 10.000),

        -- Category: Rusks & Toasts
        (r_shop.id, v_cat_rusk_id, 'Fresh Bakery Cake Rusk (500g)', 'CAKE-RSK-500', '8964000202015', 'House Special', 'pack', 280.00, 350.00, 25.000, 8.000),
        (r_shop.id, v_cat_rusk_id, 'Plain Tea Rusk (400g Box)', 'TEA-RSK-400', '8964000202022', 'Dawn', 'pack', 190.00, 230.00, 30.000, 10.000),
        (r_shop.id, v_cat_rusk_id, 'Sweet Elaichi Rusk (350g)', 'ELC-RSK-350', '8964000202039', 'Bakery Fresh', 'pack', 170.00, 210.00, 20.000, 5.000),
        (r_shop.id, v_cat_rusk_id, 'Diet Multigrain Toast (300g)', 'DIET-TST-300', '8964000202046', 'Bake Parlor', 'pack', 200.00, 250.00, 15.000, 5.000),

        -- Category: Cakes & Pastries
        (r_shop.id, v_cat_cake_id, 'Chocolate Fudge Pastry', 'PAST-CHOC-FDG', '8964000303012', 'Bakery Fresh', 'pcs', 120.00, 160.00, 20.000, 5.000),
        (r_shop.id, v_cat_cake_id, 'Black Forest Pastry', 'PAST-BLK-FOR', '8964000303029', 'Bakery Fresh', 'pcs', 110.00, 150.00, 18.000, 5.000),
        (r_shop.id, v_cat_cake_id, 'Fresh Fruit Cake (1 Pound)', 'CAKE-FRUIT-1LB', '8964000303036', 'House Special', 'pcs', 450.00, 600.00, 10.000, 3.000),
        (r_shop.id, v_cat_cake_id, 'Pineapple Cream Cake (2 Pound)', 'CAKE-PIN-2LB', '8964000303043', 'House Special', 'pcs', 900.00, 1200.00, 6.000, 2.000),
        (r_shop.id, v_cat_cake_id, 'Vanilla Cupcake (Box of 4)', 'CUPCAKE-VAN-4', '8964000303050', 'Bakery Fresh', 'box', 180.00, 240.00, 15.000, 4.000),

        -- Category: Biscuits & Cookies
        (r_shop.id, v_cat_biscuit_id, 'Special Badam Nan Khatai (500g)', 'KHT-BADAM-500', '8964000404019', 'Khalifa Special', 'box', 380.00, 480.00, 25.000, 6.000),
        (r_shop.id, v_cat_biscuit_id, 'Zeera Salty Biscuits (Half KG)', 'BSC-ZEERA-500', '8964000404026', 'Bakery Fresh', 'pack', 250.00, 320.00, 30.000, 10.000),
        (r_shop.id, v_cat_biscuit_id, 'Coconut Macaroons (400g)', 'BSC-COCO-400', '8964000404033', 'Bakery Fresh', 'pack', 260.00, 340.00, 20.000, 5.000),
        (r_shop.id, v_cat_biscuit_id, 'Chocolate Chip Cookies (300g)', 'CK-CHOC-300', '8964000404040', 'House Special', 'pack', 280.00, 360.00, 15.000, 5.000),

        -- Category: Savories & Snacks
        (r_shop.id, v_cat_savory_id, 'Crispy Chicken Patties', 'PAT-CHK-CRSP', '8964000505016', 'Bakery Fresh', 'pcs', 70.00, 95.00, 45.000, 10.000),
        (r_shop.id, v_cat_savory_id, 'Vegetable Potato Samosa', 'SAM-VEG-LRG', '8964000505023', 'Bakery Fresh', 'pcs', 35.00, 50.00, 50.000, 15.000),
        (r_shop.id, v_cat_savory_id, 'Chicken Spring Roll', 'ROL-CHK-SPR', '8964000505030', 'Bakery Fresh', 'pcs', 60.00, 80.00, 35.000, 10.000),
        (r_shop.id, v_cat_savory_id, 'Mini Chicken Pizza', 'PIZ-CHK-MINI', '8964000505047', 'Bakery Fresh', 'pcs', 120.00, 160.00, 20.000, 5.000),
        (r_shop.id, v_cat_savory_id, 'Bakery Cheese Straws (250g)', 'STRW-CHEESE-250', '8964000505054', 'House Special', 'pack', 160.00, 220.00, 20.000, 5.000),

        -- Category: Traditional Sweets & Nimko
        (r_shop.id, v_cat_sweets_id, 'Gulab Jamun (1 KG Box)', 'SWT-GLB-1KG', '8964000606013', 'House Special', 'kg', 650.00, 850.00, 12.000, 3.000),
        (r_shop.id, v_cat_sweets_id, 'Mix Pakistani Nimko (400g Pack)', 'NMK-MIX-400', '8964000606020', 'Bawany Nimko', 'pack', 190.00, 250.00, 30.000, 10.000),
        (r_shop.id, v_cat_sweets_id, 'Spicy Dal Moth (350g)', 'NMK-DALM-350', '8964000606037', 'Bawany Nimko', 'pack', 180.00, 240.00, 25.000, 8.000),

        -- Category: Dairy & Beverages
        (r_shop.id, v_cat_dairy_id, 'MilkPak Full Cream Milk (1 Litre)', 'NEST-MLK-1L', '8964000707010', 'Nestle', 'pack', 290.00, 320.00, 40.000, 15.000),
        (r_shop.id, v_cat_dairy_id, 'Nurpur Salted Butter (200g)', 'NUR-BTR-200', '8964000707027', 'Nurpur', 'pcs', 280.00, 330.00, 20.000, 5.000),
        (r_shop.id, v_cat_dairy_id, 'Pakola Ice Cream Soda Can (250ml)', 'PAK-CAN-250', '8964000707034', 'Pakola', 'can', 80.00, 100.00, 48.000, 12.000)
        ON CONFLICT (shop_id, barcode) DO UPDATE SET
            selling_price = EXCLUDED.selling_price,
            current_stock = EXCLUDED.current_stock,
            updated_at = NOW();

    END LOOP;
END $$;
