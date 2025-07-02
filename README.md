# FENNEC (BETA)

FENNEC's principal function is injecting a SIDEBAR (SB) as a navigation companion that extracts information from relevant environments and displays it in a reordered manner to improve agents' productivity and reduce mental stress. Each environment has its unique layout depending on the type's necessities.

## Features

SIDEBAR HEADER:
It remains constant throughout all layouts, unless an IMPORTANT restriction is added.
   Left: Hamburger Icon/Menu. This floater contains QUICK ACTIONS.
   Center: Icon, App name and version in parentheses.
   Right: Icon for clean window action. Close SB button.

CLASSIC MODE:
This is the default and most basic layout for the sidebar. It appears in Gmail (GM) and DB. Experimental features are hidden unless Dev Mode is enabled.

MAIN (BUSINESS FORMATION ORDERS: SILVER, GOLD, PLATINUM)
   DB:
      Title: "ORDER SUMMARY" + QUICK SUMMARY display/collapse button (⚡)
      1st box: COMPANY summary
         - Line 1: Company name with copy icon and link to the SOS search.
         - Line 2: State ID with copy icon (and formation date if present).
         - Line 3: State abbreviation linking to the Knowledge Base.
         - Line 4: Physical and mailing addresses.
         - Line 5: Business purpose line.
         - Line 6: RA and VA tags indicating service status.
      2nd box: AGENT summary
         - Line 1: Agent name.
         - Line 2: Agent address.
         - Line 3: Service status tag (Active, Resigned or Unknown).
      3rd box: MEMBERS (LLC) or DIRECTORS (CORP, NPROFIT)
         - Each entry: Name and address, separated with horizontal rules.
      4th box: SHAREHOLDERS (CORP, NPROFIT)
         - Each entry: Name, address and "Shares:" line when available.
      5th box: Officers (CORP, NPROFIT)
         - Each entry: Name, address (if any) and officer position.
      (Dev Mode) [🤖 FILE] button centered followed by [🔄 REFRESH].
      (Dev Mode) Mistral Box: Chat interface under REFRESH.
   GM:
      Title: [📧 SEARCH] button centered.
      1st box: COMPANY summary
         - Same lines as DB COMPANY box.
      2nd box: AGENT summary
         - Same lines as DB AGENT box.
      3rd box: MEMBERS (LLC) or DIRECTORS (CORP, NPROFIT)
         - Same structure as in DB.
      4th box: SHAREHOLDERS (CORP, NPROFIT)
         - Same structure as in DB.
      5th box: Officers (CORP, NPROFIT)
         - Same structure as in DB.
      6th box: Issue summary
         - Header with ACTIVE/RESOLVED tag.
         - Issue text.
         - Comment input and **COMMENT & RESOLVE** button.
      Quick resolve field under Issue summary
      Reuses any open DB tab for comments and resolves the issue only if active
      The comment box disappears after submission showing your comment and a
      success message. Resolving automatically updates the tag to RESOLVED.
      (Dev Mode) End: [🔄 REFRESH] button centered.

MISC (ALL NON-BUSINESS FORMATION ORDERS)
   DB:
      Title: FAMILY TREE display/collapse icon (🌳), "ORDER SUMMARY", QUICK SUMMARY display/collapse icon (⚡)
      1st box: COMPANY summary
         - Same lines as DB COMPANY box.
      2nd box: AGENT summary
         - Same lines as DB AGENT box.
      3rd box: MEMBERS (LLC) or DIRECTORS (CORP, NPROFIT)
         - Same structure as in DB.
      4th box: SHAREHOLDERS (CORP, NPROFIT)
         - Same structure as in DB.
      5th box: Officers (CORP, NPROFIT)
         - Same structure as in DB.
   GM:
      Title: [📧 SEARCH] button centered.
      1st box: COMPANY summary
         - Same lines as DB COMPANY box.
      2nd box: AGENT summary
         - Same lines as DB AGENT box.
      3rd box: MEMBERS (LLC) or DIRECTORS (CORP, NPROFIT)
         - Same structure as in DB.
      4th box: SHAREHOLDERS (CORP, NPROFIT)
         - Same structure as in DB.
      5th box: Officers (CORP, NPROFIT)
         - Same structure as in DB.
      6th box: Issue summary
         - Header with ACTIVE/RESOLVED tag.
         - Issue text.
   (Dev Mode) End: [🔄 REFRESH] button centered.

