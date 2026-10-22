-- =====================================================================
-- seed.sql: the STARTING DATA: the price list from for_website_demo.xlsx
-- and the packages from the 2024 rate card.
--
-- "INSERT INTO table (columns) VALUES (row), (row) ...;" adds rows.
-- After this first fill, the office will change prices on the admin
-- page (build step 5). From then on the DATABASE is the real price
-- list, not the spreadsheet.
--
-- Small clean-ups compared with the spreadsheet (spelling only, prices unchanged):
--   Linning -> Lining, Drapping -> Draping, Folk + Spooon -> fork and spoon,
--   Center -> Centre, Videograph -> Video, plural names made singular.
-- =====================================================================


-- ---------- Settings ----------
INSERT INTO settings (key, value) VALUES
  ('business_name',    'Mnyazi Dream Decor'),
  ('address',          'Along St Thomas – Prison Road, Kilifi'),
  ('phone',            '0793 463 223'),
  ('whatsapp',         '254793463223'),
  ('booking_prefix',   'MDD'),      -- booking numbers look like MDD-2026-0001
  ('deposit_percent',  '50'),       -- still to be confirmed by the client
  ('quote_valid_days', '14'),
  -- The version of the table design. server.js compares it with the number it expects,
  -- so an old database is spotted straight away. Raise both when schema.sql changes.
  ('schema_version',   '5');


-- ---------- Budget ranges (the one-tap chips in the budget finder) ----------
-- NULL = no limit on that side
INSERT INTO budget_ranges (id, label, min_amount, max_amount, sort_order) VALUES
-- Ranges chosen to fit the rate card packages (10,000 to 100,000).
-- Tents and chairs come on top of a package, so the chips are about the décor budget.
  (1, 'Below 20,000',       NULL,  20000, 1),
  (2, '20,000 – 40,000',   20000,  40000, 2),
  (3, '40,000 – 60,000',   40000,  60000, 3),
  (4, '60,000 – 80,000',   60000,  80000, 4),
  (5, '80,000 – 100,000',  80000, 100000, 5),
  (6, 'Above 100,000',    100000,   NULL, 6);


-- ---------- Categories ----------
-- We choose the id numbers ourselves (1 to 7) so the items below can use them.
INSERT INTO categories (id, slug, name, sort_order) VALUES
  (1, 'tents',   'Tents & canopies',      1),
  (2, 'seating', 'Seating',               2),
  (3, 'tables',  'Tables & settings',     3),
  (4, 'decor',   'Décor & flowers',       4),
  (5, 'stages',  'Stages & walkways',     5),
  (6, 'booths',  'Photobooths',           6),
  (7, 'power',   'Power, sound & video',  7);


