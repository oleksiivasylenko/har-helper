# Architecture

HAR Helper is a local full-stack web application. It runs entirely on your machine — no cloud services, no external APIs, no telemetry.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | [SolidJS](https://www.solidjs.com/) |
| Language | TypeScript (frontend), JavaScript (backend) |
| Build tool | [Vite](https://vitejs.dev/) |
| Backend | [Express.js](https://expressjs.com/) |
| Database | [sql.js](https://github.com/sql-js/sql.js) (SQLite in Node.js) |
| Styling | Plain CSS |

---

## Project Structure

```
har-helper/
├── server.js                    # Express server entry point
├── vite.config.ts               # Vite build configuration
├── package.json
├── index.html                   # Main app entry (SolidJS)
├── inspect.html                 # Inspector page entry
├── data/
│   └── har-helper.db            # SQLite database (auto-created)
├── src/
│   ├── client/
│   │   ├── main.tsx             # App bootstrap
│   │   ├── inspect.tsx          # Inspector bootstrap
│   │   ├── App.tsx              # Root component
│   │   ├── api/
│   │   │   └── client.ts        # API client (fetch wrappers)
│   │   ├── components/
│   │   │   ├── ArchiveSelector.tsx
│   │   │   ├── ExpressionEditor.tsx
│   │   │   ├── RequestTable.tsx
│   │   │   ├── RequestDetails.tsx
│   │   │   ├── QuickFilters.tsx
│   │   │   ├── TagFilters.tsx
│   │   │   ├── DomainFilters.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── InspectPage.tsx
│   │   │   └── modals/
│   │   │       ├── ExportSettingsModal.tsx
│   │   │       ├── CopySettingsModal.tsx
│   │   │       ├── NoiseManager.tsx
│   │   │       └── GlobalSettingsModal.tsx
│   │   ├── stores/
│   │   │   ├── archives.ts      # Archive state + API calls
│   │   │   ├── filters.ts       # Filter state + API calls
│   │   │   ├── exportSettings.ts
│   │   │   └── globalSettings.ts
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript interfaces
│   │   └── utils/
│   │       ├── harProcessor.ts  # All HAR processing logic
│   │       ├── download.ts      # File download helpers
│   │       └── constants.ts     # Shared constants
│   └── server/
│       ├── database/
│       │   ├── init.js          # DB init, sql.js setup
│       │   ├── users.js
│       │   ├── archives.js
│       │   ├── filters.js
│       │   ├── exportSettings.js
│       │   └── globalSettings.js
│       ├── middleware/
│       │   └── auth.js          # Token-based user resolution
│       └── routes/
│           ├── archives.js
│           ├── filters.js
│           ├── exportSettings.js
│           └── settings.js
└── docs/                        # This documentation
```

---

## API Routes

All routes are prefixed with `/api` and require the `X-Auth-Token` header.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/archives` | List all archives |
| GET | `/api/archives/:id` | Get archive metadata |
| GET | `/api/archives/:id/har` | Get archive HAR data |
| POST | `/api/archives` | Create archive |
| PUT | `/api/archives/:id` | Update archive |
| DELETE | `/api/archives/:id` | Delete archive |
| GET | `/api/filters/:archiveId` | Get filters for archive |
| PUT | `/api/filters/:archiveId` | Save filters |
| GET | `/api/filters/:archiveId/sources` | List copy sources |
| POST | `/api/filters/:archiveId/copy` | Copy filters from source |
| GET | `/api/export-settings/:archiveId` | Get export settings |
| PUT | `/api/export-settings/:archiveId` | Save export settings |
| POST | `/api/export-settings/:archiveId/copy` | Copy export settings |
| GET | `/api/settings/global` | Get global settings |
| PUT | `/api/settings/global` | Save global settings |

---

## Database Schema

The SQLite database (`data/har-helper.db`) contains these tables:

### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| token | TEXT UNIQUE | Auth token |
| created_at | TEXT | Timestamp |

### `archives`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| user_id | INTEGER FK | Owner user |
| name | TEXT | Display name |
| file_name | TEXT | Original file name |
| entry_count | INTEGER | Number of HAR entries |
| har_data | TEXT | Full HAR JSON |
| created_at | TEXT | Timestamp |

### `filters`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| user_id | INTEGER FK | Owner user |
| archive_id | INTEGER FK | Associated archive |
| archive_name | TEXT | Snapshot of archive name |
| expression_tree_json | TEXT | Expression tree JSON |
| quick_filters_json | TEXT | Quick filter state |
| tag_filters_json | TEXT | Tag filter state |
| domain_filters_json | TEXT | Domain exclusion state |
| user_noise_headers_json | TEXT | Custom noise headers |
| disabled_noise_headers_json | TEXT | Disabled built-in noise headers |
| sort_column | TEXT | Active sort column |
| sort_direction | TEXT | `asc` or `desc` |
| created_at / updated_at | TEXT | Timestamps |

### `export_settings`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| user_id | INTEGER FK | Owner user |
| archive_id | INTEGER FK | Associated archive |
| archive_name | TEXT | Snapshot of archive name |
| export_settings_json | TEXT | Full export settings JSON |
| created_at / updated_at | TEXT | Timestamps |

### `settings`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| user_id | INTEGER FK | Owner user |
| archive_id | INTEGER | NULL for global settings |
| settings_json | TEXT | Settings JSON |
| created_at / updated_at | TEXT | Timestamps |

---

## Authentication

HAR Helper uses a simple static token for single-user local use. The token `default-user-token-12345` is hardcoded in both the server and the client. It is not a security mechanism — it is only used to associate data with a user record in the database.

**This is intentional for a local single-user tool.** If you deploy this on a shared server, you should replace the token mechanism with proper authentication.

---

## Running in Development

```bash
npm install
npm run dev
```

This starts two processes concurrently:
- `node server.js` — Express API on port 3000
- `vite` — Dev server on port 5173 with proxy to port 3000

---

## Building for Production

```bash
npm run build
npm start
```

Vite builds the frontend into `dist/`. The Express server serves `dist/` as static files and handles all `/api` routes.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Express server port |

---

## HAR Processing

All HAR processing logic is in [`src/client/utils/harProcessor.ts`](../src/client/utils/harProcessor.ts). It runs entirely in the browser — no server-side processing of HAR content.

Key functions:
- `isEntryVisible()` — evaluates all filters against an entry
- `evaluateExpression()` — recursive expression tree evaluator
- `createFilteredHar()` — builds the export HAR with all transformations applied
- `createAiOptimizedText()` — builds the plain text AI export
- `estimateExportTokens()` — estimates token count for the current export configuration
