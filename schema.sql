-- Marketplace database schema (Cloudflare D1 / SQLite syntax)

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'buyer',   -- 'buyer' | 'seller' | 'admin'
  phone TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'hidden'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  buyer_id INTEGER NOT NULL REFERENCES users(id),
  total_amount REAL NOT NULL,
  commission_amount REAL NOT NULL,   -- platform's cut
  seller_payout REAL NOT NULL,       -- amount owed to seller(s)
  payment_method TEXT DEFAULT 'jazzcash',  -- 'jazzcash' | 'easypaisa'
  payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'failed'
  order_status TEXT NOT NULL DEFAULT 'placed',    -- 'placed' | 'shipped' | 'delivered' | 'cancelled'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  seller_id INTEGER NOT NULL REFERENCES users(id),
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  line_total REAL NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Default commission rate: 10% (editable by admin)
INSERT INTO settings (key, value) VALUES ('commission_rate', '0.10');
-- New tables: reviews, wishlist, coupons
-- Run this in the D1 Console (does not touch existing tables/data)

CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  buyer_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL,      -- 1 to 5
  comment TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wishlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  buyer_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(buyer_id, product_id)
);

CREATE TABLE coupons (
  code TEXT PRIMARY KEY,
  discount_percent REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- A sample welcome coupon (10% off) — change or delete anytime
INSERT INTO coupons (code, discount_percent, active) VALUES ('WELCOME10', 10, 1);
-- Run this in the D1 Console — adds a field so sellers can show a
-- crossed-out original price (discount badge), Daraz-style.

ALTER TABLE products ADD COLUMN compare_at_price REAL;