REVIEW MODE:
This is a detailed mode for the Revenue Assurance team to assist with the order review step.
In Review Mode the sidebar stays locked across all tabs until DNA runs on a different order.

MAIN:
   DB:
      Title: "ORDER SUMMARY"
      1st box: ADYEN's DNA summary
         - Line 1: Card holder name.
         - Line 2: Payment method • last four digits • expiry • funding source.
         - Line 3: Billing address and issuing bank.
         - Line 4: CVV, AVS and DB match tags.
         - Line 5: Fraud scoring.
         - Line 6: Transaction table with totals.
      2nd box: COMPANY summary (with restructured QUICK SUMMARY contained in the same box)
         - Same lines as the DB COMPANY box.
      3rd box: CLIENT summary
         - Line 1: Client name and ID link.
         - Line 2: Role tags or NOT LISTED.
         - Line 3: Email and phone.
         - Line 4: Companies count and LTV.
      4th box: BILLING summary
         - Line 1: Cardholder name.
         - Line 2: Card type • last four digits • expiry.
         - Line 3: AVS result tag.
         - Line 4: Billing address.
      5th box: Issue summary
         - Header with ACTIVE/RESOLVED tag and issue text.
   (Dev Mode) End: [🔄 REFRESH] button centered.
   GM:
      Title: [📧 SEARCH], [🧬 DNA] & [🩻 XRAY] buttons centered.
      1st box: ADYEN's DNA summary
         - Same lines as DB ADYEN box.
      2nd box: COMPANY summary (with restructured QUICK SUMMARY contained in the same box)
         - Same lines as DB COMPANY box.
      3rd box: CLIENT summary
         - Same lines as DB CLIENT box.
      4th box: BILLING summary
         - Same lines as DB BILLING box.
      5th box: Issue summary
         - Header with ACTIVE/RESOLVED tag and issue text.
   (Dev Mode) End: [🔄 REFRESH] button centered.

MISC:
   DB:
      Title: FAMILY TREE display/collapse button (🌳), "ORDER SUMMARY"
      1st box: ADYEN's DNA summary (only if DNA or XRAY have been triggered)
         - Same lines as DB ADYEN box.
      2nd box: COMPANY summary (with restructured QUICK SUMMARY contained in the same box)
         - Same lines as DB COMPANY box.
      3rd box: CLIENT summary
         - Same lines as DB CLIENT box.
      4th box: BILLING summary
         - Same lines as DB BILLING box.
      5th box: Issue summary
         - Header with ACTIVE/RESOLVED tag and issue text.
      (Dev Mode) End: [🔄 REFRESH] button centered.
   GM:
      Title: [📧 SEARCH], [🧬 DNA] & [🩻 XRAY] buttons centered.
      1st box: ADYEN's DNA summary (only if DNA or XRAY have been triggered)
         - Same lines as DB ADYEN box.
      2nd box: COMPANY summary (with restructured QUICK SUMMARY contained in the same box)
         - Same lines as DB COMPANY box.
      3rd box: CLIENT summary
         - Same lines as DB CLIENT box.
      4th box: BILLING summary
         - Same lines as DB BILLING box.
      5th box: Issue summary
         - Header with ACTIVE/RESOLVED tag and issue text.
      (Dev Mode) End: [🔄 REFRESH] button centered.
   ADYEN:
      1st box: ADYEN's DNA summary (only if DNA or XRAY have been triggered)
         - Same lines as DB ADYEN box.
      2nd box: COMPANY summary (with restructured QUICK SUMMARY contained in the same box)
         - Same lines as DB COMPANY box.
      3rd box: CLIENT summary
         - Same lines as DB CLIENT box.
      4th box: BILLING summary
         - Same lines as DB BILLING box.
      5th box: Issue summary
         - Header with ACTIVE/RESOLVED tag and issue text.
      (Dev Mode) End: [🔄 REFRESH] button centered.

