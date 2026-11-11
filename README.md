# BEROS Crew Portal

Mobile-first web app where BEROS crew log monthly timesheet hours and claims, and the admin approves them before payout. The full product spec and database SQL are in [SPEC.md](SPEC.md).

Stack: Next.js (App Router, TypeScript) + Tailwind CSS, Supabase (Auth, Postgres, Storage), hosted on Vercel at https://crew.beros.online.

## Local development

```bash
cp .env.example .env.local   # fill in your Supabase URL and anon key
npm install
npm run dev
```

## Routes and guards

| Area | Paths | Who |
| --- | --- | --- |
| Public | `/login`, `/auth/callback`, `/auth/signout` | Anyone |
| Crew | `/home`, `/history`, `/payslips`, `/profile` | `crew.role = 'crew'`, status not `inactive` |
| Admin | `/admin/*` | `crew.role = 'admin'` and `status = 'active'` (same as `is_admin()`) |

- `src/middleware.ts` refreshes the Supabase session and sends signed-out visitors to `/login`.
- `src/lib/auth.ts` loads the signed-in user's `crew` row; the `(crew)` and `admin` layouts enforce the role.
- `/` redirects to the right area; users without a crew row, or deactivated ones, see `/no-access`.
- Row-level security in Supabase is the real boundary; the guards keep the UI in step with it.

## Supabase setup (once)

1. In the SQL editor, run the blocks from SPEC.md → "Supabase setup" in order: services/add-ons/bookings, the main crew script, booking assignments, then the policies block.
2. Authentication → Providers: enable Email and Google. Turn off open sign-ups.
3. Authentication → URL Configuration: Site URL `https://crew.beros.online`; add `https://crew.beros.online/auth/callback` (and `http://localhost:3000/auth/callback` for local dev) to Redirect URLs.
4. Sign up once with your own email, then make yourself admin:
   `update crew set role = 'admin', status = 'active' where email = '<your email>';`
