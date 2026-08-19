# VAT Dashboard Status Monitor — Next.js rewrite

Next.js (App Router) rewrite of the Flutter `monitor` / `dashboard-status` app.
Ported so far: project scaffold, auth (email/password + Google via Firebase,
JWT storage with 5-minute refresh buffer, matches `auth_repository.dart`),
responsive sidebar shell (matches `main_layout.dart` breakpoints). Remaining
pages are stubbed and will be ported domain-by-domain (dashboard, journals,
KPI, documents/approval, financial statements/tax/reports, settings).

## Setup

This project uses **pnpm** as the package manager (`packageManager` field is
pinned in `package.json`, so Corepack will auto-select the right version).

Install pnpm first if you don't have it (Windows):

```powershell
winget install -e --id pnpm.pnpm
```

or via npm:

```bash
npm install -g pnpm
```

Then:

```bash
pnpm install
cp .env.example .env.local   # fill in Firebase web config + API base URL
pnpm dev
```

`.env.local` needs:
- `NEXT_PUBLIC_API_BASE_URL` — `https://api.dedepos.com` (prod) or `https://api.dev.dedepos.com` (dev), same as the Flutter app's `--dart-define=BASE_URL`.
- `NEXT_PUBLIC_FIREBASE_*` — from Firebase Console → Project Settings → General → Web app, for the `account-seaandhill` / `account-seaandhill-dev` project.

### Employee names in Firestore

Employee display-name mappings are shared through the Firestore document
`settings/employeeMappings`. Before deploying:

1. Create a Firestore database for the configured Firebase project.
2. Enable **Authentication > Sign-in method > Anonymous**. Password login is
   handled by the existing backend JWT, so the anonymous Firebase session is
   used only to protect Firestore access. Google login continues to use its
   Firebase user.
3. Deploy the included rules with `firebase deploy --only firestore:rules`.

On the first authenticated visit, mappings stored by an older build under the
same web origin are merged into Firestore. Existing cloud values win if the
same employee has already been renamed elsewhere. Because browsers isolate
localStorage by origin, data from an old domain can only be migrated by
deploying this build on that old domain once and visiting it before moving to
the new domain.

## Notes

- This project was scaffolded inside a memory-constrained sandbox (~900MB RAM,
  2 vCPU), so a full dependency install + `next build` (production build,
  which runs SWC minification) could not be verified end-to-end there for the
  complete package set — installs of large packages like `firebase` and a
  full `pnpm install`/`npm run build` pass repeatedly hit CPU/memory limits
  (`SIGBUS` from the build worker, stalled resolution). What *was* verified
  there: `tsc --noEmit` passes clean with zero type errors, and an equivalent
  npm install of the full dependency set (451 packages) completed and
  type-checked successfully — so the dependency versions in `package.json`
  are known-good. There is no committed lockfile; running `pnpm install`
  locally (normal hardware, no sandbox constraints) will generate
  `pnpm-lock.yaml` in well under a minute.
- Please run `pnpm install && pnpm build` locally once to confirm before
  deploying.
