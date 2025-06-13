// Injects the FENNEC sidebar into Gmail pages.
(function persistentSidebar() {
    // Clear the closed flag on full reloads so the sidebar returns
    window.addEventListener('beforeunload', () => {
        sessionStorage.removeItem('copilotSidebarClosed');
    });
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

        const IGNORED_ADDRESSES = [
            'BIZEE.COM 17350 STATE HIGHWAY 249, SUITE 220, HOUSTON, TX 77064'
        ];

        const STATE_NAMES = [
            'ALABAMA','ALASKA','ARIZONA','ARKANSAS','CALIFORNIA','COLORADO',
            'CONNECTICUT','DELAWARE','FLORIDA','GEORGIA','HAWAII','IDAHO',
            'ILLINOIS','INDIANA','IOWA','KANSAS','KENTUCKY','LOUISIANA',
            'MAINE','MARYLAND','MASSACHUSETTS','MICHIGAN','MINNESOTA',
            'MISSISSIPPI','MISSOURI','MONTANA','NEBRASKA','NEVADA',
            'NEW HAMPSHIRE','NEW JERSEY','NEW MEXICO','NEW YORK',
            'NORTH CAROLINA','NORTH DAKOTA','OHIO','OKLAHOMA','OREGON',
            'PENNSYLVANIA','RHODE ISLAND','SOUTH CAROLINA','SOUTH DAKOTA',
            'TENNESSEE','TEXAS','UTAH','VERMONT','VIRGINIA','WASHINGTON',
            'WEST VIRGINIA','WISCONSIN','WYOMING'
        ];

        const STATE_ABBRS = [
            'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
            'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
            'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV',
            'WI','WY'
        ];

        function isValidAddress(str) {
            if (!str) return false;
            let cleaned = str.trim()
                .replace(/\s+/g, ' ')
                .replace(/\s*,\s*/g, ', ')
                .replace(/\s*#\s*/g, ' #');

            const normalized = cleaned.toUpperCase();
            if (IGNORED_ADDRESSES.includes(normalized)) return false;

            if (cleaned.length < 5) return false;
            if (!/[A-Za-z]/.test(cleaned)) return false;

            const startsWithNum = /^\d/.test(cleaned) || /\bP\.?O\.?\s+BOX\b/i.test(cleaned);
            if (!startsWithNum) return false;

            const stateZip = /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?(?:\s+USA?)?\b/i;
            const stateNameZip = new RegExp('\\b(' + STATE_NAMES.join('|') + ')\\b\\s+\\d{5}(?:-\\d{4})?(?:\\s+USA?)?\\b', 'i');
            const stateOnly = new RegExp('\\b(' + STATE_ABBRS.join('|') + '|' + STATE_NAMES.join('|') + ')\\b', 'i');

            if (!(stateZip.test(cleaned) || stateNameZip.test(cleaned) || stateOnly.test(cleaned))) {
                return false;
            }

            if (/\bP\.?O\.?\s+BOX\b/i.test(cleaned)) {
                return /\b\d{1,}\b/.test(cleaned);
            }
            return /\d/.test(cleaned);
        }

        function cleanAddress(str) {
            return str
                .replace(/\s+/g, ' ')
                .replace(/\s*,\s*/g, ', ')
                .replace(/\s*#\s*/g, ' #')
                .trim();
        }

        function extractPotentialAddresses(text) {
            if (!text) return [];
            const addrs = [];
            const lines = text.split(/\n+/);
            const keyword = /\b(?:st(?:reet)?|ave(?:nue)?|road|rd|dr|boulevard|blvd|lane|ln|hwy|p\.?o\.?\s*box|suite|ste|apt|apartment)\b/i;
            const startZip = /^\s*\d+[\w\s.,#-]*\b\d{5}(?:-\d{4})?\b/i;
            const startState = new RegExp('^\\s*\\d+[\\w\\s.,#-]*\\b(' + STATE_ABBRS.join('|') + '|' + STATE_NAMES.join('|') + ')\\b', 'i');
            lines.forEach(line => {
                const cleaned = cleanAddress(line);
                if (cleaned.length < 8) return;
                if (!(startZip.test(cleaned) || startState.test(cleaned) || keyword.test(cleaned))) return;
                if (!isValidAddress(cleaned)) return;
                if (!addrs.includes(cleaned)) addrs.push(cleaned);
            });
            return addrs;
        }

        function isLikelyCompany(name) {
            if (!name) return false;
            const designators = [
                'LLC', 'L.L.C', 'INC', 'CORP', 'CORPORATION', 'COMPANY', 'CO',
                'LTD', 'LIMITED', 'LLP', 'LP', 'PLC', 'PC', 'PA'
            ];
            const regex = new RegExp('\\b(' + designators.join('|') + ')\\.?\\b', 'i');
            return regex.test(name);
        }

        function extractCompanyNames(text) {
            if (!text) return [];

            const designators = [
                'LLC', 'L.L.C', 'INC', 'CORP', 'CORPORATION', 'COMPANY', 'CO',
                'LTD', 'LIMITED', 'LLP', 'LP', 'PLC', 'PC', 'PA'
            ];
            const designatorsDot = [
                'L.L.C.', 'INC.', 'CORP.', 'CO.', 'LTD.', 'L.L.P.',
                'L.P.', 'P.L.C.', 'P.C.', 'P.A.'
            ];

            const namesMap = new Map();
            const lines = text.split(/\n+/);

            for (const line of lines) {
                const tokens = line.trim().split(/\s+/);
                for (let i = 0; i < tokens.length; i++) {
                    const raw = tokens[i];
                    const clean = raw.replace(/^[^A-Za-z0-9&]+|[^A-Za-z0-9&.,]+$/g, '');
                    if (!clean) continue;

                    const base = clean.replace(/[.,]+$/, '');
                    const upper = base.toUpperCase();

                    if (designators.includes(upper) || designatorsDot.includes(clean.toUpperCase())) {
                        const parts = [clean];
                        const designatorWithDot = designatorsDot.includes(clean.toUpperCase());

                        let j = i - 1, count = 0;
                        while (j >= 0 && count < 6) {
                            const prev = tokens[j];
                            const prevClean = prev.replace(/^[^A-Za-z0-9&]+|[^A-Za-z0-9&.,]+$/g, '');
                            if (!prevClean) { j--; count++; continue; }
                            if (/^[a-z]/.test(prevClean)) break;
                            parts.unshift(prevClean);
                            if (prevClean.length > 2 && /[.!?]$/.test(prevClean)) break;
                            j--; count++;
                        }

                        let candidate = parts.join(' ')      
                            .replace(/\s+,/g, ',')
                            .replace(/\s+&\s+/g, ' & ');

                        if (!designatorWithDot) candidate = candidate.replace(/[.,]+$/, '');
                        candidate = candidate.trim();

                        const key = candidate.toUpperCase();
                        if (candidate.split(' ').length > 1 && !namesMap.has(key)) {
                            namesMap.set(key, candidate);
                        }
                    }
                }
            }

            return Array.from(namesMap.values());
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
            addr = cleanAddress(addr);
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

            const compName = text.match(/Company Name\s*(?:[:\-]|\n)\s*([^\n]+)/i);
            if (compName && isValidName(compName[1])) details.companyName = compName[1].trim();

            const purpose = text.match(/Purpose\s*(?:[:\-]|\n)\s*([^\n]+)/i);
            if (purpose) details.purpose = purpose[1].trim();

            const compAddr = text.match(/(?:Company\s*)?Address\s*(?:[:\-]|\n)\s*([^\n]+)/i);
            if (compAddr && isValidAddress(compAddr[1])) details.companyAddress = cleanAddress(compAddr[1]);

            const raName = text.match(/(?:RA|Registered Agent) Name\s*(?:[:\-]|\n)\s*([^\n]+)/i);
            if (raName && isValidName(raName[1])) details.raName = raName[1].trim();

            const raAddr = text.match(/(?:RA|Registered Agent) Address\s*(?:[:\-]|\n)\s*([^\n]+)/i);
            if (raAddr && isValidAddress(raAddr[1])) details.raAddress = cleanAddress(raAddr[1]);

            const people = [];
            const memberRegex = /(Member|Director|Officer|Shareholder)\s*Name\s*(?:[:\-]|\n)\s*([^\n]+)\n(?:.*?(?:Address)\s*(?:[:\-]|\n)\s*([^\n]+))?/gi;
            let m;
            while ((m = memberRegex.exec(text)) !== null) {
                const entry = { role: m[1], name: m[2].trim() };
                if (!isValidName(entry.name)) continue;
                if (m[3] && isValidAddress(m[3])) entry.address = cleanAddress(m[3]);
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
                const companies = extractCompanyNames(fullText);

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
                    details,
                    companies,
                    rawText: fullText
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
            const companyMap = new Map();
            const peopleMap = new Map();
            const addrSet = new Set();

            const addCompany = n => {
                if (!n || n === context?.name) return;
                const key = n.trim().toUpperCase();
                if (!companyMap.has(key)) companyMap.set(key, n.trim());
            };
            const addPerson = n => {
                if (!n || n === context?.name) return;
                const key = n.trim().toUpperCase();
                if (!peopleMap.has(key)) peopleMap.set(key, n.trim());
            };
            const addAddr = a => {
                if (!a) return;
                const cleaned = cleanAddress(a);
                if (cleaned && !addrSet.has(cleaned)) addrSet.add(cleaned);
            };

            if (details.companyName) {
                if (isLikelyCompany(details.companyName)) addCompany(details.companyName);
                else addPerson(details.companyName);
            }

            if (details.raName) {
                if (isLikelyCompany(details.raName)) addCompany(details.raName);
                else addPerson(details.raName);
            }

            if (details.people) details.people.forEach(p => {
                if (isLikelyCompany(p.name)) addCompany(p.name); else addPerson(p.name);
                if (p.address) addAddr(p.address);
            });

            addAddr(details.companyAddress);
            addAddr(details.raAddress);

            if (context?.rawText) {
                extractPotentialAddresses(context.rawText).forEach(addAddr);
            }

            if (Array.isArray(context?.companies)) {
                context.companies.forEach(addCompany);
            }

            const compHtml = Array.from(companyMap.values()).map(n => `<div>${renderCopy(n)}</div>`).join('');
            const peopleHtml = Array.from(peopleMap.values()).map(n => `<div>${renderCopy(n)}</div>`).join('');
            const addrHtml = Array.from(addrSet).map(a => `<div>${renderAddress(a)}</div>`).join('');

            if (!compHtml && !peopleHtml && !addrHtml) {
                intelBox.innerHTML = '<span style="color:#ccc">No intel found.</span>';
            } else {
                let html = '';
                if (compHtml) html += `<div><u>Company Names</u></div>${compHtml}`;
                if (peopleHtml) {
                    if (compHtml) html += '<hr style="border:none;border-top:1px solid #555;margin:6px 0"/>';
                    html += `<div><u>Individual Names</u></div>${peopleHtml}`;
                }
                if (addrHtml) {
                    if (compHtml || peopleHtml) html += '<hr style="border:none;border-top:1px solid #555;margin:6px 0"/>';
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

        function fillIssueBox(info, orderId) {
            const box = document.getElementById('issue-summary-box');
            const content = document.getElementById('issue-summary-content');
            const label = document.getElementById('issue-status-label');
            if (!box || !content || !label) return;
            box.style.display = 'block';
            if (info && info.text) {
                content.textContent = info.text;
                label.textContent = info.active ? 'ACTIVE' : 'RESOLVED';
                label.className = 'issue-status-label ' + (info.active ? 'issue-status-active' : 'issue-status-resolved');
            } else {
                const link = orderId ? `<a href="https://db.incfile.com/incfile/order/detail/${orderId}" target="_blank">${orderId}</a>` : '';
                content.innerHTML = `NO ISSUE DETECTED FROM ORDER: ${link}`;
                label.textContent = '';
                label.className = 'issue-status-label';
            }
        }

        function checkLastIssue(orderId) {
            if (!orderId) return;
            fillIssueBox(null, orderId);
            chrome.runtime.sendMessage({ action: "checkLastIssue", orderId }, (resp) => {
                if (chrome.runtime.lastError) {
                    console.warn("[Copilot] Issue check failed:", chrome.runtime.lastError.message);
                    fillIssueBox(null, orderId);
                    return;
                }
                fillIssueBox(resp && resp.issueInfo, orderId);
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
            if (context.orderNumber) {
                checkLastIssue(context.orderNumber);
            }
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
                    <div class="issue-summary-box" id="issue-summary-box" style="margin-top:10px;">
                        <strong>ISSUE <span id="issue-status-label" class="issue-status-label"></span></strong><br>
                        <div id="issue-summary-content" style="color:#ccc; font-size:13px;">No issue data yet.</div>
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
                    checkLastIssue(orderId);
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
