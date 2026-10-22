-- =====================================================================
-- schema.sql: the SHAPE of the Mnyazi Dream Decor database.
--
-- A database is a set of TABLES. A table is like one sheet in Excel:
--   * each COLUMN has a name and a type (text, whole number ...)
--   * each ROW is one thing (one item, one booking, one payment)
--
-- This file only creates EMPTY tables. The starting data (the price
-- list) is in seed.sql. db/setup.js runs this file first, then seed.sql.
--
-- Words you will see a lot:
--   INTEGER      a whole number (prices are whole Kenya shillings, no cents)
--   TEXT         words
--   PRIMARY KEY  the row's unique ID number; SQLite fills it in by itself
--   NOT NULL     this column must always have a value
--   DEFAULT      the value used when we don't give one
--   UNIQUE       no two rows may have the same value here
--   CHECK (...)  a rule; SQLite refuses any row that breaks it
--   REFERENCES   "this number is the ID of a row in another table"
--                (a FOREIGN KEY: it links tables together)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. SETTINGS: small values the office may change later, kept in one
--    place instead of being typed into the code.
--    Example row: key = 'deposit_percent', value = '50'
-- ---------------------------------------------------------------------
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,      -- the name of the setting
  value TEXT NOT NULL          -- its value (stored as text, the code converts it)
);


-- ---------------------------------------------------------------------
-- 1b. BUDGET RANGES: the one-tap budget chips in the budget finder
--     ("Below 20,000", "20,000-40,000" ...). Kept here, not in the code,
--     so the office can change them.
-- ---------------------------------------------------------------------
CREATE TABLE budget_ranges (
  id         INTEGER PRIMARY KEY,
  label      TEXT NOT NULL,                -- what the chip says
  min_amount INTEGER CHECK (min_amount >= 0),   -- empty = no lower limit
  max_amount INTEGER CHECK (max_amount >= 0),   -- empty = no upper limit ("Above 100,000")
  sort_order INTEGER NOT NULL DEFAULT 0
);


-- ---------------------------------------------------------------------
-- 2. CATEGORIES: the groups on the price list (Tents, Seating ...)
-- ---------------------------------------------------------------------
CREATE TABLE categories (
  id         INTEGER PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,      -- short name for links, e.g. 'tents'
  name       TEXT NOT NULL,             -- name people see, e.g. 'Tents & canopies'
  sort_order INTEGER NOT NULL DEFAULT 0 -- smaller number = shown first
);


-- ---------------------------------------------------------------------
-- 3. ITEMS: everything the client hires out, with its price.
--    One row per line of for_website_demo.xlsx.
-- ---------------------------------------------------------------------
CREATE TABLE items (
  id          INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),  -- which group it is in
  name        TEXT NOT NULL,
  description TEXT,                        -- optional extra words (what is included)
  unit_price  INTEGER NOT NULL CHECK (unit_price >= 0),     -- KES for one, for one event day
  stock_count INTEGER CHECK (stock_count >= 0),             -- how many the client owns; empty = not known yet
  -- Guest-linked items follow the guest count on the Build page (CLAUDE.md "Lessons from other sites"):
  -- one for every per_guests guests, rounded up. 1 = one per guest (seats), 10 = one per 10 guests (tables),
  -- 80 = one per 80 guests (an 80-seater tent). Empty = not linked to guests (a stage, a photobooth).
  per_guests  INTEGER CHECK (per_guests > 0),
  photo       TEXT,                        -- file name in public/images, empty = no photo yet
  is_visible  INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),  -- 1 = shown to customers, 0 = hidden
  sort_order  INTEGER NOT NULL DEFAULT 0,
  office_note TEXT                         -- reminders for the office only, never shown to customers
);


