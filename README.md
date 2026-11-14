# TimeLedger

A quiet, one-tap focus tracker for reading, homework, and deep work.

**Live:** https://russellambriz.github.io/TimeLedger/

## Use

- Tap **Focus** to start immediately in your last activity. Tap **Stop & save** to finish and save the session.
- Choose Reading, Homework, Deep Work, or a custom activity. Changing the activity while running relabels the entire current session.
- Today, this week, and this month accumulate automatically, including the running session.
- **Progress** shows daily, weekly, and monthly charts with activity breakdowns.
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