DEV MODE:
Eexperimental mode where upcoming features are tested before release.
   DB:
      [🤖 FILE] and [🔄 REFRESH] buttons plus the Mistral Box appear at the bottom.
   GM:
      [🔄 REFRESH] button appears at the bottom.

ICONS/BUTTONS/FUNCTIONS:

📧 SEARCH: Opens tabs in background:
   1. Gmail Search with Order Number, Customer Email, Customer Name. 
   2. Order in DB
🗑 CLEAR TABS: Closes all tabs, except the one active, in current window.
🧹 CLEAR: Resets the sidebar to its initial empty state in the current tab.
🔄 Refresh: Updates sidebar information instantly with information extracted from the active tab.
🧬 DNA: Opens order payment information in Adyen and extracts relevant information from two tabs:
   1. Payment Details
   2. DNA
   Focus returns to the original email once information is retrieved.
🩻 XRAY: Runs SEARCH and DNA operations one after the other.
   Focus also returns to the original email at the end.
🤖 FILE: Automator that opens and fills the SOS filing process.

GENERAL FEATURES:
- Clicking COMPANY NAME opens the SOS search, injects the name and hits search.
- Clicking the STATE ID in the sidebar opens the Coda Knowledge Base in a popup window covering about 70% of the page.
- RA and VA tags display in the COMPANY box. If the Registered Agent Service shows an expiration date in the past, the RA tag turns yellow and reads **EXPIRED**.
- A magnifier icon on the COMPANY box toggles a form with inputs to run SOS name or ID searches using custom parameters.
- 🩺 DIAGNOSE overlay lists hold orders from the Family Tree and now displays all child orders.
- When the sidebar is opened manually in Gmail or Adyen, it starts empty and only shows the action buttons. Order details appear after using SEARCH, DNA or XRAY.
- Visiting the Fraud tracker in DB automatically opens the sidebar in Review Mode and adds 🩻 XRAY icons next to each order number.

## Known limitations
- The scripts rely on the browser DOM provided by Chrome.
  
## Reference dictionary
- [dictionary.txt](dictionary.txt) file explains the abbreviations and shorthand terms used throughout the extension.
- [CHANGELOG.md](CHANGELOG.md) for a detailed list of bug fixes. When adding new features, also update.


## Installation in Chrome
1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (toggle in the top right).
4. Click **Load unpacked** and select the project folder. The sidebar will then
   be available when visiting supported pages.
5. Open the extension **Options** from the menu or the Extensions page to set a default sidebar width and Review Mode. You can also toggle Review Mode directly from the extension popup.


## Local Mistral integration
The Mistral Box sends prompts to a local [Ollama](https://ollama.ai) server.
Start Ollama so the API is reachable at `http://127.0.0.1:11434/api/generate`.
Responses from that endpoint appear below the REFRESH button.
Requests are sent through the background script, which installs a
declarative rule to remove the `Origin` header so Ollama accepts them
without triggering CORS errors.
If the chat displays **Mistral service unavailable. Ensure Ollama is running.**
start or restart Ollama and click **Retry** in the chat box.

## Development

This repository now includes a minimal `package.json` to simplify future testing and build automation. The `npm test` command prints manual testing steps.

### Manual testing
Rest assured that all manual testing has been completed when reporting bugs or malfunctions.
The `manual-test.js` script prints a checklist for manually verifying the extension. For a complete checklist see [manual-test.js](manual-test.js). 

## Development notes

The `manual-test.js` script prints a checklist for manually verifying the extension. Terms used across this project are defined in `dictionary.txt`. When adding new features, update this README so the documentation stays current.

