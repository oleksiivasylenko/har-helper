# Copy Settings Between Archives

When working with multiple HAR files from the same application, you often want to reuse the same filters and export settings. HAR Helper lets you copy settings from any existing archive to the currently active one.

---

## Opening the Copy Settings Dialog

The dialog opens automatically when you upload a new HAR file and other archives already exist.

You can also open it manually by clicking **📋 Copy Settings from Archive** in the sidebar (visible when an archive is selected).

---

## What Can Be Copied

| Setting | Description |
|---------|-------------|
| Filters | Expression tree, quick filters, tag filters, domain filters, sort state |
| Export Settings | All export options, header inclusion/exclusion settings |
| Noise Headers | Custom noise headers and built-in header toggles |

Each of these can be toggled independently in the dialog.

---

## Copy Modes (for Filters)

When copying filters, two modes are available:

### Replace
The target archive's filters are completely replaced with the source archive's filters.

### Merge
The source filters are merged into the target:
- Expression tree: replaced with source
- Quick filters: source values override target values (union)
- Tag filters: source values override target values (union)
- Domain filters: source values override target values (union)
- Sort: replaced with source

---

## Noise Headers Option

The **Copy noise headers** checkbox controls whether custom noise headers and built-in header toggles are included in the copy.

- When checked: noise settings from the source are applied to the target
- When unchecked: the target keeps its own noise settings

---

## Source Archive List

The dialog lists all archives that have saved filters or export settings, including **deleted archives** (shown with a `[deleted]` label). This allows reusing settings from archives that were removed.

Each source shows:
- Archive name
- Whether it has saved filters
- Whether it has saved export settings

---

## Related

- [Archives](archives.md) — managing HAR archives
- [Filtering](filtering.md) — the filters that can be copied
- [Export](export.md) — the export settings that can be copied
- [Noise Headers](noise-headers.md) — noise settings included in the copy
