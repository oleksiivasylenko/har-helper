# Export

HAR Helper can export a filtered and cleaned version of the active archive. The export respects all active filters and the export settings configured in the **Export Settings** modal.

---

## Opening Export Settings

Click **Create Filtered HAR** in the sidebar to open the Export Settings modal.

---

## Export Formats

### Filtered HAR

Downloads a `.har` file containing only the visible, selected entries with the configured transformations applied.

- File name: `filtered-HH-MM_<original-filename>.har`
- Format: standard HAR JSON

### AI-Optimized Text

Downloads a plain `.txt` file with a compact, human-readable representation of each request/response pair.

- File name: `ai-HH-MM_<original-filename>.txt`
- Format: plain text, one entry per block
- Designed to minimize token count when pasting into AI assistants

---

## Entry Selection

In the request table, each row has a checkbox. Deselected entries are excluded from the export even if they pass all filters.

The sidebar shows:
- **Export**: count of selected (non-deselected) visible entries
- **~N tokens**: estimated token count for the current export

---

## Export Settings Options

### Content Inclusion

| Option | Default | Description |
|--------|---------|-------------|
| Request Body | ✅ | Include POST/PUT body in export |
| Request Cookies | ✅ | Include `Cookie` header and cookies array |
| Response Body | ✅ | Include response content text |
| Response Cookies | ✅ | Include `Set-Cookie` header and cookies array |
| Timings | ✅ | Include HAR timing data |
| Server IP Address | ✅ | Include `serverIPAddress` field |
| Query String Params | ✅ | Include query string array and keep params in URL |
| Initiator Info | ✅ | Include `_initiator` field |

### Content Transformation

| Option | Default | Description |
|--------|---------|-------------|
| Minify HTML | ✅ | Strip styles, scripts, comments, and extra whitespace from HTML responses |
| Minify JSON | ✅ | Remove whitespace from JSON request/response bodies |
| Strip Base64 | ✅ | Replace base64 content with a size placeholder (e.g. `[base64-data: 42KB image/png]`) |
| Use Original Order | ✅ | Export entries in their original HAR order, ignoring current sort |

### Header Filtering

The **Request Headers** and **Response Headers** sections list all headers found in the archive. Each header can be individually included or excluded from the export.

- **Hide noise** toggle: hides headers marked as noise (see [Noise Headers](noise-headers.md))
- **All / None** buttons: select or deselect all visible headers at once
- **?** hover: shows the top 5 most common values for that header across all entries
- **+** button: adds the header to the noise list

---

## Per-Entry Response Exclusion

In the request table, each row has a **response exclude** toggle (in addition to the entry checkbox). When a response is excluded:

- Response headers are removed
- Response body is removed
- Response status code is preserved

This is useful for entries where you want to keep the request but not the (potentially large) response.

---

## Token Estimation

HAR Helper estimates the token count of the export using a simple heuristic: `ceil(characters / 4)`.

The estimate accounts for:
- Active filters and deselected entries
- Noise header suppression
- Base64 stripping
- HTML/JSON minification
- Response exclusions

The estimate is shown in the sidebar and in the Export Settings modal footer.

---

## Related

- [Filtering](filtering.md) — controls which entries are included
- [Noise Headers](noise-headers.md) — controls which headers are suppressed
- [Archives](archives.md) — select the archive to export from
