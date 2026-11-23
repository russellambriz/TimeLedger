# Hourwell

**Make time for what matters.**

A quiet, one-tap focus tracker for reading, homework, and deep work.

**Live:** https://russellambriz.github.io/TimeLedger/

## Use

- Tap **Focus** to start immediately in your last activity. Tap **Stop & save** to finish and save the session.
- Choose Reading, Homework, Deep Work, or a custom activity. Changing the activity while running relabels the entire current session.
- Today, this week, and this month accumulate automatically, including the running session.
- **Progress** shows daily, weekly, and monthly charts with activity breakdowns. Tap a daily bar or choose any date in the focus timeline to see when each session happened. Tap a session for its exact start, end, duration, and time zone. Overnight sessions appear on both days, counting only the time on each day.
- **Sleep**: tap the moon at lights out and again when you wake. See last night, your 7-night average, a nightly goal (4–12 h, adjustable), and the last 7 nights against that goal. Add or fix a night you forgot to tap. If the timer runs over 16 hours, Hourwell asks you to check the wake time. Sleep is kept out of focus totals, and starting a focus session stops the sleep timer (and vice versa).
- **Caffeine**: tap a drink (coffee, espresso, cold brew, tea, matcha, energy drink, soda) or add a custom amount or earlier time. See today's total against an adjustable daily limit (default 400 mg), an estimate of what's still in your system now and at your usual bedtime (5-hour half-life; bedtime from your Sleep data, else 10:30 PM), today's drinks (tap to edit or delete), and the last 7 days. Estimates are general, not medical advice.
- **History** lets you add, edit, or delete sessions. Manual entries cannot overlap saved sessions or a running timer.
- **History → Data** exports a JSON backup or CSV, or imports a JSON backup. Import replaces the device's ledger after confirmation.
- Install on the home screen for offline use after the first successful load. A running timer survives reloads and closing the app because its start timestamp is saved.

Days and months follow the device's local calendar; weeks start Monday. Sessions crossing midnight, month, or year boundaries are apportioned correctly. Changing devices' time zones changes the calendar grouping.

## Existing records

Previous records and running timers are retained. Original non-focus categories (Distraction, Phone/Social, Exercise, Sleep, Meditation, Health) remain in History but are excluded from focus progress. New custom activities count as focus. This app tracks time you intentionally record; it does not monitor or block other apps.

## Privacy and saving

Records are always saved first in localStorage (`timeledger.v1`) on this browser/device, so Hourwell works offline. Failed saves show a persistent warning and a retry action; changes are not presented as saved until storage succeeds. Export backups any time from History → Data.

## Cloud sync

Tap **Sign in to sync** on the Focus screen, enter your email, and tap **Sign in** in the email you receive (open it on the device you are signing in). Sign in with the same email on each phone, tablet, or computer. Sessions, activities, and the running timer then stay in step across devices:

- Everything already on a device uploads automatically the first time it signs in.
- Changes save on the device first and sync in the background (within about a second online, live via Supabase Realtime, plus every 30 seconds and when the app reopens). Changes made offline upload later.
- Each session, activity, and the timer is synced as its own record; when two devices change the same record, the newest change wins. Deletions sync too.
- Signing out keeps the data on that device.
- **iPhone Home Screen app:** iPhone keeps a Home Screen app's storage separate from Safari, and email links always open in Safari. Sign in with the email link in Safari once, open **Sync → Save password**, then sign in inside the Home Screen app with **Password**.

Sync uses [Supabase](https://supabase.com) (free plan). Each account can only read and write its own records (row-level security). The publishable key in `src/lib/cloud.ts` is meant to be public.

### One-time Supabase setup

1. **SQL Editor → New query**: paste all of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
2. **Authentication → URL Configuration**: set **Site URL** to `https://russellambriz.github.io/TimeLedger/` and add the same address under **Redirect URLs**.

Supabase's built-in email sender allows only a few emails per hour, which is fine for personal use. (Optional: with custom SMTP you can add `{{ .Token }}` to the Magic Link template; the app also accepts a typed code.)

## Development

```bash
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Development: http://localhost:5173/TimeLedger/
Preview: http://localhost:4173/TimeLedger/

Pushes to `main` test, build, and deploy to GitHub Pages using `.github/workflows/deploy.yml`.

Hourwell was formerly called TimeLedger. The existing URL, installed-app identity, backup format, and storage key are retained so this branding update preserves saved sessions.
