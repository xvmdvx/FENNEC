// Handles enable/disable toggle and light mode
const toggle = document.getElementById("extension-toggle");
const lightToggle = document.getElementById("light-toggle");

function loadState() {
  chrome.storage.local.get({ extensionEnabled: true, lightMode: false }, ({ extensionEnabled, lightMode }) => {
    toggle.checked = Boolean(extensionEnabled);
    lightToggle.checked = Boolean(lightMode);
  });
}

function saveState() {
  chrome.storage.local.set({ extensionEnabled: toggle.checked, lightMode: lightToggle.checked }, () => {
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
  toggle.addEventListener("change", saveState);
  lightToggle.addEventListener("change", saveState);
});
