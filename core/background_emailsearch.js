
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openTab" && message.url) {
        console.log("[Copilot] Forzando apertura de una pestaña:", message.url);
        chrome.tabs.create({ url: message.url, active: false }, (tab) => {
            if (chrome.runtime.lastError) {
                console.error("[Copilot] Error (openTab):", chrome.runtime.lastError.message);
            }
        });
    }

    if (message.action === "openTabs" && Array.isArray(message.urls)) {
        console.log("[Copilot] Forzando apertura de múltiples pestañas:", message.urls);
        message.urls.forEach((url, i) => {
            chrome.tabs.create({ url, active: false }, (tab) => {
                if (chrome.runtime.lastError) {
                    console.error("[Copilot] Error (openTabs) para URL", url, ":", chrome.runtime.lastError.message);
                }
            });
        });
    }
});
