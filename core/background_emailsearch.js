
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

    if (message.action === "checkLastIssue" && message.orderId) {
        const orderId = message.orderId;
        const query = { url: `https://db.incfile.com/incfile/order/detail/${orderId}*` };
        let attempts = 15;
        let delay = 1000;

        const tryFetch = () => {
            chrome.tabs.query(query, (tabs) => {
                const tab = tabs && tabs[0];
                if (!tab || tab.status !== "complete") {
                    if (attempts > 0) {
                        setTimeout(() => {
                            attempts--;
                            delay = Math.min(delay * 1.5, 10000);
                            tryFetch();
                        }, delay);
                    } else {
                        console.warn(`[Copilot] Issue check timed out for order ${orderId}`);
                        sendResponse({ issueInfo: null });
                    }
                    return;
                }
                chrome.tabs.sendMessage(tab.id, { action: "getLastIssue" }, (resp) => {
                    if (chrome.runtime.lastError) {
                        if (attempts > 0) {
                            setTimeout(() => {
                                attempts--;
                                delay = Math.min(delay * 1.5, 10000);
                                tryFetch();
                            }, delay);
                        } else {
                            console.warn(`[Copilot] Issue check timed out for order ${orderId}`);
                            sendResponse({ issueInfo: null });
                        }
                        return;
                    }
                    sendResponse(resp);
                });
            });
        };

        tryFetch();
        return true;
    }

    if (message.action === "fetchChildOrders" && message.orderId) {
        const orderId = message.orderId;
        const url = `https://db.incfile.com/incfile/order/detail/${orderId}`;
        const query = { url: `${url}*` };
        let attempts = 15;
        let delay = 1000;
        let createdTabId = null;

        const openAndQuery = () => {
            chrome.tabs.query(query, (tabs) => {
                let tab = tabs && tabs[0];
                const ensureLoaded = () => {
                    if (!tab || tab.status !== "complete") {
                        if (attempts > 0) {
                            if (!tab) {
                            chrome.tabs.create({ url, active: false }, t => {
                                tab = t;
                                createdTabId = t.id;
                            });
                            }
                            setTimeout(() => {
                                attempts--;
                                delay = Math.min(delay * 1.5, 10000);
                                chrome.tabs.query(query, qs => { tab = qs && qs[0]; ensureLoaded(); });
                            }, delay);
                        } else {
                            console.warn(`[Copilot] Child order fetch timed out for ${orderId}`);
                            sendResponse({ childOrders: null, parentInfo: null });
                            if (createdTabId) chrome.tabs.remove(createdTabId);
                        }
                        return;
                    }
                    chrome.tabs.sendMessage(tab.id, { action: "getChildOrders" }, resp => {
                        if (chrome.runtime.lastError) {
                            console.warn("[Copilot] Child order extraction error:", chrome.runtime.lastError.message);
                            sendResponse({ childOrders: null, parentInfo: null });
                            if (createdTabId) chrome.tabs.remove(createdTabId);
                            return;
                        }
                        sendResponse(resp);
                        if (createdTabId) chrome.tabs.remove(createdTabId);
                    });
                };
                ensureLoaded();
            });
        };

        openAndQuery();
        return true;
    }
});
