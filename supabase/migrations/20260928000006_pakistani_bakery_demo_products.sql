-- ==============================================================================
-- POCKETPOS: Mega Pakistani Bakery & Superstore Demo Catalog (70+ Products)
-- Brands: Dawn, Bake Parlor, Tehzeeb, Rahat, Gourmet, Shezan, English Cake,
--         Khalifa, Mitchells, National, Shan, Olpers, MilkPak, Rooh Afza, Tapal
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
    v_cat_nimko_id UUID;
    v_cat_dairy_id UUID;
    v_cat_beverages_id UUID;
    v_cat_spreads_id UUID;
BEGIN
    FOR r_shop IN SELECT id, name FROM public.shops LOOP
        RAISE NOTICE 'Populating Mega Pakistani Catalog for Shop: % (ID: %)', r_shop.name, r_shop.id;

        -- 1. Insert / Update Categories
        INSERT INTO public.categories (shop_id, name, description)
        VALUES (r_shop.id, 'Breads & Buns', 'White bread, brown bread, milky, bran, burger buns & pita')
        ON CONFLICT (shop_id, name) DO UPDATE SET updated_at = NOW() RETURNING id INTO v_cat_bread_id;

        INSERT INTO public.categories (shop_id, name, description)
        VALUES (r_shop.id, 'Rusks & Toasts', 'Cake rusks, tea rusks, elaichi & diet toasts')
        ON CONFLICT (shop_id, name) DO UPDATE SET updated_at = NOW() RETURNING id INTO v_cat_rusk_id;

        INSERT INTO public.categories (shop_id, name, description)
        VALUES (r_shop.id, 'Cakes & Pastries', 'Cream cakes, pound cakes, pastries, cupcakes & donuts')
        ON CONFLICT (shop_id, name) DO UPDATE SET updated_at = NOW() RETURNING id INTO v_cat_cake_id;

        INSERT INTO public.categories (shop_id, name, description)
        VALUES (r_shop.id, 'Biscuits & Cookies', 'Nan khatai, zeera, coconut cookies, cream & digestive biscuits')
        ON CONFLICT (shop_id, name) DO UPDATE SET updated_at = NOW() RETURNING id INTO v_cat_biscuit_id;

        INSERT INTO public.categories (shop_id, name, description)
        VALUES (r_shop.id, 'Fresh Savories & Fast Food', 'Patties, samosas, rolls, pizzas, shawarma, sandwiches')
        ON CONFLICT (shop_id, name) DO UPDATE SET updated_at = NOW() RETURNING id INTO v_cat_savory_id;

        INSERT INTO public.categories (shop_id, name, description)
        VALUES (r_shop.id, 'Traditional Sweets (Mithai)', 'Gulab jamun, barfi, rasgulla, cham cham, kalakand')
        ON CONFLICT (shop_id, name) DO UPDATE SET updated_at = NOW() RETURNING id INTO v_cat_sweets_id;

        INSERT INTO public.categories (shop_id, name, description)
        VALUES (r_shop.id, 'Nimko & Dry Snacks', 'Bawany nimko, dal moth, chewra, papdi, salted nuts')
        ON CONFLICT (shop_id, name) DO UPDATE SET updated_at = NOW() RETURNING id INTO v_cat_nimko_id;

        INSERT INTO public.categories (shop_id, name, description)
        VALUES (r_shop.id, 'Dairy & Eggs', 'Milk, yogurt, cheese slices, butter, desi ghee, farm eggs')
        ON CONFLICT (shop_id, name) DO UPDATE SET updated_at = NOW() RETURNING id INTO v_cat_dairy_id;

        INSERT INTO public.categories (shop_id, name, description)
        VALUES (r_shop.id, 'Tea, Coffee & Cold Drinks', 'Tapal tea, juices, cold drinks, flavored milk, energy drinks')
        ON CONFLICT (shop_id, name) DO UPDATE SET updated_at = NOW() RETURNING id INTO v_cat_beverages_id;

        INSERT INTO public.categories (shop_id, name, description)
        VALUES (r_shop.id, 'Jams, Honey & Spreads', 'Fruit jams, honey, hazelnut chocolate spread, mayonnaise')
        ON CONFLICT (shop_id, name) DO UPDATE SET updated_at = NOW() RETURNING id INTO v_cat_spreads_id;

        -- 2. Insert Products (with authentic Pakistani EAN-13 barcodes)
        INSERT INTO public.products (
            shop_id, category_id, name, sku, barcode, brand, unit, purchase_price, selling_price, current_stock, minimum_stock
        ) VALUES
        -- Breads & Buns
        (r_shop.id, v_cat_bread_id, 'Dawn Plain Bread (Family Large)', 'DWN-PLN-LRG', '8964000101018', 'Dawn', 'pcs', 170.00, 200.00, 45.000, 10.000),
        (r_shop.id, v_cat_bread_id, 'Dawn Milky Bread (Large)', 'DWN-MLK-LRG', '8964000101025', 'Dawn', 'pcs', 180.00, 210.00, 35.000, 8.000),
        (r_shop.id, v_cat_bread_id, 'Dawn Bran Bread (Healthy Brown)', 'DWN-BRAN-LRG', '8964000101032', 'Dawn', 'pcs', 175.00, 200.00, 25.000, 5.000),
        (r_shop.id, v_cat_bread_id, 'Bake Parlor Sandwich Bread', 'BP-SDW-BRD', '8964000101049', 'Bake Parlor', 'pcs', 160.00, 190.00, 20.000, 5.000),
        (r_shop.id, v_cat_bread_id, 'Dawn Jumbo Burger Buns (4 Pcs)', 'DWN-BUN-4PC', '8964000101056', 'Dawn', 'pack', 110.00, 130.00, 50.000, 15.000),
        (r_shop.id, v_cat_bread_id, 'Dawn Mini Sliders Buns (6 Pcs)', 'DWN-SLD-6PC', '8964000101063', 'Dawn', 'pack', 120.00, 140.00, 25.000, 5.000),
        (r_shop.id, v_cat_bread_id, 'Bake Parlor Hot Dog Buns (4 Pcs)', 'BP-HDG-4PC', '8964000101070', 'Bake Parlor', 'pack', 105.00, 130.00, 20.000, 5.000),
        (r_shop.id, v_cat_bread_id, 'Fresh Shawarma Pita Bread (5 Pcs)', 'PITA-SHW-5PC', '8964000101087', 'Gourmet', 'pack', 80.00, 100.00, 40.000, 10.000),
        (r_shop.id, v_cat_bread_id, 'Garlic Toast Herb Bread', 'GRL-BRD-PK', '8964000101094', 'Tehzeeb', 'pack', 150.00, 180.00, 15.000, 4.000),

        -- Rusks & Toasts
        (r_shop.id, v_cat_rusk_id, 'Tehzeeb Special Cake Rusk (500g)', 'THZ-CRSK-500', '8964000202015', 'Tehzeeb', 'pack', 320.00, 400.00, 30.000, 8.000),
        (r_shop.id, v_cat_rusk_id, 'Rahat Traditional Cake Rusk (450g)', 'RHT-CRSK-450', '8964000202022', 'Rahat', 'pack', 300.00, 380.00, 25.000, 6.000),
        (r_shop.id, v_cat_rusk_id, 'Dawn Crispy Tea Rusk (Box 400g)', 'DWN-TRSK-400', '8964000202039', 'Dawn', 'box', 200.00, 240.00, 35.000, 10.000),
        (r_shop.id, v_cat_rusk_id, 'Sweet Elaichi Rusk (400g)', 'ELC-RSK-400', '8964000202046', 'Gourmet', 'pack', 180.00, 220.00, 25.000, 5.000),
        (r_shop.id, v_cat_rusk_id, 'Bake Parlor Sugar-Free Diet Toast', 'BP-SF-TST', '8964000202053', 'Bake Parlor', 'pack', 210.00, 260.00, 20.000, 5.000),

        -- Cakes & Pastries
        (r_shop.id, v_cat_cake_id, 'Chocolate Fudge Pastry (Large)', 'PST-CHOC-LRG', '8964000303012', 'Gourmet', 'pcs', 130.00, 170.00, 24.000, 6.000),
        (r_shop.id, v_cat_cake_id, 'Black Forest Pastry', 'PST-BLK-FOR', '8964000303029', 'Tehzeeb', 'pcs', 140.00, 180.00, 20.000, 5.000),
        (r_shop.id, v_cat_cake_id, 'Red Velvet Cream Pastry', 'PST-RED-VEL', '8964000303036', 'Rahat', 'pcs', 150.00, 190.00, 16.000, 4.000),
        (r_shop.id, v_cat_cake_id, 'Pineapple Fresh Cream Pastry', 'PST-PIN-CRM', '8964000303043', 'Gourmet', 'pcs', 120.00, 160.00, 18.000, 4.000),
        (r_shop.id, v_cat_cake_id, 'Belgian Chocolate Cake (2 Lbs)', 'CAKE-BLG-2LB', '8964000303050', 'Tehzeeb', 'pcs', 1400.00, 1800.00, 5.000, 2.000),
        (r_shop.id, v_cat_cake_id, 'Pineapple Gateau Cake (2 Lbs)', 'CAKE-PIN-2LB', '8964000303067', 'Gourmet', 'pcs', 1100.00, 1450.00, 6.000, 2.000),
        (r_shop.id, v_cat_cake_id, 'English Cake Plain Pound (350g)', 'ENG-CAKE-350', '8964000303074', 'English Cake', 'pcs', 220.00, 270.00, 30.000, 8.000),
        (r_shop.id, v_cat_cake_id, 'English Cake Fruit Slice (350g)', 'ENG-FRT-350', '8964000303081', 'English Cake', 'pcs', 240.00, 290.00, 25.000, 6.000),
        (r_shop.id, v_cat_cake_id, 'Chocolate Glazed Donut', 'DNT-CHOC-GLZ', '8964000303098', 'Bakery Fresh', 'pcs', 90.00, 120.00, 30.000, 8.000),
        (r_shop.id, v_cat_cake_id, 'Strawberry Cream Swiss Roll', 'SWS-STR-ROL', '8964000303104', 'Gourmet', 'pcs', 110.00, 150.00, 15.000, 4.000),

        -- Biscuits & Cookies
        (r_shop.id, v_cat_biscuit_id, 'Khalifa Special Badam Nan Khatai (Box)', 'KHL-BADAM-BOX', '8964000404019', 'Khalifa', 'box', 420.00, 520.00, 30.000, 8.000),
        (r_shop.id, v_cat_biscuit_id, 'Pista Nan Khatai (500g)', 'KHT-PST-500', '8964000404026', 'Tehzeeb', 'box', 450.00, 560.00, 20.000, 5.000),
        (r_shop.id, v_cat_biscuit_id, 'Zeera Salted Biscuits (500g Pack)', 'BSC-ZEERA-500', '8964000404033', 'Rahat', 'pack', 260.00, 330.00, 35.000, 10.000),
        (r_shop.id, v_cat_biscuit_id, 'Bakery Coconut Macaroons (400g)', 'BSC-COCO-400', '8964000404040', 'Gourmet', 'pack', 280.00, 350.00, 25.000, 6.000),
        (r_shop.id, v_cat_biscuit_id, 'Choc Chip Butter Cookies (350g)', 'CK-CHOC-BTR', '8964000404057', 'Tehzeeb', 'pack', 320.00, 400.00, 20.000, 5.000),
        (r_shop.id, v_cat_biscuit_id, 'LU Prince Chocolate Biscuits (Half Roll)', 'LU-PRN-HLF', '8964000404064', 'Continental', 'pack', 40.00, 50.00, 80.000, 20.000),
        (r_shop.id, v_cat_biscuit_id, 'Peek Freans Sooper Biscuits (Family Pack)', 'PF-SOP-FAM', '8964000404071', 'EBM', 'pack', 95.00, 110.00, 70.000, 20.000),
        (r_shop.id, v_cat_biscuit_id, 'Peek Freans Rio Strawberry Biscuits', 'PF-RIO-STR', '8964000404088', 'EBM', 'pack', 40.00, 50.00, 60.000, 15.000),

        -- Fresh Savories & Snacks
        (r_shop.id, v_cat_savory_id, 'Chicken Puff Patties (Crispy Flaky)', 'PAT-CHK-PUF', '8964000505016', 'Tehzeeb', 'pcs', 85.00, 110.00, 50.000, 12.000),
        (r_shop.id, v_cat_savory_id, 'Beef Flaky Patties (Large)', 'PAT-BEF-LRG', '8964000505023', 'Rahat', 'pcs', 90.00, 120.00, 30.000, 8.000),
        (r_shop.id, v_cat_savory_id, 'Chicken Tikka Pizza (Small 7 Inch)', 'PIZ-CHK-7IN', '8964000505030', 'Gourmet', 'pcs', 280.00, 350.00, 20.000, 5.000),
        (r_shop.id, v_cat_savory_id, 'Chicken Cheese Shawarma Roll', 'SHW-CHK-CHS', '8964000505047', 'Bakery Fresh', 'pcs', 170.00, 220.00, 25.000, 6.000),
        (r_shop.id, v_cat_savory_id, 'Vegetable & Aloo Samosa (Big)', 'SAM-ALOO-LRG', '8964000505054', 'Bakery Fresh', 'pcs', 35.00, 50.00, 60.000, 20.000),
        (r_shop.id, v_cat_savory_id, 'Cocktail Chicken Samosa (Dozen)', 'SAM-CHK-DZN', '8964000505061', 'Gourmet', 'pack', 250.00, 320.00, 20.000, 5.000),
        (r_shop.id, v_cat_savory_id, 'Chicken Club Sandwich with Fries', 'SDW-CLUB-FRY', '8964000505078', 'Tehzeeb', 'pcs', 260.00, 340.00, 15.000, 4.000),
        (r_shop.id, v_cat_savory_id, 'Crispy Spring Egg Roll', 'ROL-SPR-EGG', '8964000505085', 'Bakery Fresh', 'pcs', 65.00, 85.00, 30.000, 8.000),
        (r_shop.id, v_cat_savory_id, 'Bakery Cheese Sticks (250g)', 'CHS-STK-250', '8964000505092', 'Tehzeeb', 'pack', 180.00, 240.00, 20.000, 5.000),

        -- Traditional Sweets (Mithai)
        (r_shop.id, v_cat_sweets_id, 'Special Gulab Jamun (1 KG Box)', 'SWT-GLB-1KG', '8964000606013', 'Gourmet', 'kg', 680.00, 880.00, 20.000, 4.000),
        (r_shop.id, v_cat_sweets_id, 'Plain Khoya Barfi (1 KG Box)', 'SWT-BRF-1KG', '8964000606020', 'Rahat', 'kg', 750.00, 950.00, 15.000, 3.000),
        (r_shop.id, v_cat_sweets_id, 'Special Rasgulla in Sugar Syrup (1 KG)', 'SWT-RAS-1KG', '8964000606037', 'Shezan', 'kg', 650.00, 850.00, 12.000, 3.000),
        (r_shop.id, v_cat_sweets_id, 'Pista Kalakand (Half KG)', 'SWT-KLK-500', '8964000606044', 'Tehzeeb', 'pack', 450.00, 560.00, 10.000, 2.000),
        (r_shop.id, v_cat_sweets_id, 'Baisan Ladoo (Half KG)', 'SWT-LAD-500', '8964000606051', 'Gourmet', 'pack', 350.00, 450.00, 15.000, 4.000),

        -- Nimko & Dry Snacks
        (r_shop.id, v_cat_nimko_id, 'Bawany Special Mix Nimko (400g)', 'NMK-BWN-400', '8964000707010', 'Bawany', 'pack', 200.00, 260.00, 40.000, 10.000),
        (r_shop.id, v_cat_nimko_id, 'Bawany Spicy Dal Moth (400g)', 'NMK-DALM-400', '8964000707027', 'Bawany', 'pack', 190.00, 250.00, 30.000, 8.000),
        (r_shop.id, v_cat_nimko_id, 'Sweet & Salty Chewra (350g)', 'NMK-CHW-350', '8964000707034', 'Gourmet', 'pack', 170.00, 220.00, 25.000, 6.000),
        (r_shop.id, v_cat_nimko_id, 'Salted Peanuts (250g Pouch)', 'NUT-PNT-250', '8964000707041', 'House Special', 'pack', 160.00, 200.00, 35.000, 10.000),
        (r_shop.id, v_cat_nimko_id, 'Crispy Potato French Cheese Slices', 'SNK-POT-CHS', '8964000707058', 'Lays', 'pack', 85.00, 100.00, 50.000, 15.000),
        (r_shop.id, v_cat_nimko_id, 'Kurkure Chutney Chaska (Family Pack)', 'KRK-CHT-FAM', '8964000707065', 'Kurkure', 'pack', 85.00, 100.00, 45.000, 12.000),

        -- Dairy & Eggs
        (r_shop.id, v_cat_dairy_id, 'Nestle MilkPak Full Cream (1 Litre)', 'NST-MLK-1L', '8964000808017', 'Nestle', 'pack', 290.00, 320.00, 50.000, 15.000),
        (r_shop.id, v_cat_dairy_id, 'Olpers Dairy Milk (1 Litre)', 'OLP-MLK-1L', '8964000808024', 'Engro', 'pack', 290.00, 320.00, 45.000, 15.000),
        (r_shop.id, v_cat_dairy_id, 'Nurpur Salted Butter (200g)', 'NUR-BTR-200', '8964000808031', 'Nurpur', 'pcs', 280.00, 330.00, 25.000, 6.000),
        (r_shop.id, v_cat_dairy_id, 'Adams Cheddar Cheese Slices (200g)', 'ADM-CHS-200', '8964000808048', 'Adams', 'pack', 420.00, 500.00, 20.000, 5.000),
        (r_shop.id, v_cat_dairy_id, 'Fresh Farm Eggs (Crate of 30)', 'EGG-CRT-30', '8964000808055', 'Farm Fresh', 'tray', 620.00, 720.00, 15.000, 3.000),
        (r_shop.id, v_cat_dairy_id, 'Nestle Sweet N Tasty Yogurt (400g)', 'NST-YOG-400', '8964000808062', 'Nestle', 'cup', 130.00, 150.00, 25.000, 5.000),

        -- Tea, Coffee & Beverages
        (r_shop.id, v_cat_beverages_id, 'Tapal Danedar Tea (Pouch 430g)', 'TPL-DAN-430', '8964000909014', 'Tapal', 'pack', 680.00, 780.00, 30.000, 8.000),
        (r_shop.id, v_cat_beverages_id, 'Vital Tea Gold (400g Box)', 'VTL-TEA-400', '8964000909021', 'Vital', 'box', 620.00, 720.00, 20.000, 5.000),
        (r_shop.id, v_cat_beverages_id, 'Nescafe Classic Coffee (50g Jar)', 'NSC-COF-50G', '8964000909038', 'Nestle', 'jar', 520.00, 620.00, 15.000, 4.000),
        (r_shop.id, v_cat_beverages_id, 'Pakola Ice Cream Soda (Can 250ml)', 'PAK-CAN-250', '8964000909045', 'Pakola', 'can', 80.00, 100.00, 60.000, 15.000),
        (r_shop.id, v_cat_beverages_id, 'Milo Chocolate Malt Drink (180ml)', 'MILO-180ML', '8964000909052', 'Nestle', 'pack', 85.00, 100.00, 40.000, 10.000),
        (r_shop.id, v_cat_beverages_id, 'Nestle Fruita Vitals Chaunsa (1L)', 'NST-FVT-1L', '8964000909069', 'Nestle', 'pack', 320.00, 380.00, 25.000, 6.000),
        (r_shop.id, v_cat_beverages_id, 'Rooh Afza Syrup Bottle (800ml)', 'HAM-ROOH-800', '8964000909076', 'Hamdard', 'bottle', 380.00, 440.00, 30.000, 8.000),
        (r_shop.id, v_cat_beverages_id, 'Aquafina Mineral Water (1.5 Litre)', 'AQF-WTR-15L', '8964000909083', 'PepsiCo', 'bottle', 80.00, 100.00, 60.000, 20.000),

        -- Jams, Honey & Spreads
        (r_shop.id, v_cat_spreads_id, 'Mitchells Mixed Fruit Jam (450g)', 'MIT-JAM-450', '8964001010010', 'Mitchells', 'jar', 290.00, 350.00, 25.000, 5.000),
        (r_shop.id, v_cat_spreads_id, 'Shezan Mango Jam (440g Bottle)', 'SHZ-JAM-440', '8964001010027', 'Shezan', 'jar', 270.00, 330.00, 20.000, 5.000),
        (r_shop.id, v_cat_spreads_id, 'Marhaba Natural Pure Honey (250g)', 'MRH-HNY-250', '8964001010034', 'Marhaba', 'jar', 360.00, 450.00, 15.000, 4.000),
        (r_shop.id, v_cat_spreads_id, 'Nutella Hazelnut Cocoa Spread (350g)', 'NUT-SPR-350', '8964001010041', 'Ferrero', 'jar', 950.00, 1200.00, 12.000, 3.000),
        (r_shop.id, v_cat_spreads_id, 'Youngs Mayonnaise (Classic 500ml Pouch)', 'YNG-MAY-500', '8964001010058', 'Youngs', 'pouch', 340.00, 400.00, 30.000, 8.000)

        ON CONFLICT (shop_id, barcode) DO UPDATE SET
            selling_price = EXCLUDED.selling_price,
            current_stock = EXCLUDED.current_stock,
            brand = EXCLUDED.brand,
            updated_at = NOW();

    END LOOP;
END $$;
