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

## Updating an already-deployed site (new tables)

This update adds `reviews`, `wishlist`, and `coupons` tables. If your database
already exists, run **`schema-update-2.sql`** (not the full `schema.sql`) in
the D1 Console — it only adds the new tables and won't touch your existing
data:
```
npx wrangler d1 execute bazaar-db --file=./schema-update-2.sql
```
Then push the updated code to GitHub and redeploy on Cloudflare Pages
(Settings already has the DB binding, so no need to re-add it).

## Turning this into an app (PWA + Play Store)

**Phone install (PWA) — already built in:**
Once deployed, opening `sasta-bazaar.pages.dev` in Chrome shows an
"Install app" / "Add to Home Screen" option automatically — the site now has
a manifest, icons, and a service worker (offline caching for the shell). No
extra steps needed after deploying this update.

**Google Play Store — via PWABuilder (free):**
1. Go to https://www.pwabuilder.com on a computer (or phone browser) and
   enter `https://sasta-bazaar.pages.dev`
2. It will detect the manifest/service worker and score the PWA
3. Click **"Package for stores"** → **Android** → download the generated
   Android package (a Trusted Web Activity wrapper — a real installable APK/AAB)
4. PWABuilder gives you a `assetlinks.json` file and a SHA-256 fingerprint —
   create `public/.well-known/assetlinks.json` in this repo with that exact
   content, commit, and push (this proves you own the domain, so the app
   opens without browser address bars)
5. Create a free Google Play Console account (one-time $25 registration fee)
   at https://play.google.com/console, create a new app, and upload the
   `.aab` file PWABuilder generated
6. Fill in store listing (screenshots, description, privacy policy URL —
   you already have `privacy-policy.html` for this), submit for review

Review usually takes 1-3 days. No native coding needed — PWABuilder wraps
your existing site.


- ✅ Buyer marketplace (browse, filter by category, search, cart, checkout)
- ✅ Seller signup/login, product listing, "my listings" table
- ✅ Admin login, sales + commission summary
- ✅ Commission auto-calculated per order (rate configurable)
- ✅ Product reviews & star ratings
- ✅ Wishlist (buyers can save products)
- ✅ Coupon/discount codes at checkout (sample code: `WELCOME10`)
- ✅ Order tracking for buyers (My Orders page)
- ✅ Order management for sellers (update status: placed/shipped/delivered/cancelled)
- ✅ Policy pages: Privacy Policy, Terms & Conditions, Return/Refund Policy, Shipping Policy
- ✅ Installable as an app (PWA: manifest + icons + service worker) — Play Store via PWABuilder (see above)
- ⏳ Real payment gateway call (needs your JazzCash/Easypaisa merchant creds)
- ⏳ Product images upload (currently a URL field — could wire to Cloudflare R2 later)
- ⏳ Admin coupon management UI (currently edit via D1 Console directly)
