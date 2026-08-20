# What to upload to GitHub

Upload the **contents** of the `kitchenscore` folder — not the folder itself. On
GitHub's "uploading an existing file" screen, select or drag in exactly these,
keeping the folder structure intact:

```
server.js
db.js
freshness.js
package.json
README.md
data/restaurants.json
data/reports.json
public/index.html
public/app.js
public/styles.css
```

That's all 10 files — everything in the `kitchenscore` folder. Nothing to leave
out.

## How to select them correctly

1. Open the unzipped `kitchenscore` folder on your computer.
2. Select everything inside it: `server.js`, `db.js`, `freshness.js`,
   `package.json`, `README.md`, the `data` folder, and the `public` folder.
   (On Windows: click the first item, then `Ctrl+A` to select all. On Mac:
   `Cmd+A`.)
3. Drag that whole selection into GitHub's upload box in one go. Modern
   browsers preserve the `data/` and `public/` folder structure when you drag
   folders in — you should end up with `data/restaurants.json`,
   `data/reports.json`, `public/index.html`, etc. showing as nested paths in
   the repo, not everything dumped flat into one folder.
4. If GitHub ever shows the files flattened (no `data/` or `public/` prefix),
   undo the upload and instead drag the `data` folder and `public` folder in
   as their own drag operations, one at a time — that forces GitHub to
   preserve them as subfolders.

## Do not upload

- The outer `kitchenscore` folder itself as one item (upload what's *inside*
  it, not the folder as a single entry)
- The `kitchenscore.zip` file — unzip it first, upload the extracted files
