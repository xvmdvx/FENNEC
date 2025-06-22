# AGENTS Instructions for FENNEC

This repository contains a small Chrome extension built with plain JavaScript.
It has no automated tests or build pipeline.

## Guidelines
- Keep code simple and readable; prefer clarity over clever optimizations.
- Use four spaces for indentation and double quotes in JavaScript files.
- Follow the `dictionary.txt` glossary for consistent terminology.
- Document new features and behavior changes in the README, and keep `dictionary.txt` updated when introducing new terminology.
- Place a short comment at the top of any new script explaining its purpose.
- Avoid large dependencies and rely on native browser APIs whenever possible.

## Testing
- Manual browser testing is required. Load the extension through
  `chrome://extensions` in Developer mode.
- Verify that the sidebar appears on Gmail and DB pages and that it remains
  inactive on unsupported sites.
- Use the browser console for debugging and confirm there are no errors.
- Run `npm test` to display manual testing steps.

## Contributions
- Open pull requests for proposed changes and work from the main branch.
- Keep commit messages short and descriptive.
- Ensure the README and `dictionary.txt` stay current when adding features or new terms.
- Summarize the purpose of the change in the PR description.
