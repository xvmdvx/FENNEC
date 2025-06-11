// Handles enable/disable toggle
const toggle = document.getElementById('extension-toggle');

function loadState() {
  chrome.storage.local.get({ extensionEnabled: true }, ({ extensionEnabled }) => {
    toggle.checked = Boolean(extensionEnabled);
  });
}

function saveState() {
  chrome.storage.local.set({ extensionEnabled: toggle.checked }, () => {
    const urls = [
      'https://mail.google.com/*',
      'https://db.incfile.com/incfile/order/detail/*',
      'https://tools.usps.com/*'
    ];
    chrome.tabs.query({ url: urls }, tabs => {
      tabs.forEach(tab => chrome.tabs.reload(tab.id));
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  toggle.addEventListener('change', saveState);
});