-- ---------------------------------------------------------------------
-- 4. PACKAGES: ready-made décor sets from the client's rate card
--    (White Wedding, Church, Malozi / Kuhaswa). Each has ONE fixed price.
--    From the card: packages do NOT include tents and chairs; those are
--    hired on top, so the quote adds them separately.
-- ---------------------------------------------------------------------
CREATE TABLE packages (
  id            INTEGER PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,      -- short name for links, e.g. 'white-wedding-basic'
  category      TEXT NOT NULL,             -- 'White Wedding', 'Church', 'Malozi / Kuhaswa'
  name          TEXT NOT NULL,             -- e.g. 'Basic Celebration'
  price         INTEGER NOT NULL CHECK (price >= 0),   -- KES, the office changes it on the admin page
  guests_seated INTEGER CHECK (guests_seated > 0),     -- how many covered seats it includes; empty = not about guests (Church)
  is_visible    INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),
  sort_order    INTEGER NOT NULL DEFAULT 0
);

-- What each package includes, as lines of text exactly like the rate card
-- ("Décor for 2 cars", "Photo booth" ...). They are words, not price-list
-- items: removing one is a note for the office, not an automatic discount.
CREATE TABLE package_includes (
  id         INTEGER PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,  -- delete package = delete its lines too
  line       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);


-- ---------------------------------------------------------------------
-- 4b. EVENT TYPES: the choices in the "Type of event" box (from the rate card).
-- ---------------------------------------------------------------------
CREATE TABLE event_types (
  id               INTEGER PRIMARY KEY,
  name             TEXT NOT NULL UNIQUE,
  -- Which package group suits this event (the budget finder shows those first).
  -- Must match packages.category, e.g. 'White Wedding'. Empty = show every package.
  package_category TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0
);


-- ---------------------------------------------------------------------
-- 4c. AREAS: where the event is (budget finder and booking form).
--     The office will add transport fees per area later.
-- ---------------------------------------------------------------------
CREATE TABLE areas (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);


-- ---------------------------------------------------------------------
-- 5. BOOKINGS: one row per customer request.
--    The same booking becomes the quote, then the invoice (see CLAUDE.md).
-- ---------------------------------------------------------------------
CREATE TABLE bookings (
  id              INTEGER PRIMARY KEY,
  booking_no      TEXT NOT NULL UNIQUE,     -- e.g. 'MDD-2026-0142', printed on every document
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
                    'new',           -- just sent by the customer
                    'needs_price',   -- has a custom item the office must price
                    'quoted',        -- office confirmed and sent the quote
                    'deposit_paid',  -- deposit received, date is held
                    'fully_paid',
                    'completed',     -- the event is over
                    'declined',
                    'cancelled')),
  customer_name   TEXT NOT NULL,
  phone           TEXT NOT NULL,            -- Kenyan number, stored as 2547XXXXXXXX
  event_type      TEXT NOT NULL,            -- one of event_types (copied as words, so old bookings keep it)
  event_date      TEXT NOT NULL,            -- 'YYYY-MM-DD' (SQLite keeps dates as text)
  guests          INTEGER CHECK (guests > 0),
  area            TEXT,                     -- Kilifi town, Malindi, Watamu ...
  notes           TEXT,                     -- venue, colours, set-up time (from the customer)
  -- Budget from the budget finder (all optional). An exact amount is saved
  -- as min = max. "Above 100,000" has no max; "Below 20,000" has no min.
  budget_min      INTEGER CHECK (budget_min >= 0),
  budget_max      INTEGER CHECK (budget_max >= 0),
  transport_fee   INTEGER NOT NULL DEFAULT 0 CHECK (transport_fee >= 0),  -- added by the office
  discount        INTEGER NOT NULL DEFAULT 0 CHECK (discount >= 0),       -- added by the office
  deposit_percent INTEGER NOT NULL DEFAULT 50 CHECK (deposit_percent BETWEEN 0 AND 100),  -- copied from settings when the booking is made
  status_token    TEXT NOT NULL UNIQUE,     -- long random code for the customer's private status page
  source          TEXT NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'office')),   -- who made it: the customer online, or the office
  office_notes    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),   -- SQLite fills in the date and time
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);


