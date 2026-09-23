# Bazaar — Marketplace Webapp

Daraz-jaisa multi-vendor marketplace: buyers browse & purchase, sellers list
products, platform earns a commission on every order.

## Stack
- **Frontend:** static HTML/CSS/JS in `/public`
- **API:** Cloudflare Pages Functions in `/functions/api/[[path]].js`
- **Database:** Cloudflare D1 (SQLite)

## Setup

1. **Create a D1 database**
   ```
   npx wrangler d1 create bazaar-db
   ```
   Copy the returned `database_id`.

2. **Bind D1 in Cloudflare Pages**
   Dashboard → your Pages project → Settings → Functions → D1 database bindings
   → variable name `DB`, pick `bazaar-db`.

3. **Load the schema**
   ```
   npx wrangler d1 execute bazaar-db --file=./schema.sql
   ```

4. **Deploy**
   Push this repo to GitHub, connect it in Cloudflare Pages (same flow as
   Baatcheet/CaptionAI), build output directory = `public`.

5. **Create the first admin account**
   Signup only creates buyer/seller accounts. After signup once as any user,
   run:
   ```
   npx wrangler d1 execute bazaar-db --command="UPDATE users SET role='admin' WHERE email='your@email.com'"
   ```

## Commission rate

Stored in the `settings` table (`commission_rate`, default `0.10` = 10%).
Change it with:
```
npx wrangler d1 execute bazaar-db --command="UPDATE settings SET value='0.12' WHERE key='commission_rate'"
```

## JazzCash / Easypaisa payment

Orders are currently created with `payment_status = 'pending'` — there's no
live payment gateway call yet. Both JazzCash and Easypaisa require you to
apply for a **merchant account** directly with them (business registration
needed) before they issue API credentials. Once you have those, the
integration point is marked with a `NOTE:` comment inside
`functions/api/[[path]].js`, in the `orders` POST handler.

## Auth note

The included auth is a minimal demo (SHA-256 password hash + an unsigned
token) so the app runs end-to-end. Before going live, replace `makeToken`/
`readToken` in the Worker with real signed JWTs (e.g. using a secret bound
via `env.JWT_SECRET`), and serve the app only over HTTPS (Pages does this by
default).

## What's built vs. what's next
- ✅ Buyer marketplace (browse, filter by category, cart, checkout)
- ✅ Seller signup/login, product listing, "my listings" table
- ✅ Admin login, sales + commission summary
- ✅ Commission auto-calculated per order (rate configurable)
- ⏳ Real payment gateway call (needs your JazzCash/Easypaisa merchant creds)
- ⏳ Order status updates (shipped/delivered) — orders table already supports it
- ⏳ Product images upload (currently a URL field — could wire to Cloudflare R2 later)
