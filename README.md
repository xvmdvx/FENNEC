# FENNEC (v0.3)

FENNEC is a small Chrome extension that injects a "copilot" style sidebar into
Gmail and the internal DB interface. It helps open related tabs and shows order
information scraped from the current page.

## Installation in Chrome

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (toggle in the top right).
4. Click **Load unpacked** and select the project folder. The sidebar will then
   be available when visiting supported pages.
5. Use the extension popup to enable **Light Mode** for a minimalist black and white style. Summary text is solid black with medium gray borders, the header shows white text on a black bar and the Fennec icon appears inverted.
6. Enable **Bento Mode** from the popup to switch the sidebar to a colorful grid layout. The video background now plays at 0.2x speed and reverses when it reaches the end, creating a smooth loop.
7. Open the extension **Options** from the menu or the Extensions page to set a default sidebar width and Review Mode.

## Features

- Sidebar appears on Gmail and DB order pages.
- Quick buttons open Gmail searches and order pages.
- Light Mode offers a minimalist look.
- Bento Mode uses a holographic video background that plays at 0.2x speed and reverses at each end.
  The FENNEC header and all summary boxes appear above the video in black containers with 95% opacity and
  white text.
- Family Tree panel shows related orders and can diagnose holds.
- Review Mode merges order details and fetches Adyen DNA data.
- The DNA summary is inserted below the Billing section once data is available.
- A Refresh button updates information without reloading the page.

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of bug fixes.
## Known limitations

- The scripts rely on the browser DOM provided by Chrome. They are not meant to
  run under Node.js or outside the browser context.
- The extension currently supports Gmail plus DB order detail and storage URLs.

## Reference dictionary

A small [dictionary.txt](dictionary.txt) file explains the abbreviations and shorthand terms used throughout the extension, such as **DB**, **SB**, **MAIN**, **MISC** and **REVIEW MODE**.


## Development

This repository now includes a minimal `package.json` to simplify future testing and build automation. The `npm test` command prints manual testing steps:

```bash
npm test
```

This will display instructions for manually verifying the extension inside Chrome.

### Manual testing

For a complete checklist see [manual-test.js](manual-test.js). Running `npm test` prints these steps to the console.


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

## Troubleshooting the Adyen DNA summary

If the DNA button opens the Adyen pages but the sidebar never shows the
**ADYEN'S DNA** section, use the browser console to trace what is happening.

1. Enable **Review Mode** from the extension popup so the DNA button appears.
2. Click **🧬 DNA** on a Gmail message. Two Adyen tabs should open.
3. In each Adyen tab press <kbd>F12</kbd> and check the **Console** for messages
   starting with `[FENNEC Adyen]`. They indicate when the script fills the search
   form, opens the most recent transaction, and extracts data from the payment
   and DNA pages.
4. After "DNA stats stored" appears, return to Gmail and click **REFRESH** in the
   sidebar. Open the console there and look for `[Copilot]` messages.
   "DNA data found" means the information was read correctly. If you see
   "No DNA data available", the Adyen pages may not have loaded fully.
5. You can inspect the sample pages under `examples/ADYEN_*` to compare the HTML
   structure expected by the scripts.


## Development notes

The `manual-test.js` script prints a checklist for manually verifying the extension. Terms used across this project are defined in `dictionary.txt`. When adding new features, update this README so the documentation stays current.

