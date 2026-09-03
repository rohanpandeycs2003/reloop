# ReLoop ♻️

**Drop cans. Earn GreenCoins. Unlock rewards.**

ReLoop is a full-stack recycling rewards platform that turns everyday aluminium-can recycling into an instant, gamified reward loop — built for both individual users and businesses, with dedicated apps for the people who collect and verify the recycling.

---

## 🧩 The Problem

Recycling in most cities has zero immediate incentive. People *know* they should recycle, but:

- There's no instant reward for the effort — cans just go in the trash.
- There's no simple way to find a nearby drop point.
- Collectors/kabadiwalas and recyclers have no digital system to verify, track, or pay out for what they collect.
- Businesses have no easy way to track their recycling volume or get ESG/impact data out of it.

**ReLoop's idea:** make recycling feel like a game you get instantly rewarded for, while giving collectors and admins a real backend to verify and manage the whole pipeline — not just a UI mockup.

---

## 👥 Who it's for

| User | What they get |
|---|---|
| **Individual users** | Drop cans at a partner point, earn GreenCoins instantly, redeem for coffee, Blinkit credits, gym discounts, movie tickets, etc. |
| **Businesses** | Bulk recycling tracking across locations, ESG-style impact reports and analytics. |
| **Collectors** | A dedicated app to review incoming can drop-offs/pickups, verify weight & can count, and approve/reject them in real time. |
| **Admins** | A dashboard to manage users, collectors, drop points, and settlements across the whole system. |

---

## ✨ Core Features

- **GreenCoins reward engine** — every recycled can earns coins instantly, no scanning or manual approval delay for the user.
- **CO₂ impact tracking** — every user sees real-time kilograms of CO₂ saved, calculated only from *approved* recycling (not pending/rejected uploads).
- **Gamification** — unlockable badges (first drop, 7-day streak, 50/100/2000+ can milestones, city leaderboard, referrals), daily streaks, and monthly recycling challenges.
- **Referral system** — refer a friend, both of you earn GreenCoins.
- **Rewards marketplace** — redeem GreenCoins for real vouchers (coffee, delivery credits, gym, movies).
- **Drop points** — browse nearby recycling drop-off locations with accepted materials.
- **Collector workflow** — collectors log pickups by weight range (0–10kg, 10–30kg, 30–50kg, 50kg+) or can count, and approve/reject uploads with a reason.
- **Business accounts** — bulk recycling management and analytics separate from personal accounts.
- **Admin dashboard** — full visibility into users, collectors, pickups, and settlements.

---

## 🎯 How the reward math works

Reward logic lives in a single, unit-tested engine (`src/lib/greencoins.js`) — the frontend uses it for instant estimates, the backend validates and commits the real credit.

| Rule | Reward |
|---|---|
| Base rate | 15 GreenCoins / can |
| First upload ever | +100 bonus |
| Bulk upload (10+ cans in one go) | +40 bonus |
| 7-day streak | +50 bonus |
| Referral (referrer / new user) | +250 / +100 |
| Monthly challenge (100+ cans in a month) | +500 bonus |
| CO₂ saved | `approved cans × 0.1 kg` |

---

## 🏗️ Architecture

ReLoop ships as **three apps sharing one Supabase/Postgres backend**:

```
src/
├── App.jsx            → Consumer app (drop, earn, redeem, badges, referrals)
├── collector/          → Collector app (review & approve/reject pickups)
├── admin/               → Admin dashboard (users, collectors, drop points, settlements)
└── lib/
    ├── greencoins.js    → Reward + CO₂ calculation engine (unit-tested)
    └── supabase.js       → Supabase client
```

**Database (Supabase/Postgres)** — key tables:
`users`, `drop_points`, `collectors`, `uploads`, `greencoins_transactions`, `rewards`, `redemptions`, `challenges`, `challenge_progress`, `referrals`, `badges`, `user_badges`, `notifications`, `monthly_stats`, `pickups`, `settlements` — with proper enums for statuses (`upload_status`, `pickup_status`, `settlement_status`, `redemption_status`, `collector_status`) and generated columns (e.g. `co2_saved_kg` computed straight from `total_approved_cans`).

Users are auto-provisioned via Google OAuth through a Supabase Auth trigger, with a unique referral code generated per user.

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite |
| Backend / DB | Supabase (Auth + Postgres + API) |
| Database | PostgreSQL (custom schema, enums, generated columns, migrations) |
| Icons | lucide-react |
| Tooling | ESLint |
| Testing | Vitest-style unit tests for the reward engine |

---

## 🚀 Getting Started

```bash
git clone https://github.com/rohanpandeycs2003/reloop.git
cd reloop
npm install
npm run dev
```

Set up your Supabase project and run the SQL in `supabase/schema.sql`, followed by `supabase/migration_pickup_fields.sql` and `supabase/admin_setup.sql`.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

---

## 📄 Docs

- [`Reloop_Pitch_Deck.pptx`](Reloop_Pitch_Deck.pptx) — product pitch deck
- [`Reloop_API_Roadmap.pdf`](Reloop_API_Roadmap.pdf) — API roadmap

---

## 🌱 Vision

ReLoop's bet is simple: recycling participation goes up when the reward is instant, visible, and fun — not a vague "you're helping the planet" message. By pairing a gamified consumer experience with a real collector/admin backend, ReLoop is built to work as an actual operational recycling network, not just a rewards app.
