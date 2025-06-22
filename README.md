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
6. Enable **Bento Mode** from the popup to switch the sidebar to a colorful grid layout with animated backgrounds and subtle hover effects.
7. Open the extension **Options** from the menu or the Extensions page to set a default sidebar width and Review Mode.

## Sidebar features

- Optional **Light Mode** turns the sidebar black on white for a minimalist look with darker summary text, a black header with white lettering and a white Fennec icon.
- In Light Mode the header and tags always display white text so they remain readable against the black background.
- **Bento Mode** now uses a moving gradient backdrop and drop-shadowed boxes. Buttons and panels animate gently on hover for a polished feel.

### Gmail
- Adds a sidebar with **EMAIL SEARCH** and **OPEN ORDER** buttons.
- Extracts order number, sender email and name from the open email.
- The order number parser is tolerant to common formats (e.g. with `#`, parentheses or spaces).
- Displays a small order summary only after you click **EMAIL SEARCH** or
  **OPEN ORDER**, so old details no longer appear automatically.
- Clicking **EMAIL SEARCH** clears any previous order details and shows a
  blinking white Fennec icon while the new data loads.
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
- Review Mode can be enabled from the extension popup. When active a **DNA** button
  appears below **EMAIL SEARCH** and **OPEN ORDER**. Clicking it opens Adyen with
  the order number prefilled and automatically navigates to the payment details
  and shopper DNA pages, leaving both tabs open in the background. The **ORDER SUMMARY** box merges
  the Company section and the next box is the **QUICK SUMMARY**. On DB pages all
  sections remain but a small **REVIEW MODE** label shows at the bottom. The
  mode stays in sync across Gmail and DB.
- The DNA button shows a blinking Fennec below the Billing section while the
  Adyen pages load and information is retrieved.
- The Adyen helper waits for the DNA link to appear before opening it so slow
  pages still navigate correctly. Once both tabs finish loading, the extension
  extracts the payment method, card holder, last four digits of the card number,
  expiry date, funding source, issuer details, shopper IP, name, phone,
  billing address and processing data (CVC/CVV, AVS and fraud scoring). It also
  reads transaction totals such as Authorised, Refused and Chargebacked from the
  DNA page. All of this information is displayed in a new **ADYEN'S DNA** section
  of the Gmail sidebar.

### DB
- Displays a sidebar on order detail pages.
- Scrapes company, agent and officer data and presents it in a compact layout.
- Addresses are clickable to open a Google search and copy the text.
- The company purpose also opens a Google search. Addresses and the purpose text are only underlined on hover.
- Hides the agent subscription status line when RA service is not provided by Incfile.
- Provides a Quick Actions menu with **Emails** and **Cancel** options. **Emails** now opens a Gmail search for the order number, client email and name while **Cancel** resolves active issues and opens the cancellation dialog with the reason preselected.
- The Quick Actions icon now appears at the start of the header like in Gmail and the menu fades in and out.
- Review Mode can be toggled from the popup or configured as a default in the Options page.
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
- Click the **🩺 DIAGNOSE** button inside the Family Tree panel to run the
  diagnostic after the orders load.
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
- Fixed parent order detection on miscellaneous orders when the ID appears
  after a "Parent Order:" label. The floating Fennec icon now stays visible
  when opening the Family Tree panel.
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
- Searching SOS sites now uses the **activeTab** permission. Chrome will request access to the domain the first time you open one of these pages and then fill in the form automatically.
- The manifest declares optional permissions for all HTTPS sites so Chrome prompts for access when launching an SOS search and the tab opens correctly.
- Updated the West Virginia SOS link so searches work again.
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
- Resolved a crash in the DB sidebar that showed "Error loading summary" by defining the RA/VA tag classes.
- A separator line now appears between addresses and the RA/VA tags in the quick summary, and those tags are repeated at the bottom of the Company section. Fields showing `N/A` or blank values are omitted, and shareholders display their share count prefixed with "Shares:".
- Sections lacking meaningful details now show **NO INFO** instead of being hidden.
- The AGENT section now displays **NO RA INFO** when Registered Agent details are missing.
- Officer and Shareholder sections are omitted for LLC orders.
- Review Mode centers the order info with a clickable link to the order, removes the duplicate RA/VA tags from the Quick Summary and adds a new **CLIENT** box with the client ID, email, phone, order count and LTV. The client ID now links directly to the company page and the company count and LTV share a single line. This box is hidden unless Review Mode is active.
- The ORDER SUMMARY in Review Mode now displays the order type and whether it is **Expedited**, shows the company name and ID beneath the sender details and includes a **BILLING** section pulled from the DB page. The Client box lists any roles held within the company or a purple **NOT LISTED** tag.
- In Gmail Review Mode a **BILLING** box appears below the Client section using data from the DB billing tab.
- The Client box now lists the name first in bold, shows the client ID as a plain clickable link and combines the email and phone on a single line. The Billing box displays the cardholder first, then the card type, last four digits and expiration on one line and formats the address in two lines.
- The Gmail ORDER SUMMARY in Review Mode now begins with the company name as a bold clickable link, shows the state ID on the next line when available, then lists the order number with type and **Expedited** labels. Sender name and email are omitted.
- The Gmail order link now uses white text that only underlines on hover, and the order type and expedited status appear side by side as labels.
- The Gmail ORDER SUMMARY now shows the company name in white at the same size as the title, adds a copy icon to the state ID line and removes duplicate name, ID and address lines when merging DB details.
- The DB quick summary places RA/VA labels closer to the Registered Agent address.
- Gmail Review Mode removes the **COMPANY** heading in the order summary and
  trims blank agent fields. When no agent details are available the section shows
  **NO RA INFO**.
