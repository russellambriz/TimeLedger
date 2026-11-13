# TimeLedger

A private, one-tap timer for time spent on distractions, health habits, and the hours around them. Open the app and the start button is already there. One tap begins in the last category you used. One tap stops and saves the session.

**Live:** https://russellambriz.github.io/TimeLedger/

Days and weeks follow the clock on the device. Weeks start on Monday. Totals and charts split any session that crosses midnight or a week boundary, so an hour on each side of midnight counts on each day.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173/TimeLedger/

```bash
npm test
npm run build
npm run preview
```

The preview server uses the same `/TimeLedger/` base path as GitHub Pages: http://localhost:4173/TimeLedger/

## Use

- Tap the center button to start. The timer begins immediately. Distraction is selected the first time; after that it remembers the last category.
- The category name under the button changes the session, including while the timer is running.
- Tap the center button again to stop and save.
- Today and this week sit above the button. Insights charts the same numbers: stacked days for the selected week, and the last eight weeks.
- History lists every session. Add one by hand, or tap a row to edit or delete it.
- Data, on the History tab, exports a JSON backup (categories, sessions, and a running timer), exports CSV, or imports a JSON backup onto this device.
- Add TimeLedger to the home screen. After the first load it works offline.

Nothing is sent to a server. The ledger is stored in `localStorage` under `timeledger.v1`.

## Deploy

Pushes to `main` run `.github/workflows/deploy.yml`, which tests, builds, and publishes to GitHub Pages with the Actions workflow. The Vite `base` is `/TimeLedger/`.
