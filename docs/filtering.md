# Filtering

HAR Helper provides four independent filtering mechanisms that work together to narrow down the visible HTTP entries in the request table. All filters are saved automatically to the database per archive.

---

## 1. Expression Editor

The Expression Editor is the most powerful filter. It supports a tree of conditions with `AND` / `OR` logic.

### Node Types

#### Text Search
Searches the text content of request/response data.

| Option | Values |
|--------|--------|
| Scope | All, Request, Response, URL |
| Part | All, Headers, Bodies |
| Mode | Contains (case-insensitive), Contains (case-sensitive), Regex |
| Highlight Only | When enabled, the row is highlighted but not filtered out |

Each text search node can be assigned a **color** for row highlighting in the table.

#### Property Filter
Filters by a specific field value.

| Field | Operators |
|-------|-----------|
| URL | contains, not contains, equals, starts with, ends with, regex |
| Method | equals, not equals |
| Status Code | equals, not equals, greater than, less than |
| MIME Type | contains, not contains, equals |
| Resource Type | equals, not equals |
| File Extension | equals, not equals |
| Domain | contains, not contains, equals |
| Response Size (bytes) | greater than, less than, equals |
| Response Time (ms) | greater than, less than, equals |
| Status Range | equals, not equals (values: 1xx, 2xx, 3xx, 4xx, 5xx) |

Property filters support an **Exclude** toggle to invert the match.

#### Group
Groups multiple conditions with `AND` or `OR` operator. Groups can be nested.

### Saving the Expression Tree

The expression tree has a separate **Save** button. Changes are marked as "dirty" until saved. You can also **Discard** unsaved changes.

### Collapsing the Editor

The expression editor can be collapsed to save screen space. The collapsed state is saved in global settings.

---

## 2. Quick Filters

Quick filters are one-click toggles to hide entries by **resource type** or **file extension**.

### Resource Types

| Key | Label |
|-----|-------|
| `document` | Document |
| `xhr` | Fetch/XHR |
| `script` | Script (JS) |
| `stylesheet` | Stylesheet (CSS) |
| `image` | Image |
| `font` | Font |
| `media` | Media |
| `websocket` | WebSocket |
| `manifest` | Manifest |
| `other` | Other |

### File Extensions

`.png`, `.jpg/.jpeg`, `.gif`, `.svg`, `.ico`, `.webp`, `.woff`, `.woff2`, `.ttf`, `.css`, `.js`, `.map`, `.json`

### Presets

- **🧹 Keep only Docs & XHR** — hides all resource types except `document` and `xhr`
- **🔄 Reset All** — clears all active quick filters

---

## 3. Tag Filters

Tag filters show only entries that have a specific content tag. When one or more tags are active, only entries matching **at least one** active tag are shown.

| Tag | Meaning |
|-----|---------|
| `html` | Response body is HTML |
| `resp-json` | Response body is JSON |
| `req-json` | Request body is JSON |
| `payload` | Request has a POST body |
| `query` | Request has query string parameters |
| `base64` | Request or response contains base64-encoded data |

---

## 4. Domain Filters

The domain filter panel lists all unique hostnames found in the current archive. Each domain can be **excluded** (hidden from the table) by clicking its toggle.

- **Reset** clears all domain exclusions
- Excluded domains are saved per archive

---

## Filter Evaluation Order

When determining if an entry is visible, filters are applied in this order:

1. Domain filter (excluded domains are hidden first)
2. Quick filters (resource type / extension)
3. Tag filters
4. Expression tree

An entry must pass **all** active filters to be visible.

---

## Sorting

The request table can be sorted by clicking any column header:

| Column | Sort Key |
|--------|----------|
| # | Original index |
| Method | HTTP method |
| Status | HTTP status code |
| Type | Resource type |
| Size | Response size in bytes |
| Time | Response time in ms |
| Tokens | Estimated token count |
| URL | Full request URL |

Clicking the same column toggles between ascending and descending order. Sort state is saved per archive.

---

## Related

- [Export](export.md) — filters affect which entries are included in the export
- [Copy Settings](copy-settings.md) — copy filters from one archive to another
