# FENNEC (Prototype)

FENNEC is a small Chrome extension that injects a "copilot" style sidebar into
Gmail and the internal DB interface. It helps open related tabs and shows order
information scraped from the current page.

## Installation in Chrome

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (toggle in the top right).
4. Click **Load unpacked** and select the project folder. The sidebar will then
   be available when visiting supported pages.

## Sidebar features

### Gmail
- Adds a sidebar with **EMAIL SEARCH** and **OPEN ORDER** buttons.
- Extracts order number, sender email and name from the open email.
- The order number parser is tolerant to common formats (e.g. with `#`, parentheses or spaces).
- Displays a small order summary inside the sidebar.
- Opens Gmail search and the DB order page in new tabs when clicking the buttons.
- Uses `margin-right` to ensure Gmail navigation controls stay visible.
- The top header bar shifts left along with the main panels so account menus remain accessible.
- If you close the sidebar it will remain hidden until the tab is reloaded.
- When opening an order, the sidebar shows the **latest issue** from the DB page.
  A label indicates whether it is **active** (red) or **resolved** (green). If no
  issue is found, the box still appears with a link to the order. The script
  checks the hidden table inside the `#modalUpdateIssue` modal to support newer
  DB layouts. The issue lookup now tolerates trailing URL fragments so the link
  is shown even if the query fails. The parser now reads the issue timeline
  description so only the message text appears in Gmail. The sidebar now waits
  until the DB tab reports it has finished loading before requesting the issue,
  improving reliability on slow connections.
  Header rows in the hidden table are now skipped so issue details appear
  even when the modal hasn't been opened.

### DB
- Displays a sidebar on order detail pages.
- Scrapes company, agent and officer data and presents it in a compact layout.
- Addresses are clickable to open a Google search and copy the text.

## Known limitations

- The scripts rely on the browser DOM provided by Chrome. They are not meant to
  run under Node.js or outside the browser context.
- The extension currently supports only Gmail and DB order detail URLs.

## Development

This repository now includes a minimal `package.json` to simplify future testing and build automation. The `npm test` command prints manual testing steps:

```bash
npm test
```

This will display instructions for manually verifying the extension inside Chrome.

## Testing the example pages

The `examples/` folder contains HTML snapshots of DB order pages. When opened directly from disk they do not match the extension's host permissions, so the sidebar will not appear.

To view the sidebar with these pages you can either serve them as `db.incfile.com` or extend `manifest.json` for local URLs.

1. **Serve locally as `db.incfile.com`**. Map `db.incfile.com` to `127.0.0.1` in your hosts file and run a small web server inside `examples`:

    ```bash
    cd examples
    python3 -m http.server 8000
    ```

    Visit `http://db.incfile.com:8000/<file>.htm` to trigger the extension.

2. **Update `manifest.json`**. Add local file or localhost entries to `host_permissions`:

    ```json
    "file:///*",
    "http://localhost:8000/*"
    ```

    Reload the extension after editing the manifest.
