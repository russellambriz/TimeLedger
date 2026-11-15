# Hourwell

**Make time for what matters.**

A quiet, one-tap focus tracker for reading, homework, and deep work.

**Live:** https://russellambriz.github.io/TimeLedger/

## Use

- Tap **Focus** to start immediately in your last activity. Tap **Stop & save** to finish and save the session.
- Choose Reading, Homework, Deep Work, or a custom activity. Changing the activity while running relabels the entire current session.
- Today, this week, and this month accumulate automatically, including the running session.
- **Progress** shows daily, weekly, and monthly charts with activity breakdowns. Tap a daily bar or choose any date in the focus timeline to see when each session happened. Tap a session for its exact start, end, duration, and time zone. Overnight sessions appear on both days, counting only the time on each day.
- **History** lets you add, edit, or delete sessions. Manual entries cannot overlap saved sessions or a running timer.
- **History → Data** exports a JSON backup or CSV, or imports a JSON backup. Import replaces the device's ledger after confirmation.
- Install on the home screen for offline use after the first successful load. A running timer survives reloads and closing the app because its start timestamp is saved.

Days and months follow the device's local calendar; weeks start Monday. Sessions crossing midnight, month, or year boundaries are apportioned correctly. Changing devices' time zones changes the calendar grouping.

## Existing records

Previous records and running timers are retained. Original non-focus categories (Distraction, Phone/Social, Exercise, Sleep, Meditation, Health) remain in History but are excluded from focus progress. New custom activities count as focus. This app tracks time you intentionally record; it does not monitor or block other apps.

## Privacy and saving

Records stay in localStorage (`timeledger.v1`) on this browser/device; there is no account, server upload, or automatic cross-device sync. Export backups regularly: clearing browser data removes the ledger. Failed saves show a persistent warning and a retry action; changes are not presented as saved until storage succeeds.

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

## Cloud sync

[Open Hourwell Cloud](https://hourwell-focus-cloud.latterbag5.chatgpt.site/) and sign in with the same ChatGPT account on each device. The cloud version is currently private to the owner. It syncs completed sessions, subjects, exact timestamps, graphs, and the active timer.

The GitHub Pages version remains local-only. Use **Sign in to sync** on its Focus screen to export a JSON backup, then import it in the cloud version through the account menu. Finish any active local timer first. Import adds finished sessions without replacing existing cloud history. Use the cloud link for all future tracking.

Cloud source is retained in the hosted project's managed Git repository, project `appgprj_6af8bc79bad08191a80c2e01a3ead11d`. It uses authenticated account-scoped D1 records, atomic revision checks, idempotent operation receipts, and a persistent offline queue. Forty automated tests cover tracking, timestamps, concurrent edits, account isolation, lost replies, and offline recovery.

The Focus screen’s Sign in to sync button opens an in-app account panel. Continue with ChatGPT starts top-level authentication and returns to the hosted cloud version. Active local timers must be stopped before leaving. Existing local history can be exported from the same panel.
