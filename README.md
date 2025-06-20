# FENNEC (v0.2)

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

## Sidebar features

- Optional **Light Mode** turns the sidebar black on white for a minimalist look with darker summary text, a black header with white lettering and a white Fennec icon.
- In this mode the header and tags now always display white text so they remain readable against the black background.

### Gmail
- Adds a sidebar with **EMAIL SEARCH** and **OPEN ORDER** buttons.
- Extracts order number, sender email and name from the open email.
- The order number parser is tolerant to common formats (e.g. with `#`, parentheses or spaces).
- Displays a small order summary only after you click **EMAIL SEARCH** or
  **OPEN ORDER**, so old details no longer appear automatically.
- Opens Gmail search and the DB order page in new tabs when clicking the buttons.
- Uses `margin-right` to ensure Gmail navigation controls stay visible.
- The top header bar shifts left along with the main panels so account menus remain accessible.
- If you close the sidebar it will remain hidden until the tab is reloaded.
- The **OPEN ORDER** button keeps working if you close and reopen the sidebar.
- The Gmail script now runs in all frames so the sidebar appears even when the
  interface is embedded in nested iframes.
- The DB script also runs in all frames so the Family Tree icon works when the
  order page is loaded inside an iframe.
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
  even when the modal hasn't been opened. Issue detection now retries longer
  using exponential backoff and logs a warning if it ultimately times out. Tab
  lookups are handled by the background script to comply with MV3 content
  script restrictions.
- The Issue summary box now appears after the order and DB summaries.
- The sidebar now displays the latest company data pulled from the DB
  sidebar (Company, Agent, Members/Directors, Shareholders, Officers and
  Amendment Details) right below the **ORDER SUMMARY** section.
- Numbered requirements in the Issue text are shown on separate lines for clarity.
- While the Issue section loads, a small blinking Fennec icon is shown.
- A **REFRESH** button at the end of the sidebar content reloads the data.
 - Closing the sidebar leaves a floating Fennec icon in the upper right corner to reopen it. Reopening refreshes the sidebar with the current email.
- The action buttons sit side by side and the old Potential Intel box has
  been removed.
- The **EMAIL SEARCH** and **OPEN ORDER** buttons are now smaller so they
  never exceed the sidebar width, and their default color is a softer black.
- The hamburger icon in the header now opens a small menu with a **Review Mode**
  toggle. When active an **XRAY** button appears next to **EMAIL SEARCH** and
  **OPEN ORDER**. The **ORDER SUMMARY** box merges the Company section and the
  following box is the **QUICK SUMMARY**. On DB pages all sections remain but a
  small **REVIEW MODE** label shows at the bottom.

### DB
- Displays a sidebar on order detail pages.
- Scrapes company, agent and officer data and presents it in a compact layout.
- Addresses are clickable to open a Google search and copy the text.
- The company purpose also opens a Google search. Addresses and the purpose text are only underlined on hover.
- Hides the agent subscription status line when RA service is not provided by Incfile.
- Provides a Quick Actions menu with **Emails** and **Cancel** options. **Emails** now opens a Gmail search for the order number, client email and name while **Cancel** resolves active issues and opens the cancellation dialog with the reason preselected.
- The Quick Actions icon now appears at the start of the header like in Gmail and the menu fades in and out.
- A **REFRESH** button at the end of the summary reloads the data.
 - Closing the sidebar leaves a floating Fennec icon in the upper right corner to reopen it. Reopening refreshes the sidebar with the current order.
- Cancel automation now detects the "Cancel / Refund" link even when spaces surround the slash.
- The Cancel quick action resumes automatically after the page refreshes when resolving an issue.
- Officer tags in the quick summary now show specific roles like
  **PRESIDENT**, **SECRETARY**, **TREASURER** or **VP** instead of a generic
  OFFICER label.
- Order summaries now display the State ID when available along with formation
  state and include a tree icon next to the SUMMARY heading that toggles a compact
  view of the parent order and its latest child orders. Each entry now shows order number,
  type, date and status, and clicking a number opens that order in a background
  tab.
- The family tree icon also appears on Annual Report, Foreign Qualification,
  Virtual Address and Registered Agent orders.
- Beneath the tree list there is an **🩺 DIAGNOSE** button that opens each HOLD
  child order in a temporary tab, gathers the latest issue or hold user and
  then closes the tab. A centered floating summary appears on the parent order
  with a clickable order number, the colored status tag and the retrieved text.
- The diagnose overlay now shows immediately with a loading message and updates
  each card as soon as the details are fetched.
- Diagnose cards now display the order number in bold on the first line, followed
  by tags for the status and order type. A red **CANCEL** tag below the issue
  text starts the cancel procedure when clicked.
- Triple-clicking the family tree icon opens the panel and automatically runs
  **🩺 DIAGNOSE** once the list of orders loads.
