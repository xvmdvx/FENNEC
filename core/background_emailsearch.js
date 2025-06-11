
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

    if (message.action === "replaceTabs" && Array.isArray(message.urls) && sender.tab) {
        console.log("[Copilot] Reemplazando pestañas en la ventana:", message.urls);
        chrome.tabs.query({ windowId: sender.tab.windowId }, (tabs) => {
            const isDbOrGmail = (tab) =>
                tab.url &&
                (tab.url.includes('mail.google.com') || tab.url.includes('db.incfile.com'));

            const toClose = tabs
                .filter(t => t.id !== sender.tab.id && isDbOrGmail(t))
                .map(t => t.id);

            if (toClose.length) {
                chrome.tabs.remove(toClose, () => {
                    if (chrome.runtime.lastError) {
                        console.error("[Copilot] Error cerrando pestañas:", chrome.runtime.lastError.message);
                    }
                    message.urls.forEach(url => {
                        chrome.tabs.create({ url, active: false, windowId: sender.tab.windowId }, (tab) => {
                            if (chrome.runtime.lastError) {
                                console.error("[Copilot] Error abriendo pestaña", url, ":", chrome.runtime.lastError.message);
                            }
                        });
                    });
                });
            } else {
                message.urls.forEach(url => {
                    chrome.tabs.create({ url, active: false, windowId: sender.tab.windowId }, (tab) => {
                        if (chrome.runtime.lastError) {
                            console.error("[Copilot] Error abriendo pestaña", url, ":", chrome.runtime.lastError.message);
                        }
                    });
                });
            }
        });
    }
});
