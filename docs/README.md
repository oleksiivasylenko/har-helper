# HAR Helper — Documentation

HAR Helper is a local Node.js tool for loading, filtering, inspecting, and exporting HTTP Archive (HAR) files. It is designed to help developers clean up and reduce HAR data before sharing it with AI assistants or for debugging purposes.

---

## Features at a Glance

| Feature | Description |
|---------|-------------|
| [Archive Management](archives.md) | Upload and manage multiple HAR files as named archives |
| [Filtering](filtering.md) | Filter requests by expression tree, quick filters, tags, and domains |
| [Export](export.md) | Export a filtered HAR file or AI-optimized plain text |
| [Noise Headers](noise-headers.md) | Hide or suppress noisy HTTP headers from view and export |
| [Copy Settings](copy-settings.md) | Copy filters and export settings between archives |
| [Request Inspector](inspect.md) | Inspect individual request/response details |
| [Architecture](architecture.md) | Tech stack, project structure, and local setup guide |

---

## Quick Start

### Requirements

- Node.js 18+
- npm

### Install & Run

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173` (Vite dev server) with the API backend at `http://localhost:3000`.

### Production Build

```bash
npm run build
npm start
```

The built app is served from `dist/` by the Express server at `http://localhost:3000`.

---

## Project Overview

HAR Helper is a **single-user local tool**. It stores all data in a local SQLite database (`data/har-helper.db`) using [sql.js](https://github.com/sql-js/sql.js). No external services, no cloud, no authentication required beyond a static local token.

The frontend is built with [SolidJS](https://www.solidjs.com/) and [TypeScript](https://www.typescriptlang.org/), bundled with [Vite](https://vitejs.dev/).

---

## Documentation Index

- [archives.md](archives.md) — HAR archive upload and management
- [filtering.md](filtering.md) — All filtering capabilities
- [export.md](export.md) — Export options and output formats
- [noise-headers.md](noise-headers.md) — Noise header management
- [copy-settings.md](copy-settings.md) — Copying settings between archives
- [inspect.md](inspect.md) — Request detail inspector page
- [architecture.md](architecture.md) — Technical architecture and setup