- The family tree panel now slides open with the same animation as the Quick
  Summary and is positioned directly below it. Status labels are color coded
  (green for **SHIPPED**, **REVIEW** or **PROCESSING**, red for **CANCELED**, purple
  for **HOLD**) and the button reads **🩺 DIAGNOSE**.
- Fixed an issue where the tree panel sometimes failed to appear when clicking the icon.
- Fixed detection of the parent order so the tree icon functions on all
  non-formation orders.
- Fixed missing summary container so the tree icon now opens the parent
  overview on Annual Report, Foreign Qualification, Certificate of Good
  Standing, Reinstatement, Dissolution and Virtual Address orders.
- Works on DB sandbox subdomains by building links from the current origin.
- Fixed diagnose summary not appearing on sandbox subdomains by using the
  current origin when checking child orders.
- The sidebar also remains visible on document storage pages, reusing the last
  order summary.
- The company name (and State ID when present) links to the state's SOS business
  search page. Clicking either now opens the search form, fills in the value and
  automatically runs the query.
- A light gray copy icon next to the Company name and State ID copies the value
  to the clipboard.
- Clicking the state name now opens the Filing Department knowledge base in a new
  tab and navigates automatically to the matching article for that order type.
- The order type label sent to the knowledge base now maps formation packages to
  **Main Orders** and amendments to **Amendments**.
- Order type detection now recognizes Business Formation packages, Foreign
  Qualification, Amendments, Registered Agent Change and Annual Report (including
  alternate names like Business Entity Report, Biennial Report or Renewal).
- Host permissions for every SOS search site are included so the query can be
  injected automatically when those pages open.
- Updated the West Virginia SOS link and host permission so searches work again.
- Amendment summaries now include an **Amendment Details** section. Addresses in
  this area are clickable with a USPS lookup icon, and names throughout the
  summary now copy to the clipboard when clicked.
- When a line mixes description text with an address after a colon, only the
  address portion is turned into a link so the preceding text remains plain.
- Partial addresses lacking a state or ZIP code now appear in **bold** and link
  to a Google search instead of showing the USPS icon.
- Address detection recognizes abbreviations like "Fls" or "Bit" and street
  numbers with trailing letters (e.g. `22Y`).
- Street addresses with two lines now appear across three lines to keep the city
  and state separate. Addresses with only one street line are shown on two
  lines.
- Unknown order types now fall back to the standard formation view.
- Fixed a bug that prevented the sidebar from appearing on order pages.
- Resolved a `ReferenceError` in the DB sidebar by defining `SOS_URLS` at
  the top level.
- Fixed a crash when parsing amendment details containing addresses with
  periods, so the sidebar no longer hangs on "Cargando resumen".
- Resolved an error on amendment orders that showed "Error loading summary"
  by falling back to `textContent` when detecting the order type.
- Replaced multiple `innerText` reads with a `getText` helper that falls back
  to `textContent`, preventing "Error loading summary" on pages where those
  properties differ.
- Fixed a `ReferenceError` when loading amendment summaries by defining
  state abbreviation lists before they are used.
- Fixed missing padding when previewing attachments in Gmail so documents
  remain fully visible.
- Fixed a crash when the **Refresh** button listener failed to attach on some DB pages.
- Stored DB summaries now include the order number so the sidebar on storage pages only displays matching data.
- A separator line now appears between addresses and the RA/VA tags in the quick summary, and those tags are repeated at the bottom of the Company section. Fields showing `N/A` or blank values are omitted, and shareholders display their share count prefixed with "Shares:".
- Sections lacking meaningful details now show **NO INFO** instead of being hidden.
- Officer and Shareholder sections are omitted for LLC orders.

## Known limitations

- The scripts rely on the browser DOM provided by Chrome. They are not meant to
  run under Node.js or outside the browser context.
- The extension currently supports Gmail plus DB order detail and storage URLs.

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

### Bug fixes

- Fixed a race condition where the "Family Tree" view failed to load if the
  background script queried the page before helper functions finished
  initializing.
- Fixed a `ReferenceError` when opening the Filing Department knowledge base by
  properly passing the selected state and order type to the injected script.
- Fixed sidebar layering so the DB "View all / Add Issue" modal is not
  obscured.
- Fixed diagnose overlay crash when the `escapeHtml` helper was missing by
  building the floating cards using DOM methods.
- Fixed issue lookup failing on Gmail when DB was open on a sandbox domain by
  only overriding the base URL when the sender tab belongs to `incfile.com`.
- Fixed stored DB summaries so links and copy icons work correctly on document
  pages by reattaching the sidebar listeners.
- Fixed the **DIAGNOSE** button being cut off when expanding the Family Tree
  panel by accounting for the box margin.

- Fixed the Family Tree panel not showing on first click by updating the max-height after adding the orders.
- Improved Family Tree reliability on non-formation orders by opening
  background tabs in the same window.
- Always creates the Family Tree container if missing so the panel toggles
  reliably.
