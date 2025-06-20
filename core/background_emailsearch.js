// Background worker handling tab management and other extension messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openTab" && message.url) {
        console.log("[Copilot] Forzando apertura de una pestaña:", message.url);
        const opts = { url: message.url, active: false };
        if (message.windowId) {
            opts.windowId = message.windowId;
        } else if (sender && sender.tab) {
            opts.windowId = sender.tab.windowId;
        }
        chrome.tabs.create(opts, (tab) => {
            if (chrome.runtime.lastError) {
                console.error("[Copilot] Error (openTab):", chrome.runtime.lastError.message);
            }
        });
    }

    if (message.action === "openActiveTab" && message.url) {
        console.log("[Copilot] Forzando apertura de una pestaña activa:", message.url);
        chrome.tabs.create({ url: message.url, active: true }, (tab) => {
            if (chrome.runtime.lastError) {
                console.error("[Copilot] Error (openActiveTab):", chrome.runtime.lastError.message);
            }
        });
    }

    if (message.action === "openTabs" && Array.isArray(message.urls)) {
        console.log("[Copilot] Forzando apertura de múltiples pestañas:", message.urls);
        const optsBase = { active: false };
        if (message.windowId) {
            optsBase.windowId = message.windowId;
        } else if (sender && sender.tab) {
            optsBase.windowId = sender.tab.windowId;
        }
        message.urls.forEach((url, i) => {
            const opts = Object.assign({ url }, optsBase);
            chrome.tabs.create(opts, (tab) => {
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
                (tab.url.includes("mail.google.com") || tab.url.includes("db.incfile.com"));

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
        let base = "https://db.incfile.com";
        if (sender && sender.tab && sender.tab.url) {
            try {
                const url = new URL(sender.tab.url);
                if (url.hostname.endsWith("incfile.com")) {
                    base = url.origin;
                }
            } catch (err) {
                console.warn("[Copilot] Invalid sender URL", sender.tab.url);
            }
        }
        const query = { url: `${base}/incfile/order/detail/${orderId}*` };
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

    if (message.action === "checkHoldUser" && message.orderId) {
        const orderId = message.orderId;
        let base = "https://db.incfile.com";
        if (sender && sender.tab && sender.tab.url) {
            try {
                const url = new URL(sender.tab.url);
                if (url.hostname.endsWith("incfile.com")) {
                    base = url.origin;
                }
            } catch (err) {
                console.warn("[Copilot] Invalid sender URL", sender.tab.url);
            }
        }
        const query = { url: `${base}/incfile/order/detail/${orderId}*` };
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
                        console.warn(`[Copilot] Hold user check timed out for order ${orderId}`);
                        sendResponse({ holdUser: null });
                    }
                    return;
                }
                chrome.tabs.sendMessage(tab.id, { action: "getHoldUser" }, (resp) => {
                    if (chrome.runtime.lastError) {
                        if (attempts > 0) {
                            setTimeout(() => {
                                attempts--;
                                delay = Math.min(delay * 1.5, 10000);
                                tryFetch();
                            }, delay);
                        } else {
                            console.warn(`[Copilot] Hold user check timed out for order ${orderId}`);
                            sendResponse({ holdUser: null });
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
        let base = "https://db.incfile.com";
        if (sender && sender.tab && sender.tab.url) {
            try {
                const url = new URL(sender.tab.url);
                if (url.hostname.endsWith("incfile.com")) {
                    base = url.origin;
                }
            } catch (err) {
                console.warn("[Copilot] Invalid sender URL", sender.tab.url);
            }
        }
        const url = `${base}/incfile/order/detail/${orderId}`;
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
                            chrome.tabs.create({ url, active: false, windowId: sender.tab ? sender.tab.windowId : undefined }, t => {
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

    if (message.action === "fetchLastIssue" && message.orderId) {
        const orderId = message.orderId;
        let base = "https://db.incfile.com";
        if (sender && sender.tab && sender.tab.url) {
            try {
                const url = new URL(sender.tab.url);
                if (url.hostname.endsWith("incfile.com")) {
                    base = url.origin;
                }
            } catch (err) {
                console.warn("[Copilot] Invalid sender URL", sender.tab.url);
            }
        }
        const url = `${base}/incfile/order/detail/${orderId}`;
        const query = { url: `${url}*` };
        let attempts = 15;
        let delay = 1000;
        let createdTabId = null;

        const openAndFetch = () => {
            chrome.tabs.query(query, (tabs) => {
                let tab = tabs && tabs[0];
                const ensureLoaded = () => {
                    if (!tab || tab.status !== "complete") {
                        if (attempts > 0) {
                            if (!tab) {
                                chrome.tabs.create({ url, active: false, windowId: sender.tab ? sender.tab.windowId : undefined }, t => {
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
                            console.warn(`[Copilot] Issue fetch timed out for ${orderId}`);
                            sendResponse({ issueInfo: null });
                            if (createdTabId) chrome.tabs.remove(createdTabId);
                        }
                        return;
                    }
                    chrome.tabs.sendMessage(tab.id, { action: "getLastIssue" }, resp => {
                        if (chrome.runtime.lastError || !resp || !resp.issueInfo) {
                            chrome.tabs.sendMessage(tab.id, { action: "getHoldUser" }, hold => {
                                if (chrome.runtime.lastError) {
                                    console.warn("[Copilot] Hold user fetch error:", chrome.runtime.lastError.message);
                                    sendResponse({ issueInfo: null });
                                } else {
                                    const user = hold && hold.holdUser ? `On hold by ${hold.holdUser}` : "On hold";
                                    sendResponse({ issueInfo: { text: user, active: true } });
                                }
                                if (createdTabId) chrome.tabs.remove(createdTabId);
                            });
                        } else {
                            sendResponse(resp);
                            if (createdTabId) chrome.tabs.remove(createdTabId);
                        }
                    });
                };
                ensureLoaded();
            });
        };

        openAndFetch();
        return true;
    }

    if (message.action === "sosSearch" && message.url && message.query) {
        const origin = new URL(message.url).origin + "/*";
        const openSearchTab = () => {
            chrome.tabs.create({ url: message.url, active: true }, (tab) => {
                if (chrome.runtime.lastError) {
                    console.error("[Copilot] Error opening SOS tab:", chrome.runtime.lastError.message);
                    return;
                }
                const inject = (tabId) => {
                    chrome.scripting.executeScript({
                        target: { tabId },
                        func: (q, type) => {
                            const patterns = type === "id"
                                ? ["id", "number", "document", "control"]
                                : ["name", "business", "entity"];
                            let attempts = 10;
                            const run = () => {
                                const inputs = Array.from(document.querySelectorAll("input,textarea"));
                                const field = inputs.find(i => {
                                    const attrs = (i.name || "") + " " + (i.id || "") + " " + (i.placeholder || "") + " " + (i.getAttribute("aria-label") || "");
                                    const txt = attrs.toLowerCase();
                                    return patterns.some(p => txt.includes(p));
                                });
                                if (field) {
                                    field.focus();
                                    field.value = q;
                                    field.dispatchEvent(new Event("input", { bubbles: true }));
                                    const form = field.form;
                                    const btn = form ? form.querySelector("button[type=\"submit\"],input[type=\"submit\"]") : null;
                                    if (btn) {
                                        btn.click();
                                    } else if (form) {
                                        form.submit();
                                    } else {
                                        field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
                                        field.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
                                    }
                                } else if (attempts-- > 0) {
                                    setTimeout(run, 500);
                                }
                            };
                            run();
                        },
                        args: [message.query, message.searchType]
                    });
                };
                const listener = (tabId, info) => {
                    if (tabId === tab.id && info.status === "complete") {
                        chrome.tabs.onUpdated.removeListener(listener);
                        inject(tabId);
                    }
                };
                chrome.tabs.onUpdated.addListener(listener);
            });
        };

        chrome.permissions.contains({ origins: [origin] }, (has) => {
            const requestAndOpen = () => {
                chrome.permissions.request({ origins: [origin] }, (granted) => {
                    if (granted) {
                        openSearchTab();
                    } else if (sender.tab && sender.tab.id) {
                        chrome.tabs.sendMessage(sender.tab.id, { action: "sosPermissionError" });
                    }
                });
            };
            if (has) {
                openSearchTab();
            } else {
                requestAndOpen();
            }
        });
        return;
    }

    if (message.action === "openKnowledgeBase" && message.state) {
        const state = message.state;
        const type = message.orderType || "";
        const url = "https://coda.io/d/Bizee-Filing-Department_dQJWsDF3UZ6/Knowledge-Base_suQao1ou";
        chrome.tabs.create({ url, active: true }, (tab) => {
            if (chrome.runtime.lastError) {
                console.error("[Copilot] Error opening KB tab:", chrome.runtime.lastError.message);
                return;
            }
            const inject = (tabId) => {
                chrome.scripting.executeScript({
                    target: { tabId },
                    func: (state, type) => {
                        function clickExact(txt) {
                            const nodes = Array.from(document.querySelectorAll("a,button,span,div"));
                            const target = nodes.find(n => n.textContent && n.textContent.trim().toLowerCase() === txt.toLowerCase());
                            if (target) { target.click(); return true; }
                            return false;
                        }

                        function clickStateAnchor(stateName) {
                            const slug = stateName.replace(/\s+/g, "-");
                            const sel = `a[href*='/${slug}_']`;
                            const el = document.querySelector(sel);
                            if (el) { el.click(); return true; }
                            return clickExact(stateName);
                        }

                        let tries = 40;
                        const run = () => {
                            if (clickStateAnchor(state)) {
                                if (type) {
                                    let typeTries = 40;
                                    const tryType = () => {
                                        if (!clickExact(type) && typeTries-- > 0) {
                                            setTimeout(tryType, 500);
                                        }
                                    };
                                    setTimeout(tryType, 500);
                                }
                            } else if (tries-- > 0) {
                                setTimeout(run, 500);
                            }
                        };
                        run();
                    },
                    args: [state, type]
                });
            };
            const listener = (tabId, info) => {
                if (tabId === tab.id && info.status === "complete") {
                    chrome.tabs.onUpdated.removeListener(listener);
                    inject(tabId);
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
        });
        return;
    }
});
