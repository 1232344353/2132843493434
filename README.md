## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create local environment variables:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Scripts

- `npm run dev` - Run local dev server
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run loadtest` - Run HTTP load test harness

## Production Operations

- P0 deployment checklist: `docs/production-p0-checklist.md`
- Incident response runbook: `docs/incident-runbook.md`
- SQL migration to run before heavy production use:
  - `scripts/migrations/2026-02-21_p0_production_hardening.sql`
