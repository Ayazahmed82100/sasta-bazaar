// Cloudflare Pages Functions catch-all API route: /api/*
// Binds to D1 database "DB" (set in Cloudflare dashboard -> Pages -> Settings -> Functions -> D1 bindings)

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function hashPassword(password) {
  const enc = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function makeToken(userId, role) {
  // Simple signed-less token for demo purposes. Replace with real JWT + secret in production.
  return btoa(JSON.stringify({ userId, role, ts: Date.now() }));
}

function readToken(request) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  try {
    return JSON.parse(atob(token));
  } catch {
    return null;
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\//, "");
  const db = env.DB;

  try {
    // --- AUTH ---
    if (path === "auth/signup" && request.method === "POST") {
      const { name, email, password, role } = await request.json();
      const password_hash = await hashPassword(password);
      const result = await db
        .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)")
        .bind(name, email, password_hash, role || "buyer")
        .run();
      const userId = result.meta.last_row_id;
      return json({ token: makeToken(userId, role || "buyer"), userId });
    }

    if (path === "auth/login" && request.method === "POST") {
      const { email, password } = await request.json();
      const password_hash = await hashPassword(password);
      const user = await db
        .prepare("SELECT id, role FROM users WHERE email = ? AND password_hash = ?")
        .bind(email, password_hash)
        .first();
      if (!user) return json({ error: "Invalid credentials" }, 401);
      return json({ token: makeToken(user.id, user.role), userId: user.id, role: user.role });
    }

    // --- PRODUCTS ---
    if (path === "products" && request.method === "GET") {
      const category = url.searchParams.get("category");
      const q = category
        ? db.prepare("SELECT * FROM products WHERE status='active' AND category = ? ORDER BY created_at DESC").bind(category)
        : db.prepare("SELECT * FROM products WHERE status='active' ORDER BY created_at DESC");
      const { results } = await q.all();
      return json(results);
    }

    if (path === "products" && request.method === "POST") {
      const auth = readToken(request);
      if (!auth || auth.role !== "seller") return json({ error: "Sellers only" }, 403);
      const { title, description, category, price, stock, image_url } = await request.json();
      const result = await db
        .prepare(
          "INSERT INTO products (seller_id, title, description, category, price, stock, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(auth.userId, title, description, category, price, stock, image_url)
        .run();
      return json({ productId: result.meta.last_row_id });
    }

    if (path.startsWith("products/seller/") && request.method === "GET") {
      const sellerId = path.split("/")[2];
      const { results } = await db
        .prepare("SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC")
        .bind(sellerId)
        .all();
      return json(results);
    }

    // --- ORDERS / CHECKOUT ---
    if (path === "orders" && request.method === "POST") {
      const auth = readToken(request);
      if (!auth) return json({ error: "Login required" }, 401);
      const { items, payment_method } = await request.json(); // items: [{product_id, quantity}]

      const rateRow = await db.prepare("SELECT value FROM settings WHERE key='commission_rate'").first();
      const commissionRate = parseFloat(rateRow?.value || "0.10");

      let total = 0;
      const lineItems = [];
      for (const item of items) {
        const product = await db.prepare("SELECT * FROM products WHERE id = ?").bind(item.product_id).first();
        if (!product || product.stock < item.quantity) {
          return json({ error: `Insufficient stock for product ${item.product_id}` }, 400);
        }
        const lineTotal = product.price * item.quantity;
        total += lineTotal;
        lineItems.push({ ...item, seller_id: product.seller_id, unit_price: product.price, line_total: lineTotal });
      }

      const commission = +(total * commissionRate).toFixed(2);
      const payout = +(total - commission).toFixed(2);

      const orderResult = await db
        .prepare(
          "INSERT INTO orders (buyer_id, total_amount, commission_amount, seller_payout, payment_method) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(auth.userId, total, commission, payout, payment_method || "jazzcash")
        .run();
      const orderId = orderResult.meta.last_row_id;

      for (const li of lineItems) {
        await db
          .prepare(
            "INSERT INTO order_items (order_id, product_id, seller_id, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?)"
          )
          .bind(orderId, li.product_id, li.seller_id, li.quantity, li.unit_price, li.line_total)
          .run();
        await db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").bind(li.quantity, li.product_id).run();
      }

      // NOTE: payment gateway call (JazzCash/Easypaisa) goes here once merchant
      // credentials are available — this currently marks payment as pending.
      return json({ orderId, total, commission, payout, payment_status: "pending" });
    }

    if (path.startsWith("orders/buyer/") && request.method === "GET") {
      const buyerId = path.split("/")[2];
      const { results } = await db
        .prepare("SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC")
        .bind(buyerId)
        .all();
      return json(results);
    }

    // --- ADMIN ---
    if (path === "admin/summary" && request.method === "GET") {
      const auth = readToken(request);
      if (!auth || auth.role !== "admin") return json({ error: "Admins only" }, 403);
      const totals = await db
        .prepare(
          "SELECT COUNT(*) as order_count, COALESCE(SUM(total_amount),0) as gmv, COALESCE(SUM(commission_amount),0) as commission_earned FROM orders"
        )
        .first();
      return json(totals);
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