-- ---------------------------------------------------------------------
-- 6. BOOKING LINES: what is inside one booking (one row per line).
--    A line is ONE of three kinds:
--      * an item from the price list   -> item_id is filled in
--      * a package from the rate card  -> package_id is filled in (qty is 1)
--      * a custom request              -> custom_name is filled in
-- ---------------------------------------------------------------------
CREATE TABLE booking_lines (
  id          INTEGER PRIMARY KEY,              -- Postgres: GENERATED ALWAYS AS IDENTITY
  booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  item_id     INTEGER REFERENCES items(id),
  package_id  INTEGER REFERENCES packages(id),
  custom_name TEXT,
  qty         INTEGER NOT NULL CHECK (qty > 0),
  -- The price is COPIED onto the line when the booking is made, so that
  -- changing the price list later never changes an old quote.
  -- Empty (NULL) = custom item still waiting for the office to price it.
  unit_price  INTEGER CHECK (unit_price >= 0),
  -- line_total is never typed in: the database works it out from qty x unit_price.
  -- If unit_price is empty, line_total is empty too ("price pending").
  line_total  INTEGER GENERATED ALWAYS AS (qty * unit_price) STORED,   -- same words work in Postgres
  status      TEXT NOT NULL DEFAULT 'ok' CHECK (status IN (
                'ok',            -- normal line
                'pending',       -- custom item, waiting for a price
                'unavailable')), -- office can't supply it on that date
  -- Rule: exactly ONE of item_id / package_id / custom_name is filled in.
  -- (x IS NOT NULL) is 1 when filled, 0 when empty, so the three must add up to 1.
  CHECK ((item_id IS NOT NULL) + (package_id IS NOT NULL) + (custom_name IS NOT NULL) = 1)
  -- Postgres note: there, true + true doesn't work; write
  -- num_nonnulls(item_id, package_id, custom_name) = 1 instead.
);


-- ---------------------------------------------------------------------
-- 7. PAYMENTS: every payment attempt for a booking (see "Payments" in CLAUDE.md).
--    A booking only becomes deposit_paid / fully_paid from a 'success' row here.
-- ---------------------------------------------------------------------
CREATE TABLE payments (
  id           INTEGER PRIMARY KEY,
  booking_id   INTEGER NOT NULL REFERENCES bookings(id),
  provider     TEXT NOT NULL,              -- 'manual' first; later 'mpesa', 'card' ...
  method       TEXT,                       -- e.g. 'M-Pesa', 'Cash'
  amount       INTEGER NOT NULL CHECK (amount > 0),
  phone        TEXT,
  status       TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'pending', 'success', 'failed', 'cancelled')),
  provider_ref TEXT UNIQUE,                -- e.g. M-Pesa CheckoutRequestID; UNIQUE stops the same callback being saved twice
  receipt_code TEXT,                       -- e.g. the M-Pesa code 'SJK7XXXXXX'
  raw_callback TEXT,                       -- everything the provider sent us, as JSON text, for checking later
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT
);


-- ---------------------------------------------------------------------
-- 7b. LOGIN AUDIT: every try to log in to the admin page, right or wrong
--     (CLAUDE.md "Admin security"). Also used to slow down guessing:
--     5 wrong tries from one address = wait 15 minutes.
-- ---------------------------------------------------------------------
CREATE TABLE login_audit (
  id         INTEGER PRIMARY KEY,               -- Postgres: GENERATED ALWAYS AS IDENTITY
  ip         TEXT NOT NULL,                     -- the address the try came from
  success    INTEGER NOT NULL CHECK (success IN (0, 1)),   -- 1 = right password (Postgres: BOOLEAN)
  user_agent TEXT,                              -- which browser/phone, for spotting strange logins
  created_at TEXT NOT NULL DEFAULT (datetime('now'))        -- Postgres: now()
);


-- ---------------------------------------------------------------------
-- 8. INDEXES: like the index at the back of a book. They make common
--    searches fast. They don't change any data.
-- ---------------------------------------------------------------------
CREATE INDEX idx_items_category      ON items(category_id);
CREATE INDEX idx_includes_package    ON package_includes(package_id);
CREATE INDEX idx_bookings_status     ON bookings(status);
CREATE INDEX idx_bookings_event_date ON bookings(event_date);
CREATE INDEX idx_lines_booking       ON booking_lines(booking_id);
CREATE INDEX idx_payments_booking    ON payments(booking_id);
CREATE INDEX idx_login_audit_ip     ON login_audit(ip, created_at);

-- The reviews table (build step 7) will be added when we get there.
