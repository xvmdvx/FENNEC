// Autofills the Texas SOS login and payment pages when launched from the DB SB FILE button.
(function() {
    chrome.storage.local.get({ extensionEnabled: true }, ({ extensionEnabled }) => {
        if (!extensionEnabled) {
            console.log("[FENNEC] Extension disabled, skipping TX SOS launcher.");
            return;
        }

        chrome.storage.sync.get({ txsosUser: "", txsosPass: "" }, ({ txsosUser, txsosPass }) => {
            const path = location.pathname.toLowerCase();
            console.log("[FENNEC TXSOS] Path:", path);

            function findElement(selector, root = document, depth = 3) {
                try {
                    const el = root.querySelector(selector);
                    if (el) return el;
                    if (depth > 0) {
                        const iframes = root.querySelectorAll("iframe");
                        for (const frame of iframes) {
                            try {
                                const doc = frame.contentDocument;
                                if (doc) {
                                    const found = findElement(selector, doc, depth - 1);
                                    if (found) return found;
                                }
                            } catch (e) {
                                // Ignore cross-origin frames
                            }
                        }
                    }
                } catch (e) {}
                return null;
            }

            function waitFor(selector, timeout = 50000) {
                console.log("[FENNEC TXSOS] Waiting for", selector);
                return new Promise(resolve => {
                    const start = Date.now();
                    (function check() {
                        const el = findElement(selector);
                        if (el) {
                            console.log("[FENNEC TXSOS] Found", selector);
                            resolve(el);
                        } else if (Date.now() - start >= timeout) {
                            console.warn("[FENNEC TXSOS] Timeout waiting for", selector);
                            resolve(null);
                        } else {
                            setTimeout(check, 500);
                        }
                    })();
                });
            }

            function fillLogin() {
                if (!txsosUser || !txsosPass) {
                    console.warn("[FENNEC TXSOS] Missing credentials");
                    return;
                }
                console.log("[FENNEC TXSOS] Filling login form");
                Promise.all([
                    waitFor("input[name='client_id']"),
                    waitFor("input[name='web_password']"),
                    waitFor("input[name='submit'], input[type='submit'], button[type='submit']")
                ]).then(([userInput, passInput, button]) => {
                    try {
                        if (userInput) {
                            userInput.focus();
                            userInput.value = txsosUser;
                            userInput.dispatchEvent(new Event("input", { bubbles: true }));
                        }
                        if (passInput) {
                            passInput.focus();
                            passInput.value = txsosPass;
                            passInput.dispatchEvent(new Event("input", { bubbles: true }));
                        }
                        if (button && userInput && passInput) {
                            console.log("[FENNEC TXSOS] Submitting login via button");
                            setTimeout(() => button.click(), 300);
                        } else if (userInput && passInput) {
                            const form = userInput.closest("form");
                            if (form) {
                                console.warn("[FENNEC TXSOS] Button missing; submitting form directly");
                                setTimeout(() => form.submit(), 300);
                            } else {
                                console.error("[FENNEC TXSOS] No login form found");
                            }
                        }
                    } catch (err) {
                        console.error("[FENNEC TXSOS] Login error", err);
                    }
                });
            }

            function setDropdownValue(el, value) {
                if (!el) return;
                const opt = Array.from(el.options).find(o =>
                    o.value === String(value) || /client account/i.test(o.textContent)
                );
                if (opt) {
                    opt.selected = true;
                } else {
                    el.value = value;
                }
                ["mousedown", "mouseup", "click"].forEach(evt =>
                    el.dispatchEvent(new MouseEvent(evt, { bubbles: true }))
                );
                el.dispatchEvent(new Event("input", { bubbles: true }));
                el.dispatchEvent(new Event("change", { bubbles: true }));
            }

            function selectPayment() {
                waitFor("select[name='payment_type_id']").then(dropdown => {
                    if (!dropdown) return;
                    try {
                        console.log("[FENNEC TXSOS] Selecting Client Account");
                        setDropdownValue(dropdown, "5");
                        setTimeout(() => {
                            console.log("[FENNEC TXSOS] Option after set:", dropdown.value);
                            waitFor("input[type='submit'][name='Submit'], input[type='submit'][value='Continue']")
                                .then(btn => {
                                    if (btn) {
                                        console.log("[FENNEC TXSOS] Continuing to next step");
                                        setTimeout(() => btn.click(), 300);
                                    }
                                });
                        }, 300);
                    } catch (err) {
                        console.error("[FENNEC TXSOS] Payment step error", err);
                    }
                });
            }

            if (path.includes("acct-login.asp")) {
                if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", fillLogin);
                } else {
                    fillLogin();
                }
            } else {
                if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", selectPayment);
                } else {
                    selectPayment();
                }
            }
        });
    });
})();