-- ---------- Items (48 rows, same order and numbers as the spreadsheet) ----------
-- id = the S/No column in the spreadsheet, so it is easy to compare the two.
-- stock_count is only known for the 80-seater tent (7). The rest stay empty (NULL) until the office tells us.
INSERT INTO items (id, category_id, name, description, unit_price, stock_count, sort_order, office_note) VALUES
  ( 1, 1, '80-Seater Tent + Lining',            NULL,  3000,    7,  1, 'Check with office: the 2024 rate card hires a 50-seater tent at 2,500 and a 100-seater at 3,500; this list has no 50-seater.'),
  ( 2, 1, 'Side Cover',                         NULL,   500, NULL,  2, NULL),
  ( 3, 6, 'Photobooth (3-Phase Boards)',        NULL, 15000, NULL,  3, 'Check with office: looks the same as item 21, both 15,000. Merge or rename.'),
  ( 4, 2, 'Chiavari Seat',                      NULL,   250, NULL,  4, NULL),
  ( 5, 2, 'Seat Cover',                         NULL,    80, NULL,  5, NULL),
  ( 6, 2, 'Dressed Plastic Armless Seat + Tie Back', NULL, 100, NULL, 6, 'Check with office: the 2024 rate card hires a white armless chair at 20 each (undressed?).'),
  ( 7, 2, 'Chiavari Seat (White)',              NULL,   250, NULL,  7, NULL),
  ( 8, 2, 'Chiavari Seat (Crystal Clear)',      NULL,   300, NULL,  8, NULL),
  ( 9, 2, 'Bridal Seat',                        NULL,  1000, NULL,  9, NULL),
  (10, 3, 'Half-Moon Glass Table',              NULL, 10000, NULL, 10, 'Check with office: two half-moon tables (10,000 and 5,000). What is the difference?'),
  (11, 3, 'Half-Moon Glass Table',              NULL,  5000, NULL, 11, 'Check with office: two half-moon tables (10,000 and 5,000). What is the difference?'),
  (12, 4, 'Décor (Tent Draping)',               NULL,  2500, NULL, 12, NULL),
  (13, 5, 'Full Branded Stage',                 'Cake stage, bridal stage, walkway, branded dance floor and entry walkway.', 85000, NULL, 13, NULL),
  (14, 5, 'Red Carpet Walkway (15 m)',          NULL,  2500, NULL, 14, NULL),
  (15, 5, 'Red Carpet (100-Seater Tent)',       NULL,  4000, NULL, 15, NULL),
  (16, 5, 'Red Carpet (50–80 Seater Tent)',     NULL,  2000, NULL, 16, NULL),
  (17, 4, 'Flower Stand',                       NULL,   500, NULL, 17, NULL),
  (18, 4, 'Bridal Tent Full Décor',             NULL,  5000, NULL, 18, NULL),
  (19, 6, 'Photobooth (1-Phase)',               NULL,  7000, NULL, 19, NULL),
  (20, 6, 'Photobooth (2-Phase)',               NULL, 12000, NULL, 20, NULL),
  (21, 6, 'Photobooth (3-Phase)',               NULL, 15000, NULL, 21, 'Check with office: looks the same as item 3, both 15,000. Merge or rename.'),
  (22, 3, 'Round Table',                        NULL,   700, NULL, 22, NULL),
  (23, 3, 'Dressed Round Table',                NULL,   900, NULL, 23, NULL),
  (24, 3, 'Rectangle Table',                    NULL,   700, NULL, 24, NULL),
  (25, 3, 'Dressed Rectangle Table',            NULL,   900, NULL, 25, NULL),
  (26, 5, 'White Walkway',                      NULL,  2500, NULL, 26, NULL),
  (27, 5, 'Welcome Signage',                    NULL,  2500, NULL, 27, NULL),
  (28, 5, 'Decorated Entrance Arc',             NULL,  3000, NULL, 28, NULL),
  (29, 5, 'Picture Walkway Stands',             NULL,  1200, NULL, 29, NULL),
  (30, 1, 'Gazebo',                             NULL,  1500, NULL, 30, NULL),
  (31, 1, 'Gazebo – Decorated Canopy',          NULL,  2500, NULL, 31, NULL),
  (32, 1, '100-Seater Draped Canopy',           NULL,  3500, NULL, 32, 'Check with office: is this the same as the 100-seater tent (3,500) on the 2024 rate card?'),
  (33, 4, 'Centre Piece (Medium)',              NULL,   600, NULL, 33, NULL),
  (34, 4, 'Centre Piece (Large)',               NULL,   800, NULL, 34, NULL),
  (35, 4, 'Chandelier (Medium)',                NULL,  5000, NULL, 35, NULL),
  (36, 3, 'Complete Table Setup',               'Goblet, charger plate, napkin, fork and spoon.', 800, NULL, 36, NULL),
  (37, 4, 'Fresh Flowers (Medium Setup)',       NULL, 16000, NULL, 37, NULL),
  (38, 4, 'Fresh Flowers (Stage Setup)',        NULL, 30000, NULL, 38, NULL),
  (39, 1, 'A-Frame Tent, 30 × 5 m Section',     NULL, 70000, NULL, 39, NULL),
  (40, 1, 'A-Frame Tent, 25 × 5 m Section',     NULL, 57000, NULL, 40, NULL),
  (41, 1, 'A-Frame Tent, 20 × 5 m Section',     NULL, 50000, NULL, 41, NULL),
  (42, 1, 'B-Line Tent 10 × 10',                NULL, 35000, NULL, 42, NULL),
  (43, 7, 'Flood Light',                        NULL,  1000, NULL, 43, NULL),
  (44, 7, 'Generator',                          NULL,  5000, NULL, 44, NULL),
  (45, 7, 'P.A. System',                        NULL, 20000, NULL, 45, NULL),
  (46, 7, 'Video Coverage (1 Camera)',          NULL, 15000, NULL, 46, NULL),
  (47, 7, 'Video Coverage (3 Cameras)',         NULL, 30000, NULL, 47, NULL),
  (48, 7, 'Video Coverage (3 Cameras) + Live Streaming', NULL, 45000, NULL, 48, NULL);


