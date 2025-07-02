# Changelog

## Unreleased

- The payment step logs the dropdown selector and value before clicking **Continue** so you can confirm **Client Account** is selected.
- Diagnose overlay now supports Reinstatement orders and detects amendments or reinstatements in review.
- Replaced `form.submit()` fallback with a submit event to mimic real clicks.
- Added a brief delay after selecting the payment type so the page registers **Client Account** reliably.
- Fixed the Mistral chat box disappearing after loading the order summary.
- The Mistral Box now sends prompts to a local Ollama server at
  `http://127.0.0.1:11434/api/generate`.
- Requests route through the background script to avoid CORS errors when
  communicating with the local server.
- Friendly error message now appears if the Mistral service is unavailable and
  includes a **Retry** button.
- The background script strips the `Origin` header so the local server accepts
  Mistral requests without returning **403**.
- Diagnose overlay now displays all child orders instead of only the first three.
- Added Dev Mode. The Mistral chat box, FILE and REFRESH buttons now appear only when Dev Mode is enabled.
- Added quick resolve field below the Issue summary in Gmail.
- Sidebar now loads on the Fraud tracker page and auto-enables Review Mode.
  Order numbers show an 🩻 icon that runs XRAY starting with that order.
- Review Mode can now be toggled directly from the extension popup.
- Sidebar design can now be customized from the Options page, including font size,
  font family and colors.
- CVV and AVS labels in ADYEN's DNA now show the full reason on hover and correctly mark "Supplied, Matches (M)" as a match.
- The Options page shows a live sidebar preview and Bento Mode has been removed.
- Quick resolve button now shows **COMMENT** when the issue is already resolved
  and automatically returns focus to Gmail with a success message.

- Quick resolve now reuses an existing DB tab when available and displays the
  completion message inside the Gmail sidebar instead of using a popup.

- Quick Summary no longer auto-expands on Annual Report orders and the
  Family Tree panel loads automatically.

## v0.3 - 2025-06-24

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
- DB sidebar now extracts information when first locked by DNA so Gmail Review Mode shows the full summary.
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
  displayed above the Company section in Gmail Review Mode.
- DNA summary now includes Network Transactions from the DNA page.
- Network Transactions wait for the DNA page to fully load so details appear consistently.
- Fixed the CLIENT summary combining email and phone when DB separates them with a <br> tag.
- Fixed mailto links including the phone number when contact info is wrapped in a single anchor.
- Diagnose overlay now lists amendment orders in review and the cancel tag was renamed to "RESOLVE AND COMMENT".
- Diagnose overlay comment box now defaults to the current order number and cards are 1.5× wider.
- Fixed billing address in Gmail Review Mode to include the street line.
- CODA Search token updated for API access.
- Fixed order summary duplicating when pressing **EMAIL SEARCH** more than once.
- Fixed **QUICK SUMMARY** duplicating when pressing **EMAIL SEARCH** repeatedly.
- CODA Search token updated for API access.
- DNA summary now shows two lines below the XRAY button and resets on new Gmail tabs.
- Fixed the DNA summary disappearing after a few seconds in Gmail by clearing
  data only once per tab.
- CVV and AVS tags use the normal font size with green labels for matches,
  purple for partial or no matches and black for unknown results.
- Focus returns to the email tab automatically after the DNA page loads.
- DNA pages now open in front before returning focus to the original tab.
- Gmail Review Mode now hides **OPEN ORDER** and adds a **🩻 XRAY** button that runs **EMAIL SEARCH** followed by **DNA**.
- Clicking the state in DB SB now opens the Coda Knowledge Base in a floating overlay covering most of the page.
- Light gray labels now display black text in Light Mode.
- Fixed light gray tags in Review Mode inheriting sidebar text color.
- Refunded and cancelled totals now use a black **REFUNDED** tag and remain legible.
- REFUNDED tag text is now white for better contrast.
 - EMAIL SEARCH button renamed to **SEARCH**. In Review Mode the **SEARCH**, **DNA** and **XRAY** buttons appear on the same line. The DB match tag in DNA now shows below the CVV/AVS labels and those labels use green for matches, purple for partial or no matches and black for unknown results.
- Fixed Diagnose overlay comment box showing **null** instead of the current order number when triggered from the Family Tree panel.
- Payment fields inside nested iframes are now detected so File Along selects the Client Account option reliably.
- The payment step now verifies **Client Account** is selected before continuing.
- Comment & Resolve in Gmail now reuses an open DB tab and only resolves when the issue is active.
- DNA summary refreshes when returning focus to DB or Gmail so results from XRAY appear consistently.
