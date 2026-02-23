# Archive Management

HAR Helper stores uploaded HAR files as **archives** in a local SQLite database. Each archive holds the full HAR data along with its associated filters and export settings.

---

## Uploading a HAR File

1. Click **📁 Upload HAR File** in the sidebar, or drag and drop a `.har` file onto the upload area.
2. The file is parsed in the browser and sent to the local API.
3. The archive is created with the file name as its default name.
4. If other archives already exist, the **Copy Settings** dialog opens automatically so you can reuse filters from a previous archive.

Only `.har` files are accepted. The file must contain a valid `log.entries` array.

---

## Archive List

All uploaded archives are listed in the sidebar under **Archives**. Each item shows:

- Archive name
- Number of HTTP entries

Clicking an archive switches to it and loads its filters and export settings.

---

## Switching Archives

Clicking an archive in the list:
1. Sets it as the active archive
2. Loads its saved filters from the database
3. Loads its saved export settings from the database
4. Fetches the HAR data if not already in memory

The last selected archive is remembered in `localStorage` and restored on next page load.

---

## Deleting an Archive

Click the **×** button on an archive item. A confirmation dialog appears:

> Delete archive "name"? Settings will be preserved.

The HAR data is removed from the database. Filters and export settings linked to that archive are **preserved** and remain available as a source for copying to other archives.

---

## Data Storage

- HAR data is stored as JSON in the `archives` table of `data/har-helper.db`
- The database file is created automatically on first run
- All data is local — nothing is sent to any external service

---

## Related

- [Copy Settings](copy-settings.md) — reuse filters from one archive in another
- [Filtering](filtering.md) — filter the entries of the active archive
- [Export](export.md) — export a filtered version of the active archive