-- ---------- Packages (from the OLD 2024 rate card: docs/rate-card-2024.pdf) ----------
-- Same data as db/packages-2024.json. Used for the prototype; the client is
-- sending an updated card, and the office will change prices on the admin page.
-- Rules from the card: all packages can be customised, round tables are
-- included, tents and chairs are NOT included (hired on top).
INSERT INTO packages (id, slug, category, name, price, guests_seated, sort_order) VALUES
  ( 1, 'white-wedding-basic-celebration' , 'White Wedding'     , 'Basic Celebration'          ,  40000,   30,  1),
  ( 2, 'white-wedding-elegant-gathering' , 'White Wedding'     , 'Elegant Gathering'          ,  50000,   75,  2),
  ( 3, 'white-wedding-deluxe-event'      , 'White Wedding'     , 'Deluxe Event'               ,  60000,  100,  3),
  ( 4, 'white-wedding-premium-celebration', 'White Wedding'     , 'Premium Celebration'        ,  80000,  200,  4),
  ( 5, 'white-wedding-ultimate-event-experience', 'White Wedding'     , 'Ultimate Event Experience'  , 100000,  300,  5),
  ( 6, 'church-package-1'                , 'Church'            , 'Church Package 1'           ,  10000, NULL,  6),
  ( 7, 'church-package-2'                , 'Church'            , 'Church Package 2'           ,  15000, NULL,  7),
  ( 8, 'malozi-basic-celebration'        , 'Malozi / Kuhaswa'  , 'Basic Celebration'          ,  35000,   30,  8),
  ( 9, 'malozi-elegant-gathering'        , 'Malozi / Kuhaswa'  , 'Elegant Gathering'          ,  45000,   75,  9),
  (10, 'malozi-deluxe-event'             , 'Malozi / Kuhaswa'  , 'Deluxe Event'               ,  60000,  100, 10),
  (11, 'malozi-premium-celebration'      , 'Malozi / Kuhaswa'  , 'Premium Celebration'        ,  80000,  200, 11),
  (12, 'malozi-ultimate-event-experience', 'Malozi / Kuhaswa'  , 'Ultimate Event Experience'  , 100000,  300, 12);

