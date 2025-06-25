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
- Family Tree panel shows related orders and can diagnose holds, including amendment orders in review.
- Diagnose overlay now shows a black text Comment Box prefilled with **AR COMPLETED** and the current order number. Cards are 1.5× wider and pressing **RESOLVE AND COMMENT** opens the child order, marks the issue resolved and adds that comment to the order.
- Review Mode merges order details and fetches Adyen DNA data.
- The DNA summary now appears two lines below the XRAY button.
- The DNA summary resets when opening a new Gmail tab.
- Fixed the DNA summary disappearing after a few seconds in Gmail by only
  clearing the stored data once per tab.
- Card holder name now appears in bold followed by concise card details for easier reading.
- Network transactions from the DNA page appear in the summary.
- Transactions now display in a table with colored tags for each type.
- CVV, AVS and card match tags now appear on one line beneath the billing address.
- CVV and AVS tags use the normal font size with green labels for matches,
  purple for partial or no matches and black for unknown results.
- CVV results show **MATCH**, **NO MATCH** or **UNKNOWN**. AVS displays **MATCH**, **PARTIAL (ZIP✖️)**, **PARTIAL (STREET✖️)**, **NO MATCH** or **UNKNOWN** based on the Adyen codes.
- Expiry date shows as **MM/YY** and the bank line text is 1px smaller.
- Light gray labels in Light Mode now keep black text for readability.
- Adyen DNA labels use a light gray tag with black text in Review Mode.
- The "Total" label in DNA transaction tables now uses the light gray tag.
- Refund and cancel totals show a black tag labeled **REFUNDED**.
- REFUSED totals now use a purple tag instead of red.
 - DNA pages open in front and focus returns to the original email tab after transactions load.
 - A CARD label under CVV and AVS compares DB card details with the Adyen card information and displays **DB: MATCH**, **DB: PARTIAL** or **DB: NO MATCH**.
- A Refresh button updates information without reloading the page.
- A Clear Tabs icon closes all other tabs in the current window.
- DB sidebar formation orders now show a **FILING XRAY** button below the last section.
- Classic Mode now displays only the **SEARCH** button in the Gmail sidebar.
- When Review Mode is enabled a **🩻 XRAY** button runs **SEARCH** and then **DNA** automatically. The **OPEN ORDER** button is hidden. The **SEARCH**, **DNA** and **XRAY** buttons now share one row.
- CODA Search menu item queries the knowledge base using the Coda API.
- Clicking the state in the DB sidebar now opens the Coda Knowledge Base in a popup window covering about 70% of the page.
- Edit `environments/db/db_launcher.js` to provide your Coda API token and the
  Coda doc ID. Generate a new token in Coda and replace the value after
  `Bearer` if searches return "No results". Set the doc ID without the leading
  `d` (for example `QJWsDF3UZ6`).
- CODA Search now logs the query and API status in the console. Look for
  `[Copilot] CODA search` messages to confirm access.
- When the API request fails the results panel shows the status code and
  message so you know if the document ID is invalid or the token needs to be
  updated.
- Email and phone are shown separately in the Client section.
- Billing address shows the full street line followed by city, state, zip and
  country. The address remains clickable and includes USPS verification.

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

