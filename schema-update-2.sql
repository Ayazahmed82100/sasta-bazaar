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
