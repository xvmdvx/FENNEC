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
      'https://*.incfile.com/incfile/order/detail/*',
      'https://*.incfile.com/storage/incfile/*',
      'https://tools.usps.com/*'
    ];

    chrome.tabs.query({ url: urls }, tabs => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(
          tab.id,
          { action: 'fennecToggle', enabled: toggle.checked },
          () => {
            if (chrome.runtime.lastError) {
              chrome.tabs.reload(tab.id);
            }
          }
        );
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  toggle.addEventListener('change', saveState);
});