- Fixed blank lines after the RA/VA labels in Gmail Review Mode when the agent
  name was not detected. The AGENT section now shows **NO RA INFO**.
- Gmail Review Mode hides the **ORDER SUMMARY** heading and now merges the
  Quick Summary directly below it inside the same box to avoid extra spacing.
- Names in the Quick Summary now include **CLIENT** and **BILLING** tags when
  they appear in those sections.
- The Gmail sidebar displays a separator below the **DNA** button, the RA/VA labels
  are followed by a separator line, address labels in the Quick Summary appear on
  the next line, and the client email no longer merges with the phone number.
- RA/VA tags now show white text at 95% opacity, Quick Summary addresses are white,
  and expedited orders display a dark green label. The Billing section includes
  the AVS result and shows the full address in two lines. The sidebar label after
  the DNA button now reads **COMPANY:** instead of a separator line.

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
- Stored DB summaries now include the Quick Summary so Gmail Review Mode hides
  the other boxes correctly.
- Fixed the **DIAGNOSE** button being cut off when expanding the Family Tree
  panel by accounting for the box margin.

- Fixed the Family Tree panel not showing on first click by updating the max-height after adding the orders.
- Improved Family Tree reliability on non-formation orders by opening
  background tabs in the same window.
- Always creates the Family Tree container if missing so the panel toggles
  reliably.
- Fixed the Family Tree icon triggering **🩺 DIAGNOSE** on the first click.
- The diagnose overlay now only starts when the button inside the panel is
  pressed.
- Fixed Light Mode tags with black backgrounds showing black text.
- Version number updated to **v0.3** so the interface matches `manifest.json`.
  - Fixed Review Mode setting so Gmail and DB pages stay synchronized.
- Fixed popup Review Mode toggle to use sync storage so the DNA button appears after enabling the mode.
- Fixed DNA button not appearing in Gmail Review Mode by storing the setting locally.
- Fixed the DNA summary replacing the button in Gmail Review Mode so the button remains visible when no data is available.
- Escaped quotes in the background script so the service worker loads correctly.
  Buttons like **EMAIL SEARCH** and **OPEN ORDER** now open tabs again.
- Common helpers moved to `core/utils.js` and shared by Gmail and DB scripts.
- Improved parent order detection in the Family Tree view so miscellaneous
  orders load correctly.
- Further improved detection when the parent order link sits inside the
  company tab on SB non-formation orders.
- Fixed a crash showing "Error loading summary" when the DB sidebar looked up
  billing details.
- Fixed parent order detection when multiple sections contain "Parent Order" so
  the Family Tree icon works on SB pages.
- Fixed detection when the Parent Order information only appears in the `#vcompany` tab.
- Fixed detection when the Parent Order line sits within a paragraph or list item
  inside the `#vcomp` tab.
- Fixed detection when the Parent Order link only shows digits inside the
  `#vcomp` tab so the Family Tree icon opens correctly.
- Simplified parent order lookup to only search within the `#vcomp` tab.
- Fixed missing parent order on SB miscellaneous orders when the label is not
  inside a `.form-group` container.
- Added console logs to help trace parent order detection when the Family Tree
  icon is clicked.
- When the parent order cannot be detected the console lists all scanned
  elements with their text for easier debugging.
- The console now prints the text of any sibling elements inspected for digits
  when no parent ID is found.
- Fixed detection when the parent order number appears in a sibling element
  next to the label inside the `#vcomp` tab.
- Exposed the `getParentOrderId` and `diagnoseHoldOrders` helpers globally so the
  Family Tree icon works consistently.
- Fixed EMAIL SEARCH removing the DNA button by keeping the summary container
  intact while loading.
- The DNA summary now stays hidden until Adyen data is available and is
  displayed below the Billing section in Gmail Review Mode.

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

