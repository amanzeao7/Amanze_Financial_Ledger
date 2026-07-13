# Ledger — Personal & Client Finance Tracker

Tracks your personal balance, freelance clients (compensation, notes, follow-ups),
recurring/standalone income and expenses with payment status, a tithe reserve,
and a 6-month cash flow chart.

This is the personal/client-work half. NMH brand finances and inventory live in
a separate app — see the `nmh-brand-tracker` project.

Built with **Vite + React**, data stored in **Supabase** (free tier), deployable
free on **Vercel**. Total running cost: £0/month at this scale.

---

## 1. Create your Supabase project (5 min)

1. Go to [supabase.com](https://supabase.com) → sign up (free) → **New project**.
2. Pick a name, a strong database password (save it somewhere), and a region close to you (e.g. London/EU West).
3. Wait ~2 minutes for it to provision.

### Create the data table

In your Supabase project, go to **SQL Editor** → **New query**, paste this, and run it:

```sql
create table finance_data (
  user_id uuid references auth.users(id) on delete cascade primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table finance_data enable row level security;

create policy "Users can view own data"
  on finance_data for select
  using (auth.uid() = user_id);

create policy "Users can insert own data"
  on finance_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update own data"
  on finance_data for update
  using (auth.uid() = user_id);
```

This creates one row per signed-in user holding all their data as JSON, and locks
it down so nobody can read or write anyone else's row.

### Turn on email sign-in

Supabase has this on by default. Go to **Authentication → Providers** and confirm
**Email** is enabled. This app uses passwordless "magic link" sign-in — you enter
your email, get a link, click it, you're in.

**Important for local dev:** go to **Authentication → URL Configuration** and add
`http://localhost:5173` to **Redirect URLs** (keep the existing entries too). Once
you deploy, add your live URL here as well (step 3).

### Get your API keys

Go to **Project Settings → API**. You'll need:
- **Project URL** (looks like `https://xxxxx.supabase.co`)
- **anon public** key (a long string starting with `eyJ...`)

---

## 2. Run it locally

```bash
cd finance-tracker
npm install
cp .env.example .env
```

Open `.env` and paste in your Project URL and anon key from above:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Then:

```bash
npm run dev
```

Open the URL it gives you (usually `http://localhost:5173`), enter your email,
check your inbox for the magic link, click it, and you're in. Your data now
syncs to Supabase instead of living in one browser.

---

## 3. Deploy for free (Vercel)

1. Push this folder to a new GitHub repo (private is fine — it's just for you).
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<you>/finance-tracker.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) → sign up with GitHub (free) → **Add New → Project** → import the repo.
3. Vercel auto-detects Vite. Before deploying, add environment variables (**Settings → Environment Variables**, or during import):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**. You'll get a URL like `finance-tracker-yourname.vercel.app`.

### Finish the auth setup

Back in Supabase → **Authentication → URL Configuration**, add your new Vercel
URL to **Redirect URLs** (e.g. `https://finance-tracker-yourname.vercel.app`).
Also set it as the **Site URL**. Without this, the magic link will redirect
back to localhost instead of your live app.

That's it — visit your Vercel URL on your phone or laptop, sign in with the
same email, and you'll see the same data on both.

---

## Notes

- **Free tier limits:** Supabase free tier gives you 500MB database and 50,000
  monthly active users — miles more than you'll ever need for personal use.
  Vercel's free tier is unlimited for personal projects like this.
- **Backups:** your data lives in Supabase's Postgres database. You can export
  it any time from **Table Editor → finance_data → Export**.
- **Multiple people:** if you ever wanted to add a login for someone else
  (e.g. an accountant), the row-level security means each signed-in user only
  ever sees their own data automatically — no extra work needed.
- **Costs to watch:** this stays free unless you go well beyond personal-use
  traffic/storage. Supabase and Vercel will email you before anything would
  ever charge.
