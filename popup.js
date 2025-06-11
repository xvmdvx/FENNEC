// Handles enable/disable toggle
const toggle = document.getElementById('extension-toggle');

function loadState() {
  chrome.storage.local.get({ extensionEnabled: true }, ({ extensionEnabled }) => {
    toggle.checked = Boolean(extensionEnabled);
  });
}

function saveState() {
  chrome.storage.local.set({ extensionEnabled: toggle.checked });
}

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  toggle.addEventListener('change', saveState);
});
