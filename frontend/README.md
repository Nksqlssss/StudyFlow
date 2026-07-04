# StudyFlow

StudyFlow is a local-first study planner for managing subjects, assignments, deadlines, priorities, and progress.

The app is built as a pre-backend v1.0 UI: all data is stored in the browser through `localStorage`.

## Features

- Create, edit, and delete subjects
- Create, edit, complete, reopen, and delete assignments
- Assignment detail page with deadline, status, priority, and description
- Subject progress based on completed assignments
- Active, completed, and overdue assignment tabs
- Urgent deadline highlighting with a configurable threshold
- Optional completed assignments inside the active list
- Responsive layout for phones, tablets, laptops, and desktops
- Bottom tabbar on mobile and left sidebar on larger screens
- Dark and light themes
- Comfortable and compact card density
- Optional UI tips
- Settings page with appearance, task, data, and app info sections
- Clear all data or only assignments
- PDF import/export placeholders planned for v2.0.0
- Interface localization: Russian, English, and Polish

## Tech Stack

- SvelteKit
- Svelte 5 runes
- TypeScript
- Vite
- CSS variables for theming
- `localStorage` stores

## Project Structure

```text
src/
  lib/
    components/ui/        shared UI components
    i18n/                 translations and localization helpers
    stores/               subjects, tasks, settings stores
    types.ts              shared app types
  routes/
    +page.svelte          subjects overview
    profile/              profile placeholder
    schedule/             schedule placeholder
    setting/              settings page
    subject/
      new/                create subject
      [id]/               subject detail, edit, task routes
```

## Getting Started

```bash
npm install
npm run dev
```

## Available Scripts

```bash
npm run dev
npm run check
npm run build
npm run preview
```

## Data Storage

StudyFlow v1.0 stores data locally in the browser:

- `sf_subjects`
- `sf_tasks`
- `sf_settings`

Clearing browser storage will remove app data.

## Deployment Note

The project currently uses `@sveltejs/adapter-auto`. Before production deployment, choose the adapter required by the target platform if needed.

## Roadmap

Planned for later versions:

- Backend and database
- Authentication
- Profile page
- Schedule page
- Search and filtering improvements
- Full PDF export/import flow
