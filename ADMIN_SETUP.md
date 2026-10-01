# Admin Studio — setup (one time, ~15 minutes)

Admin URL: `https://YOUR-SITE/#/admin-login` (no link to it exists on the public site).

## 1. Supabase Auth settings (Dashboard → Authentication)
- **Sign In / Providers → turn OFF "Allow new users to sign up"** (this is what guarantees a single admin).
- **URL Configuration:** Site URL = your site URL; add the same URL to *Redirect URLs* (needed for password reset).
- Optional: set a custom SMTP server (Project Settings → Auth). The built-in mailer only sends a few e-mails per hour.

## 2. Database (Dashboard → SQL Editor, run in this order)
1. `supabase/admin_username_setup.sql`
2. `supabase/gallery_setup.sql`
3. `supabase/media_system.sql`  ← new (safe to re-run)

## 3. Create the one admin account
Authentication → Users → **Add user** (tick *Auto Confirm*), using an e-mail only you can read. Then run:

```sql
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
 where email = 'YOU@EXAMPLE.COM';

insert into public.admin_login_aliases (username, user_id)
select 'choose-an-admin-id', id from auth.users where email = 'YOU@EXAMPLE.COM';
```
(`username`: 3–32 chars, lowercase letters/numbers/. _ -.) If you already created an alias earlier, skip the insert.

## 4. Edge Functions
```bash
supabase link --project-ref YOUR-PROJECT-REF
supabase secrets set ALLOWED_ORIGINS=https://YOUR-SITE SITE_URL=https://YOUR-SITE/
supabase functions deploy admin-login admin-settings admin-recover
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase automatically; the service-role key never touches the website code.

## 5. Build & deploy the site
Copy `.env.example` to `.env`, fill in the project URL and **anon** key, then `npm install && npm run build` and deploy `dist/`.
For the real paths `/admin-login` and `/admin`, add a rewrite of all paths to `index.html` on your host (Netlify: `/* /index.html 200`); the site then maps them to the `#/…` routes automatically.

## Limits you can change
- Per-file size: `MAX_PHOTO_MB` / `MAX_VIDEO_MB` in `src/admin.js` **and** `file_size_limit` in `media_system.sql` (Supabase free plan allows at most 50 MB per file).
- Idle logout (30 min), maximum session (12 h), minimum password length (10): constants at the top of `src/admin.js` and `supabase/functions/_shared/common.ts`.

## Troubleshooting: "Network problem" / "Cannot reach the login service"
This means the browser got no usable reply from the `admin-login` function.
1. **Not deployed?** Run `supabase functions list` — `admin-login`, `admin-settings`, `admin-recover` must show `ACTIVE`. If not: `supabase functions deploy admin-login admin-settings admin-recover`.
2. **Origin not allowed?** `supabase secrets list` — `ALLOWED_ORIGINS` must be your site origin exactly (e.g. `https://your-site.com`, no path). Add every origin you use (custom domain, `*.netlify.app`, `http://localhost:5173`), comma separated. To disable the lock: `supabase secrets unset ALLOWED_ORIGINS`.
3. **Test directly** (should print a JSON error such as "Invalid admin ID or password", not a 404):
```bash
curl -i -X POST https://afsrnejeeyznmxbcskpv.supabase.co/functions/v1/admin-login \
  -H "apikey: YOUR_ANON_KEY" -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" -d '{"username":"x","password":"y"}'
```
   404 `NOT_FOUND` = not deployed. 500 "not configured" = secrets missing. 401 = function is working.
4. Open browser DevTools → Network tab, click Login, and look at the `admin-login` request for the exact failure.
