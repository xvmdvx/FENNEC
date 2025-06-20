// Handles enable/disable toggle, light mode and review mode
const toggle = document.getElementById("extension-toggle");
const lightToggle = document.getElementById("light-toggle");
const reviewToggle = document.getElementById("review-toggle");

function loadState() {
  chrome.storage.local.get({ extensionEnabled: true, lightMode: false, fennecReviewMode: false }, ({ extensionEnabled, lightMode, fennecReviewMode }) => {
    toggle.checked = Boolean(extensionEnabled);
    lightToggle.checked = Boolean(lightMode);
    reviewToggle.checked = Boolean(fennecReviewMode);
  });
}

function saveState() {
  chrome.storage.local.set({ extensionEnabled: toggle.checked, lightMode: lightToggle.checked, fennecReviewMode: reviewToggle.checked }, () => {
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
  reviewToggle.addEventListener("change", saveState);
});
