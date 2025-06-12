(function persistentSidebar() {
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'fennecToggle') {
            window.location.reload();
        }
    });
    chrome.storage.local.get({ extensionEnabled: true }, ({ extensionEnabled }) => {
        if (!extensionEnabled) {
            console.log('[FENNEC] Extension disabled, skipping Gmail launcher.');
            return;
        }
        try {
            const SIDEBAR_WIDTH = 340;

        function applyPaddingToMainPanels() {
            const candidates = [
                ...Array.from(document.body.querySelectorAll(':scope > .nH')),
                ...Array.from(document.body.querySelectorAll('.aeF')),
                ...Array.from(document.body.querySelectorAll('.Bk'))
            ];

            // También ajustamos la barra superior de Gmail
            const gmailBar = document.getElementById('gb');
            if (gmailBar) candidates.push(gmailBar);

            const mainPanels = candidates.filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > (window.innerWidth * 0.6);
            });

            if (mainPanels.length === 0) {
                console.warn("[Copilot] No se encontró panel central grande. Usando body como fallback.");
                mainPanels.push(document.body);
            }

            mainPanels.forEach((el, i) => {
                // Usamos margin-right para no desplazar
                // elementos de paginación fuera de la vista
                el.style.setProperty("margin-right", SIDEBAR_WIDTH + "px", "important");
                el.style.setProperty("transition", "margin-right 0.2s", "important");
            });

            return mainPanels;
        }

        function extractOrderNumber(text) {
            if (!text) return null;
            const match = text.match(/[#(]?\s*(22[\d\s-]{10,})\s*[)]?/);
            if (!match) return null;
            const digits = match[1].replace(/\D/g, '');
            return /^22\d{10}$/.test(digits) ? digits : null;
        }

        function isValidName(str) {
            if (!str) return false;
            const cleaned = str.trim();
            if (cleaned.length < 3) return false;
            if (!/[A-Za-z]/.test(cleaned)) return false;
            return /^[A-Za-z0-9'\-\.\s]+$/.test(cleaned);
        }

        function isValidAddress(str) {
            if (!str) return false;
            const cleaned = str.trim();
            if (cleaned.length < 5) return false;
            const words = cleaned.split(/\s+/);
            if (words.length < 2) return false;
            return /[A-Za-z]/.test(cleaned);
        }

        function escapeHtml(text) {
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        function renderAddress(addr) {
            if (!addr) return '<span style="color:#aaa">-</span>';
            const parts = addr.split(/,\s*/);

            let firstLine = parts.shift() || '';
            let secondLine = parts.join(', ');

            if (parts.length > 2) {
                const extra = parts.shift();
                firstLine = `${firstLine}, ${extra}`;
                secondLine = parts.join(', ');
            }

            const display = secondLine ? `${escapeHtml(firstLine)}<br>${escapeHtml(secondLine)}`
                                        : escapeHtml(firstLine);
            const escFull = escapeHtml(addr);
            return `<span class="address-wrapper"><a href="#" class="copilot-address" data-address="${escFull}">${display}</a><span class="copilot-usps" data-address="${escFull}" title="USPS Lookup"> ✉️</span></span>`;
        }

        function renderCopy(text) {
            if (!text) return '<span style="color:#aaa">-</span>';
            const esc = escapeHtml(text);
            return `<span class="copilot-copy" data-copy="${esc}">${esc}</span>`;
        }

        function parseOrderDetails(text) {
            const details = {};

            const compName = text.match(/Company Name[:\s]*([^\n]+)/i);
            if (compName && isValidName(compName[1])) details.companyName = compName[1].trim();

            const purpose = text.match(/Purpose[:\s]*([^\n]+)/i);
            if (purpose) details.purpose = purpose[1].trim();

            const compAddr = text.match(/(?:Company\s*)?Address[:\s]*([^\n]+)/i);
            if (compAddr && isValidAddress(compAddr[1])) details.companyAddress = compAddr[1].trim();

            const raName = text.match(/(?:RA|Registered Agent) Name[:\s]*([^\n]+)/i);
            if (raName && isValidName(raName[1])) details.raName = raName[1].trim();

            const raAddr = text.match(/(?:RA|Registered Agent) Address[:\s]*([^\n]+)/i);
            if (raAddr && isValidAddress(raAddr[1])) details.raAddress = raAddr[1].trim();

            const people = [];
            const memberRegex = /(Member|Director|Officer|Shareholder)\s*Name[:\s]*([^\n]+)\n(?:.*?(?:Address)[:\s]*([^\n]+))?/gi;
            let m;
            while ((m = memberRegex.exec(text)) !== null) {
                const entry = { role: m[1], name: m[2].trim() };
                if (!isValidName(entry.name)) continue;
                if (m[3] && isValidAddress(m[3])) entry.address = m[3].trim();
                people.push(entry);
            }
            if (people.length) details.people = people;

            return details;
        }

        function extractOrderContextFromEmail() {
            try {
                const senderSpan = document.querySelector("h3.iw span[email]");
                const senderEmail = senderSpan?.getAttribute("email") || null;
                const senderName = senderSpan?.innerText?.trim() || null;

                const subjectText = document.querySelector('h2.hP')?.innerText || "";
                const a3sNodes = document.querySelectorAll('.a3s');
                let fullText = subjectText;
                a3sNodes.forEach(n => {
                    if (n.innerText) fullText += "\n" + n.innerText;
                });

                if (!fullText.trim()) {
                    console.warn("[Copilot] .a3s no tiene texto visible.");
                    return null;
                }

                const orderNumber = extractOrderNumber(fullText);
                const details = parseOrderDetails(fullText);

                let fallbackName = null;
                const helloLine = fullText.match(/Hello\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
                if (helloLine && helloLine[1]) fallbackName = helloLine[1];

                const finalName = senderName || fallbackName || null;

                // Log para depurar
                console.log("[Copilot] Order:", orderNumber);
                console.log("[Copilot] Email (remitente):", senderEmail);
                console.log("[Copilot] Name (prioridad remitente):", finalName);

                return {
                    orderNumber,
                    email: senderEmail,
                    name: finalName,
                    details
                };
            } catch (err) {
                console.warn("[Copilot] Error extrayendo contexto:", err);
                return null;
            }
        }

        function fillOrderSummaryBox(context) {
            const summaryBox = document.getElementById('order-summary-content');
            if (!summaryBox) return;
            const email = context?.email ? context.email.toLowerCase() : null;
            summaryBox.innerHTML = `
                <div><strong>Order:</strong> ${renderCopy(context?.orderNumber)}</div>
                <div><strong>Email:</strong> ${renderCopy(email)}</div>
                <div><strong>Name:</strong> ${renderCopy(context?.name)}</div>
            `;
            attachCommonListeners(summaryBox);
            console.log("[FENNEC] Order Summary rellenado:", context);
            if (context?.details) {
                console.log("[FENNEC] Detalles de la orden:", context.details);
            }
        }

        function fillIntelBox(context) {
            const intelBox = document.getElementById('intel-summary-content');
            if (!intelBox) return;

            const details = context?.details || {};
            const namesSet = new Set();
            const addrSet = new Set();

            const addName = n => {
                if (n && n !== context?.name && !namesSet.has(n)) namesSet.add(n);
            };
            const addAddr = a => {
                if (a && !addrSet.has(a)) addrSet.add(a);
            };

            addName(details.companyName);
            addName(details.raName);
            if (details.people) details.people.forEach(p => {
                addName(p.name);
                if (p.address) addAddr(p.address);
            });

            addAddr(details.companyAddress);
            addAddr(details.raAddress);

            const nameHtml = Array.from(namesSet).map(n => `<div>${renderCopy(n)}</div>`).join('');
            const addrHtml = Array.from(addrSet).map(a => `<div>${renderAddress(a)}</div>`).join('');

            if (!nameHtml && !addrHtml) {
                intelBox.innerHTML = '<span style="color:#ccc">No intel found.</span>';
            } else {
                let html = '';
                if (nameHtml) html += `<div><u>Names</u></div>${nameHtml}`;
                if (addrHtml) {
                    if (nameHtml) html += '<hr style="border:none;border-top:1px solid #555;margin:6px 0"/>';
                    html += `<div><u>Addresses</u></div>${addrHtml}`;
                }
                intelBox.innerHTML = html;
            }
            attachCommonListeners(intelBox);
        }

        function attachCommonListeners(rootEl) {
            if (!rootEl) return;
            rootEl.querySelectorAll('.copilot-address').forEach(el => {
                el.addEventListener('click', e => {
                    e.preventDefault();
                    const addr = el.dataset.address;
                    if (!addr) return;
                    navigator.clipboard.writeText(addr).catch(err => console.warn('[Copilot] Clipboard', err));
                    window.open('https://www.google.com/search?q=' + encodeURIComponent(addr), '_blank');
                });
            });
            rootEl.querySelectorAll('.copilot-usps').forEach(el => {
                el.addEventListener('click', e => {
                    e.preventDefault();
                    const addr = el.dataset.address;
                    if (!addr) return;
                    const url = 'https://tools.usps.com/zip-code-lookup.htm?byaddress&fennec_addr=' + encodeURIComponent(addr);
                    window.open(url, '_blank');
                });
            });
            rootEl.querySelectorAll('.copilot-copy').forEach(el => {
                el.addEventListener('click', () => {
                    const text = el.dataset.copy;
                    if (!text) return;
                    navigator.clipboard.writeText(text).catch(err => console.warn('[Copilot] Clipboard', err));
                });
            });
        }

        function handleEmailSearchClick() {
            const context = extractOrderContextFromEmail();
            fillOrderSummaryBox(context);
            fillIntelBox(context);

            if (!context || !context.email) {
                alert("No se pudo detectar el correo del cliente.");
                return;
            }

            const queryParts = [];
            if (context.orderNumber) {
                queryParts.push(context.orderNumber);
                queryParts.push(`subject:"${context.orderNumber}"`);
            }
            if (context.email) queryParts.push(`"${context.email}"`);
            if (context.name) queryParts.push(`"${context.name}"`);

            const finalQuery = queryParts.join(" OR ");
            const gmailSearchUrl = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(finalQuery)}`;

            const urls = [gmailSearchUrl];

            if (context.orderNumber) {
                const dbOrderUrl = `https://db.incfile.com/incfile/order/detail/${context.orderNumber}`;
                urls.push(dbOrderUrl);
            } else {
                const dbSearchUrl = "https://db.incfile.com/order-tracker/orders/order-search";
                urls.push(dbSearchUrl);
                navigator.clipboard.writeText(context.email).catch(err => console.error("[FENNEC] Clipboard error:", err));
            }

            chrome.runtime.sendMessage({ action: "replaceTabs", urls });
        }

        function injectSidebar(mainPanels) {
            if (document.getElementById('copilot-sidebar')) return;

            const sidebar = document.createElement('div');
            sidebar.id = 'copilot-sidebar';
            sidebar.innerHTML = `
                <div class="copilot-header">
                    <div class="copilot-title">
                        <img src="${chrome.runtime.getURL('fennec_icon.png')}" class="copilot-icon" alt="FENNEC (Prototype)" />
                        <span>FENNEC (Prototype)</span>
                    </div>
                    <button id="copilot-close">✕</button>
                </div>
                <div class="copilot-body">
                    <p>Hi, it's Fennec. Check your options below:</p>
                    <div class="copilot-actions">
                        <button id="btn-email-search" class="copilot-button">📧 EMAIL SEARCH</button>
                        <button id="btn-open-order" class="copilot-button">📂 OPEN ORDER</button>
                    </div>
                    <div class="order-summary-box">
                        <strong>ORDER SUMMARY</strong><br>
                        <div id="order-summary-content" style="color:#ccc; font-size:13px;">
                            No order data yet.
                        </div>
                    </div>
                    <div class="intel-summary-box">
                        <strong>POTENTIAL INTEL</strong><br>
                        <div id="intel-summary-content" style="color:#ccc; font-size:13px;">
                            No intel yet.
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(sidebar);
            console.log("[Copilot] Sidebar INYECTADO en Gmail.");

            const ctx = extractOrderContextFromEmail();
            fillOrderSummaryBox(ctx);
            fillIntelBox(ctx);

            // Botón de cierre
            document.getElementById('copilot-close').onclick = () => {
                sidebar.remove();
                // Limpiar el margin aplicado a los paneles
                mainPanels.forEach(el => el.style.marginRight = '');
                sessionStorage.setItem('copilotSidebarClosed', 'true');
                console.log("[Copilot] Sidebar cerrado manualmente en Gmail.");
            };

            // Botón EMAIL SEARCH (listener UNIFICADO)
            document.getElementById("btn-email-search").onclick = handleEmailSearchClick;
        }

        function injectSidebarIfMissing() {
            if (sessionStorage.getItem('copilotSidebarClosed') === 'true') return;
            if (!document.getElementById('copilot-sidebar')) {
                console.log("[Copilot] Sidebar no encontrado, inyectando en Gmail...");
                const mainPanels = applyPaddingToMainPanels();
                injectSidebar(mainPanels);
            }
        }

        // Observador para reaplicar el padding cuando Gmail altere el DOM
        const observer = new MutationObserver(() => {
            const sidebarExists = !!document.getElementById('copilot-sidebar');
            if (sidebarExists) applyPaddingToMainPanels();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        setInterval(injectSidebarIfMissing, 1200);
        console.log("[Copilot] Intervalo de chequeo de sidebar lanzado (Gmail).");

        // --- OPEN ORDER listener robusto, sin cambios ---
        function waitForElement(selector, timeout = 10000) {
            return new Promise((resolve, reject) => {
                const intervalTime = 100;
                let elapsed = 0;

                const interval = setInterval(() => {
                    const element = document.querySelector(selector);
                    if (element) {
                        clearInterval(interval);
                        resolve(element);
                    } else if (elapsed >= timeout) {
                        clearInterval(interval);
                        reject("Elemento no encontrado: " + selector);
                    }
                    elapsed += intervalTime;
                }, intervalTime);
            });
        }

        waitForElement("#btn-open-order").then((button) => {
            button.addEventListener("click", function () {
                try {
                    const bodyNode = document.querySelector(".a3s");
                    if (!bodyNode) {
                        alert("No se encontró el cuerpo del correo.");
                        return;
                    }

                    const subjectText = document.querySelector('h2.hP')?.innerText || "";
                    const text = subjectText + "\n" + (bodyNode.innerText || "");
                    const orderId = extractOrderNumber(text);
                    if (!orderId) {
                        alert("No se encontró ningún número de orden válido en el correo.");
                        return;
                    }
                    const url = `https://db.incfile.com/incfile/order/detail/${orderId}`;
                    chrome.runtime.sendMessage({ action: "replaceTabs", urls: [url] });
                } catch (error) {
                    console.error("Error al intentar abrir la orden:", error);
                    alert("Ocurrió un error al intentar abrir la orden.");
                }
            });
        }).catch((err) => {
            console.warn("[OPEN ORDER] No se pudo inyectar el listener:", err);
        });

    } catch (e) {
        console.error("[Copilot] ERROR en Gmail Launcher:", e);
    }
    });
})();
