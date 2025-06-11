# FENNEC

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
- Displays a small order summary inside the sidebar.
- Opens Gmail search and the DB order page in new tabs when clicking the buttons.
- Uses `margin-right` to ensure Gmail navigation controls stay visible.
- The top header bar shifts left along with the main panels so account menus remain accessible.
 - If you close the sidebar it will remain hidden until the tab is reloaded.

### DB
- Displays a sidebar on order detail pages.
- Scrapes company, agent and officer data and presents it in a compact layout.
- Addresses are clickable to open a Google search and copy the text.

## Known limitations

- The scripts rely on the browser DOM provided by Chrome. They are not meant to
  run under Node.js or outside the browser context.
- The extension currently supports only Gmail and DB order detail URLs.
