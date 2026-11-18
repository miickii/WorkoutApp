# RepTrack Mom

A separate, no-sign-in, offline full-body workout app. Choose today's exercises from 27 illustrated movements, then start one workout. There are no splits or workout rotations.

## Everyday use

- Select exercises on Home; your previous session's selection is offered next time.
- Enter working weights (decimal dot or comma); changing a weight updates every set for that exercise and remembers it for next time. History corrections only affect that recorded session.
- Finish workouts, then open History to correct sets or delete a workout with confirmation and Undo.
- Farmer walk is logged in seconds. Other exercises use repetitions. Three sets and target ranges are editable defaults.
- Open Settings to customize exercises, choose units/rest timing, and export or restore JSON backups.
- Install in Safari using Share → Add to Home Screen. Open online once before using offline.

The database (`reptrack-mom`), backup identity (`RepTrack Mom`), and PWA scope are independent from the original RepTrack. All data remains on the device. Export backups regularly.

Exercise names retain the supplied Danish wording. See ASSETS.md for illustrations and the interpretation of Rumænsk splitsquat.

## Development

Use Node 24:

```sh
npm ci
npm test
npm run dev
```

Production and browser tests for GitHub Pages:

```sh
VITE_BASE_PATH=/WorkoutApp/ npm run build
npx playwright install chromium webkit
VITE_BASE_PATH=/WorkoutApp/ npm run test:e2e
```

## Hosting

Repository: https://github.com/miickii/WorkoutApp

GitHub Pages source must be GitHub Actions. Pushing main triggers `.github/workflows/deploy-pages.yml`; it installs dependencies, runs unit tests, builds with the configured Pages base path, and publishes the static app. No server or login is required.

## Validation

Three unit tests and four browser scenarios across Chromium/WebKit cover all 27 image assets, data isolation, selection, decimal weights, offline recovery, history corrections/deletion/undo, backup export and scoped manifest. A local rendered picker was inspected. Installation and device restart on a physical iPhone still need a device check.
