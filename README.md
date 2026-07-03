# StudyFlow

StudyFlow is a local-first study planner for managing subjects, assignments, deadlines, priorities, and progress.

The SvelteKit app lives in [`studyflow`](./studyflow).

## Highlights

- Subjects and assignments
- Assignment detail and edit pages
- Active, completed, and overdue tabs
- Configurable urgent deadline threshold
- Responsive mobile/tablet/desktop layout
- Dark and light themes
- Compact card mode
- Optional UI tips
- Local settings page
- Russian, English, and Polish interface translations
- Browser `localStorage` persistence

## Run Locally

```bash
cd studyflow
npm install
npm run dev
```

## Checks

```bash
cd studyflow
npm run check
npm run build
```

## Stack

- SvelteKit
- Svelte 5
- TypeScript
- Vite
- CSS variables
- localStorage stores

## Status

This is the pre-backend v1.0 UI. Data is stored locally in the browser. Backend, database, authentication, profile, schedule, search, and full PDF export/import are planned for later versions.
