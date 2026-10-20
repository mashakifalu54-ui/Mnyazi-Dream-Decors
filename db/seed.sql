-- =====================================================================
-- seed.sql: the STARTING DATA, copied from for_website_demo.xlsx.
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
  ('quote_valid_days', '14');


-- ---------- Budget ranges (the one-tap chips in the budget finder) ----------
-- NULL = no limit on that side
INSERT INTO budget_ranges (id, label, min_amount, max_amount, sort_order) VALUES
  (1, 'Below 30,000',      NULL,  30000, 1),
  (2, '30,000 – 50,000',   30000,  50000, 2),
  (3, '50,000 – 100,000',  50000, 100000, 3),
  (4, '100,000 – 200,000', 100000, 200000, 4),
  (5, '200,000 – 300,000', 200000, 300000, 5),
  (6, 'Above 300,000',     300000,  NULL, 6);


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
  ( 1, 1, '80-Seater Tent + Lining',            NULL,  3000,    7,  1, NULL),
  ( 2, 1, 'Side Cover',                         NULL,   500, NULL,  2, NULL),
  ( 3, 6, 'Photobooth (3-Phase Boards)',        NULL, 15000, NULL,  3, 'Check with office: looks the same as item 21, both 15,000. Merge or rename.'),
  ( 4, 2, 'Chiavari Seat',                      NULL,   250, NULL,  4, NULL),
  ( 5, 2, 'Seat Cover',                         NULL,    80, NULL,  5, NULL),
  ( 6, 2, 'Dressed Plastic Armless Seat + Tie Back', NULL, 100, NULL, 6, NULL),
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
  (32, 1, '100-Seater Draped Canopy',           NULL,  3500, NULL, 32, NULL),
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


-- ---------- Packages (EXAMPLES, hidden until the client confirms) ----------
-- is_visible = 0 means customers can't see them yet.
-- price is empty (NULL), so the package costs the sum of its items.
INSERT INTO packages (id, slug, name, description, price, is_visible, sort_order) VALUES
  (1, 'starter', 'Starter', 'Garden event, about 100 guests.',        NULL, 0, 1),
  (2, 'deluxe',  'Deluxe',  'Wedding or ruracio, about 100 guests.',  NULL, 0, 2),
  (3, 'premium', 'Premium', 'Full wedding, about 150 guests.',        NULL, 0, 3);

-- (package id, item id, how many, one per how many guests).
-- qty = the amount for the example guest count in the description.
-- per_guests NULL = the same amount whatever the guest count.
-- The item names are in the comments. The per-guest numbers are our guesses: confirm with the office.
INSERT INTO package_items (package_id, item_id, qty, per_guests) VALUES
  -- Starter (about 100 guests)
  (1,  1,   2,   80),   -- 80-Seater Tent + Lining: one per 80 guests
  (1,  6, 100,    1),   -- Dressed Plastic Armless Seat + Tie Back: one per guest
  (1, 23,  10,   10),   -- Dressed Round Table: one per 10 guests
  (1, 27,   1, NULL),   -- Welcome Signage
  (1, 17,   4, NULL),   -- Flower Stand
  -- Deluxe (about 100 guests)
  (2,  1,   2,   80),   -- 80-Seater Tent + Lining
  (2, 12,   2,   80),   -- Décor (Tent Draping): one per tent
  (2,  4, 100,    1),   -- Chiavari Seat
  (2, 23,  10,   10),   -- Dressed Round Table
  (2, 34,  10,   10),   -- Centre Piece (Large): one per table
  (2, 20,   1, NULL),   -- Photobooth (2-Phase)
  (2, 14,   1, NULL),   -- Red Carpet Walkway (15 m)
  (2, 28,   1, NULL),   -- Decorated Entrance Arc
  -- Premium (about 150 guests)
  (3, 41,   1, NULL),   -- A-Frame Tent, 20 × 5 m Section
  (3, 13,   1, NULL),   -- Full Branded Stage
  (3,  8, 150,    1),   -- Chiavari Seat (Crystal Clear)
  (3, 23,  15,   10),   -- Dressed Round Table
  (3, 38,   1, NULL),   -- Fresh Flowers (Stage Setup)
  (3, 35,   2, NULL),   -- Chandelier (Medium)
  (3, 21,   1, NULL),   -- Photobooth (3-Phase)
  (3, 45,   1, NULL),   -- P.A. System
  (3, 47,   1, NULL),   -- Video Coverage (3 Cameras)
  (3, 44,   1, NULL);   -- Generator
