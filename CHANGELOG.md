# Changelog

## v0.3

- Fixed Bento Mode positioning so the sidebar displays correctly on Gmail and DB.
- Fixed Bento Mode layering so headers and boxes appear above the video background.
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
