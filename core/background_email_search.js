// Background worker handling tab management and other extension messages
// Use a declarative rule to strip the Origin header from local Mistral API
// requests so Ollama accepts them without CORS errors.
function registerMistralRule() {
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1],
        addRules: [{
            id: 1,
            priority: 1,
            action: {
                type: "modifyHeaders",
                requestHeaders: [{ header: "origin", operation: "remove" }]
            },
            condition: {
                urlFilter: "http://127.0.0.1:11434/",
                resourceTypes: ["xmlhttprequest"]
            }
        }]
    });
}

registerMistralRule();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openTab" && message.url) {
        console.log("[Copilot] Forzando apertura de una pestaña:", message.url);
        const opts = { url: message.url, active: Boolean(message.active) };
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
        if (message.refocus && sender && sender.tab) {
            chrome.storage.local.set({ fennecReturnTab: sender.tab.id });
        }
    }

    if (message.action === "openOrReuseTab" && message.url) {
        const query = { url: `${message.url}*` };
        chrome.tabs.query(query, (tabs) => {
            const tab = tabs && tabs[0];
            if (tab) {
                chrome.tabs.update(tab.id, { active: Boolean(message.active) }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("[Copilot] Error focusing tab:", chrome.runtime.lastError.message);
                    }
                });
            } else {
                const opts = { url: message.url, active: Boolean(message.active) };
                if (message.windowId) {
                    opts.windowId = message.windowId;
                } else if (sender && sender.tab) {
                    opts.windowId = sender.tab.windowId;
                }
                chrome.tabs.create(opts, (t) => {
                    if (chrome.runtime.lastError) {
                        console.error("[Copilot] Error (openOrReuseTab):", chrome.runtime.lastError.message);
                    }
                });
            }
            if (message.refocus && sender && sender.tab) {
                chrome.storage.local.set({ fennecReturnTab: sender.tab.id });
            }
        });
        return;
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

    if (message.action === "closeOtherTabs" && sender.tab) {
        chrome.tabs.query({ windowId: sender.tab.windowId }, (tabs) => {
            const toClose = tabs.filter(t => t.id !== sender.tab.id).map(t => t.id);
            if (toClose.length) {
                chrome.tabs.remove(toClose, () => {
                    if (chrome.runtime.lastError) {
                        console.error("[Copilot] Error cerrando pestañas:", chrome.runtime.lastError.message);
                    }
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
        const url = `${base}/incfile/order/detail/${orderId}?fennec_no_store=1`;
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
                            if (!tab && !createdTabId) {
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

    if (message.action === "detectSubscriptions" && message.email && sender.tab) {
        const originTab = sender.tab.id;
        let base = "https://db.incfile.com";
        try {
            const url = new URL(sender.tab.url);
            if (url.hostname.endsWith("incfile.com")) base = url.origin;
        } catch (err) {
            console.warn("[Copilot] Invalid sender URL", sender.tab.url);
        }
        const url = `${base}/order-tracker/orders/order-search?fennec_email=${encodeURIComponent(message.email)}`;
        chrome.tabs.create({ url, active: false, windowId: sender.tab.windowId }, tab => {
            if (chrome.runtime.lastError || !tab) { sendResponse(null); return; }
            const resultListener = (msg, snd) => {
                if (msg.action === 'dbEmailSearchResults' && snd.tab && snd.tab.id === tab.id) {
                    chrome.runtime.onMessage.removeListener(resultListener);
                    const orders = msg.orders || [];
                    const formationIds = orders
                        .filter(o => /formation|silver|gold|platinum/i.test(o.type))
                        .map(o => o.orderId)
                        .filter(Boolean);
                    let idx = 0;
                    const activeSubs = [];
                    const checkNext = () => {
                        if (idx >= formationIds.length) {
                            chrome.tabs.remove(tab.id);
                            chrome.tabs.update(originTab, { active: true });
                            sendResponse({ orderCount: orders.length, activeSubs, ltv: message.ltv });
                            return;
                        }
                        const id = formationIds[idx++];
                        const detailUrl = `${base}/incfile/order/detail/${id}?fennec_sub_check=1`;
                        chrome.tabs.create({ url: detailUrl, active: false, windowId: sender.tab.windowId }, oTab => {
                            const listener = (tid, info) => {
                                if (tid === oTab.id && info.status === 'complete') {
                                    chrome.tabs.onUpdated.removeListener(listener);
                                    chrome.tabs.sendMessage(oTab.id, { action: 'getActiveSubs' }, resp => {
                                        if (resp && Array.isArray(resp.subs) && resp.subs.length) activeSubs.push(id);
                                        chrome.tabs.remove(oTab.id, checkNext);
                                    });
                                }
                            };
                            chrome.tabs.onUpdated.addListener(listener);
                        });
                    };
                    checkNext();
                }
            };
            chrome.runtime.onMessage.addListener(resultListener);
        });
        return true;
    }

    if (message.action === "sosSearch" && message.url && message.query) {
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
                                ? ["id", "number", "document", "control", "filing", "account"]
                                : ["name", "business", "entity", "organization", "company", "keyword", "search"];
                            const skip = ["login", "email", "user", "password"];
                            // Some SOS sites, like Wyoming, load their search
                            // fields slowly or behind security checks.
                            // Give them more time before giving up.
                            let attempts = 20; // was 10
                            const run = () => {
                                const inputs = Array.from(document.querySelectorAll("input[type='text'],input[type='search'],input:not([type]),textarea"));
                                const field = inputs.find(i => {
                                    if (i.type === 'hidden' || !(i.offsetWidth || i.offsetHeight || i.getClientRects().length)) return false;
                                    const attrs = (i.name || "") + " " + (i.id || "") + " " + (i.placeholder || "") + " " + (i.getAttribute("aria-label") || "");
                                    const txt = attrs.toLowerCase();
                                    if (skip.some(p => txt.includes(p))) return false;
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
                                        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
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

        openSearchTab();
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

    if (message.action === "openKnowledgeBaseWindow" && message.state) {
        const state = message.state;
        const type = message.orderType || "";
        const url = "https://coda.io/d/Bizee-Filing-Department_dQJWsDF3UZ6/Knowledge-Base_suQao1ou";
        const width = message.width || 800;
        const height = message.height || 600;
        const left = message.left;
        const top = message.top;
        const opts = { url, type: "popup", width, height };
        if (typeof left === "number") opts.left = left;
        if (typeof top === "number") opts.top = top;
        chrome.windows.create(opts, (win) => {
            if (chrome.runtime.lastError) {
                console.error("[Copilot] Error opening KB window:", chrome.runtime.lastError.message);
                return;
            }
            const tab = win.tabs && win.tabs[0];
            if (!tab || !tab.id) return;
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

    if (message.action === "openFilingWindow") {
        const txUrl = "https://direct.sos.state.tx.us/acct/acct-login.asp";
        chrome.windows.create({ url: txUrl, type: "popup" }, (win) => {
            if (chrome.runtime.lastError) {
                console.error("[Copilot] Error opening filing window:", chrome.runtime.lastError.message);
            }
        });
        return;
    }

    if (message.action === "navigateKbFrame" && message.state && sender.tab) {
        const state = message.state;
        const type = message.orderType || "";
        chrome.scripting.executeScript({
            target: { tabId: sender.tab.id, allFrames: true },
            func: (state, type) => {
                if (!location.hostname.includes('coda.io')) return;
                function clickExact(txt) {
                    const nodes = Array.from(document.querySelectorAll('a,button,span,div'));
                    const target = nodes.find(n => n.textContent && n.textContent.trim().toLowerCase() === txt.toLowerCase());
                    if (target) { target.click(); return true; }
                    return false;
                }

                function clickStateAnchor(stateName) {
                    const slug = stateName.replace(/\s+/g, '-');
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
        return;
    }

    if (message.action === "mistralGenerate" && message.prompt) {
        const body = {
            model: "mistral",
            prompt: message.prompt,
            stream: false
        };
        fetch("http://127.0.0.1:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        })
            .then(r => r.json())
            .then(j => sendResponse({ text: j.response || "" }))
            .catch(err => {
                console.warn("[Copilot] Mistral fetch error:", err);
                sendResponse({ text: "Error" });
            });
        return true;
    }

    if (message.action === "refocusTab") {
        chrome.storage.local.get({ fennecReturnTab: null }, ({ fennecReturnTab }) => {
            if (fennecReturnTab) {
                chrome.tabs.update(fennecReturnTab, { active: true }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("[Copilot] Error focusing tab:", chrome.runtime.lastError.message);
                    }
                });
            }
        });
        return;
    }
});