-- What each package includes (package id, line of text, order)
INSERT INTO package_includes (package_id, line, sort_order) VALUES
  -- White Wedding: Basic Celebration
  ( 1, 'Artificial flowers & 4 stands', 1),
  ( 1, 'Décor for 2 cars', 2),
  ( 1, '3 covered round tables + centrepieces', 3),
  ( 1, '30 covered seats + tie backs', 4),
  ( 1, 'Draped + backdrop 50-seater tent + red carpet', 5),
  ( 1, 'Photo booth', 6),
  ( 1, 'Draped gazebo', 7),
  ( 1, 'Welcome signage', 8),
  -- White Wedding: Elegant Gathering
  ( 2, 'Artificial flowers & 6 stands, entrance arch', 1),
  ( 2, 'Décor for 4 cars', 2),
  ( 2, '5 covered round tables + centrepieces', 3),
  ( 2, '75 covered seats + tie backs', 4),
  ( 2, 'Draped gazebo + canopy', 5),
  ( 2, '2 draped 50-seater guest tents', 6),
  ( 2, 'Draped + backdrop 50-seater tent (main tent)', 7),
  ( 2, 'Red carpet, walkway, photo booth', 8),
  ( 2, 'Welcome signage', 9),
  -- White Wedding: Deluxe Event
  ( 3, 'Fresh flowers & 6 stands, entrance arch', 1),
  ( 3, 'Décor for 6 cars', 2),
  ( 3, '11 covered round tables, 100 covered seats + tie backs', 3),
  ( 3, 'Draped + backdrop + canopy 50-seater tent (main tent)', 4),
  ( 3, 'Draped gazebo + canopy, walkway + entrance arch', 5),
  ( 3, '2 draped 50-seater guest tents, photo booth', 6),
  ( 3, 'Welcome signage', 7),
  -- White Wedding: Premium Celebration
  ( 4, 'Fresh flowers & 6 stands, entrance arch', 1),
  ( 4, 'Décor for 8 cars', 2),
  ( 4, '15 covered round tables + fresh flower centrepieces', 3),
  ( 4, '200 covered seats + tie backs', 4),
  ( 4, 'Draped + backdrop + red carpet 50-seater tent (main tent)', 5),
  ( 4, 'Draped + red carpet for guest tent', 6),
  ( 4, 'Walkway, photo booth', 7),
  ( 4, 'Gazebo + canopy', 8),
  ( 4, 'Welcome signage', 9),
  -- White Wedding: Ultimate Event Experience
  ( 5, 'Fresh flowers & 6 stands, entrance arch', 1),
  ( 5, 'Décor for 10 cars', 2),
  ( 5, '20 covered round tables + fresh flower centrepieces', 3),
  ( 5, '300 covered seats + tie backs', 4),
  ( 5, 'Backdrop + canopy + red carpet for a 50-seater tent (main tent)', 5),
  ( 5, 'Red carpet for 2 draped 50-seater guest tents', 6),
  ( 5, 'Walkway, branded dance floor', 7),
  ( 5, 'Gazebo + canopy', 8),
  ( 5, 'Photo booth, welcome signage', 9),
  -- Church: Church Package 1
  ( 6, 'Walkway + 6 stands', 1),
  ( 6, '6 dressed chairs', 2),
  ( 6, '2 white pillows', 3),
  -- Church: Church Package 2
  ( 7, 'Altar decoration, entrance arch', 1),
  ( 7, 'Walkway + 6 stands', 2),
  ( 7, '10 dressed chairs', 3),
  ( 7, '2 white pillows', 4),
  -- Malozi / Kuhaswa: Basic Celebration
  ( 8, 'Traditional clothes & items decorations', 1),
  ( 8, '3 covered round tables, 30 covered seats', 2),
  ( 8, 'Draped + backdrop 50-seater tent + red carpet', 3),
  ( 8, 'Photo booth, draped gazebo', 4),
  ( 8, 'Welcome signage', 5),
  -- Malozi / Kuhaswa: Elegant Gathering
  ( 9, 'Traditional clothes & items decorations', 1),
  ( 9, '5 covered round tables, 75 covered seats', 2),
  ( 9, 'Draped gazebo + canopy', 3),
  ( 9, '2 draped 50-seater guest tents', 4),
  ( 9, 'Walkway with red carpet', 5),
  ( 9, 'Photo booth, welcome signage', 6),
  -- Malozi / Kuhaswa: Deluxe Event
  (10, 'Traditional clothes & items decorations', 1),
  (10, '11 covered round tables + fresh flower centrepieces', 2),
  (10, '100 covered seats, walkway + fresh flowers', 3),
  (10, '2 draped 50-seater guest tents', 4),
  (10, 'Draped gazebo + canopy, photo booth', 5),
  (10, 'Welcome signage', 6),
  -- Malozi / Kuhaswa: Premium Celebration
  (11, 'Traditional clothes & items decorations', 1),
  (11, '15 covered round tables + fresh flower centrepieces', 2),
  (11, '200 covered seats, draped + backdrop + red carpet', 3),
  (11, '2 draped 50-seater guest tents', 4),
  (11, 'Traditional walkway, photo booth', 5),
  (11, 'Welcome signage', 6),
  -- Malozi / Kuhaswa: Ultimate Event Experience
  (12, 'Traditional clothes & items decorations', 1),
  (12, '20 covered round tables + fresh flower centrepieces', 2),
  (12, '300 covered seats', 3),
  (12, '2 draped 100-seater tents', 4),
  (12, 'Traditional walkway, branded dance floor', 5),
  (12, 'Photo booth, welcome signage', 6);


-- ---------- Event types (from the rate card, plus Funeral and Other) ----------
-- package_category = the package group the budget finder suggests (NULL = all packages)
INSERT INTO event_types (name, package_category, sort_order) VALUES
  ('Wedding',          'White Wedding',     1),
  ('Malozi / Kuhaswa', 'Malozi / Kuhaswa',  2),
  ('Church',           'Church',            3),
  ('Baby Shower',      NULL,                4),
  ('Birthday',         NULL,                5),
  ('Graduation',       NULL,                6),
  ('Farewell',         NULL,                7),
  ('Corporate',        NULL,                8),
  ('Funeral',          NULL,                9),
  ('Other',            NULL,               10);


-- ---------- Areas (from CLAUDE.md) ----------
INSERT INTO areas (name, sort_order) VALUES
  ('Kilifi town', 1), ('Mnarani', 2), ('Malindi', 3), ('Watamu', 4),
  ('Mtwapa', 5), ('Mombasa', 6), ('Other', 7);
