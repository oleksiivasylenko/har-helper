# Request Inspector

The Request Inspector is a separate page (`/inspect.html`) that provides a detailed view of individual HTTP request/response pairs from a HAR archive.

---

## Opening the Inspector

Click any row in the request table to open the inspector for that entry. The inspector opens in a new browser tab or panel (depending on configuration).

The entry data is passed via URL parameters or `postMessage`, so the inspector always reflects the selected entry.

---

## Inspector Layout

The inspector displays the full details of a single HAR entry:

### Request Section

- **Method** and **URL**
- **Request Headers** — with noise suppression support
- **Query String Parameters** — listed as key/value pairs
- **Request Body** — displayed with syntax highlighting for JSON; raw text for other types

### Response Section

- **Status Code** and status text
- **Response Headers** — with noise suppression support
- **Response Body** — displayed with:
  - JSON syntax highlighting and formatting
  - HTML rendering (sanitized)
  - Plain text fallback
  - Base64 detection and decode attempt
  - Gzip decompression (via browser `DecompressionStream` API)

---

## Noise Header Suppression

The inspector respects the noise header settings of the archive. Noise headers are hidden by default.

A **Show Noise** toggle is available to reveal hidden headers inline without leaving the inspector.

The noise settings (custom headers, disabled built-ins, hide toggles) are loaded from the database for the current archive and can be modified directly from the inspector via the **Noise Manager** modal.

---

## Binary and Compressed Content

The inspector handles special content types:

| Content Type | Behavior |
|-------------|----------|
| `base64` encoding | Attempts to decode and display as text |
| Gzip compressed | Attempts to decompress using `DecompressionStream` |
| Binary MIME types | Shows a placeholder instead of raw binary data |
| JSON | Pretty-printed with syntax highlighting |
| HTML | Sanitized and rendered |

Binary MIME types that are not rendered: `image/*`, `audio/*`, `video/*`, `font/*`, `application/octet-stream`, `application/zip`, `application/pdf`, `application/wasm`, protobuf types.

---

## Entry Navigation

When the inspector is opened from the main table, it shows the selected entry. Navigation between entries (previous/next) may be available depending on how the inspector was opened.

---

## Resource Type Badge

Each entry shows a resource type badge (e.g., `xhr`, `document`, `script`) derived from the `_resourceType` field or inferred from the MIME type.

---

## Related

- [Filtering](filtering.md) — filter which entries appear in the table
- [Noise Headers](noise-headers.md) — configure which headers are hidden
- [Export](export.md) — export the filtered entries
