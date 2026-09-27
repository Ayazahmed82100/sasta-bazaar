-- Run this in the D1 Console — adds a field so sellers can show a
-- crossed-out original price (discount badge), Daraz-style.

ALTER TABLE products ADD COLUMN compare_at_price REAL;
