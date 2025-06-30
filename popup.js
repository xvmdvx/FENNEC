// Handles enable/disable toggle and theme selections
const toggle = document.getElementById("extension-toggle");
const lightToggle = document.getElementById("light-toggle");
const bentoToggle = document.getElementById("bento-toggle");
const reviewToggle = document.getElementById("review-toggle");
const devToggle = document.getElementById("dev-toggle");

function loadState() {
    chrome.storage.local.get({ extensionEnabled: true, lightMode: false, bentoMode: false, fennecDevMode: false }, ({ extensionEnabled, lightMode, bentoMode, fennecDevMode }) => {
        chrome.storage.sync.get({ fennecReviewMode: false, fennecDevMode: false }, ({ fennecReviewMode, fennecDevMode }) => {
            toggle.checked = Boolean(extensionEnabled);
            lightToggle.checked = Boolean(lightMode);
            bentoToggle.checked = Boolean(bentoMode);
            reviewToggle.checked = Boolean(fennecReviewMode);
            devToggle.checked = Boolean(fennecDevMode);
        });
    });
}

function saveState() {
    chrome.storage.local.set({ extensionEnabled: toggle.checked, lightMode: lightToggle.checked, bentoMode: bentoToggle.checked, fennecReviewMode: reviewToggle.checked, fennecDevMode: devToggle.checked }, () => {
        chrome.storage.sync.set({ fennecReviewMode: reviewToggle.checked, fennecDevMode: devToggle.checked }, () => {
            const urls = [
                "https://mail.google.com/*",
                "https://*.incfile.com/incfile/order/detail/*",
                "https://*.incfile.com/storage/incfile/*",
                "https://tools.usps.com/*"
            ];

            chrome.tabs.query({ url: urls }, tabs => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(
                        tab.id,
                        { action: "fennecToggle", enabled: toggle.checked },
                        () => {
                            if (chrome.runtime.lastError) {
                                chrome.tabs.reload(tab.id);
                            }
                        }
                    );
                });
            });
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadState();
    toggle.addEventListener("change", saveState);
    lightToggle.addEventListener("change", saveState);
    bentoToggle.addEventListener("change", saveState);
    reviewToggle.addEventListener("change", saveState);
    devToggle.addEventListener("change", saveState);
});
