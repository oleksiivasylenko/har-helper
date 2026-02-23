# Noise Headers

Noise headers are HTTP headers that are typically not useful for debugging or AI analysis — things like `accept-encoding`, `cache-control`, `user-agent`, etc. HAR Helper maintains a noise list and uses it to suppress these headers in the request detail view and in exports.

---

## Built-in Noise Headers

The following headers are built-in and treated as noise by default:

```
:authority, :method, :path, :scheme, :status
accept, accept-encoding, accept-language
age, cache-control, connection, content-encoding
content-length, date, etag, expect, expires
if-match, if-modified-since, if-none-match, if-range, if-unmodified-since
keep-alive, last-modified, pragma, range, referer
sec-ch-ua, sec-ch-ua-mobile, sec-ch-ua-platform
sec-fetch-dest, sec-fetch-mode, sec-fetch-site, sec-fetch-user
server, strict-transport-security, transfer-encoding
upgrade-insecure-requests, user-agent, vary, via
x-content-type-options, x-frame-options, x-powered-by, x-xss-protection
```

Built-in headers can be **individually disabled** (re-enabled) in the Noise Manager.

---

## Custom Noise Headers

You can add your own headers to the noise list. Custom headers are stored per archive in the export settings.

Examples of headers you might want to add:
- `x-request-id`
- `x-correlation-id`
- `x-trace-id`
- `x-forwarded-for`
- `x-amz-request-id`

---

## Noise Manager

Open the Noise Manager from:
- The **🔇 Noise Headers** button in the sidebar
- The **Manage Noise Headers** button inside the Export Settings modal

### In the Noise Manager you can:

1. **Search** headers by name
2. **Toggle built-in headers** on/off (unchecking disables the noise suppression for that header)
3. **Add custom headers** — type a header name and press Enter or click Add
4. **Remove custom headers** — click the × button next to a custom header

Changes are saved immediately to the database.

---

## Where Noise Suppression is Applied

### Request Detail View (Inspect Page)

When **Hide Noise** is enabled in the inspect view, noise headers are hidden from the request and response header tables. A toggle allows showing them inline.

### Export Settings Modal

The **Hide noise** checkbox in the Request Headers and Response Headers sections hides noise headers from the header selection list.

### Export Output

When exporting a filtered HAR or AI text:
- Noise headers are **removed** from the output by default
- Individual headers can be re-enabled by unchecking them in the Noise Manager

---

## Noise Header Scope

Noise headers are stored as part of the **export settings** for each archive. This means:

- Each archive has its own custom noise header list
- Built-in header toggles are also per-archive
- When copying settings between archives, noise headers can optionally be included or excluded from the copy

---

## Related

- [Export](export.md) — noise headers affect export output
- [Copy Settings](copy-settings.md) — noise headers can be copied between archives
- [Request Inspector](inspect.md) — noise headers are hidden in the detail view
