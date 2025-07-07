// Auto-navigates to the DNA page and collects payment/transaction info when an
// order number is provided via ?fennec_order= in the URL or session storage.
(function() {
    chrome.storage.local.get({ extensionEnabled: true }, ({ extensionEnabled }) => {
        if (!extensionEnabled) {
            console.log('[FENNEC] Extension disabled, skipping Adyen launcher.');
            return;
        }

        try {
            const params = new URLSearchParams(window.location.search);
            const orderParam = params.get('fennec_order');
            if (orderParam) {
                sessionStorage.setItem('fennec_order', orderParam);
            }

            const order = sessionStorage.getItem('fennec_order');

            function waitForElement(selector, timeout = 10000) {
                return new Promise(resolve => {
                    const interval = 250;
                    let elapsed = 0;
                    const run = () => {
                        const el = document.querySelector(selector);
                        if (el) {
                            resolve(el);
                        } else if (elapsed >= timeout) {
                            resolve(null);
                        } else {
                            elapsed += interval;
                            setTimeout(run, interval);
                        }
                    };
                    run();
                });
            }

            function fillAndSubmit() {
                console.log('[FENNEC Adyen] Filling search form for order', order);
                waitForElement('.header-search__input, input[name="query"]').then(input => {
                    try {
                        if (!input) return;
                        input.focus();
                        input.value = order;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        const payments = document.querySelector('input[type="radio"][value="payments"]');
                        if (payments) payments.click();
                        waitForElement('button[type="submit"], input[type="submit"], button[aria-label*="search" i]').then(btn => {
                            if (btn) btn.click();
                        });
                    } catch (err) {
                        console.error('[FENNEC Adyen] Error filling form:', err);
                    }
                });
            }

            function openMostRecent() {
                waitForElement('a[href*="showTx.shtml?pspReference="]').then(link => {
                    try {
                        if (link) {
                            console.log('[FENNEC Adyen] Opening most recent transaction');
                            link.click();
                        }
                    } catch (err) {
                        console.error('[FENNEC Adyen] Error opening result:', err);
                    }
                });
            }

            function saveData(part) {
                chrome.storage.local.get({ adyenDnaInfo: {} }, ({ adyenDnaInfo }) => {
                    const updated = Object.assign({}, adyenDnaInfo, part);
                    chrome.storage.local.set({ adyenDnaInfo: updated });
                    console.log('[FENNEC Adyen] Data saved', part);
                });
            }

            function buildTransactionTable(tx) {
                if (!tx) return "";
                const colors = {
                    "Total": "lightgray",
                    "Authorised / Settled": "green",
                    "Settled": "green",
                    "Refused": "purple",
                    "Refunded": "black",
                    "Chargebacks": "black",
                    "Chargeback": "black"
                };

                function parseAmount(str) {
                    if (!str) return 0;
                    const n = parseFloat(str.replace(/[^0-9.]/g, ""));
                    return isNaN(n) ? 0 : n;
                }

                const entries = Object.keys(tx).map(k => {
                    const t = tx[k];
                    let label = k;
                    if (label === "Authorised / Settled") label = "Settled";
                    else if (label === "Total transactions") label = "Total";
                    else if (label === "Refunded / Cancelled") label = "Refunded";
                    return { label, count: t.count || "", amount: t.amount || "" };
                });
                if (!entries.length) return "";

                const total = entries.find(e => e.label === "Total") || { amount: 0 };
                const totalVal = parseAmount(total.amount);

                entries.sort((a, b) => (a.label === "Total" ? -1 : b.label === "Total" ? 1 : 0));

                const rows = entries.map(e => {
                    const cls = "copilot-tag-" + (colors[e.label] || "white");
                    const amountVal = parseAmount(e.amount);
                    const pct = totalVal ? Math.round(amountVal / totalVal * 100) : 0;
                    const amount = (e.amount || "").replace("EUR", "€");
                    const pctText = totalVal ? ` (${pct}%)` : "";
                    const label = escapeHtml(e.label.toUpperCase() + ": ");
                    const count = `<span class="dna-count">${escapeHtml(e.count)}</span>`;
                    return `<tr><td><span class="copilot-tag dna-label ${cls}">${label}${count}</span></td><td>${escapeHtml(amount)}${escapeHtml(pctText)}</td></tr>`;
                }).join("");

                return `<table class="dna-tx-table"><thead><tr><th>Type</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`;
            }

            function renderBillingAddress(addr) {
                if (!addr) return '<span style="color:#aaa">-</span>';
                let line1 = '';
                let line2 = '';
                if (typeof addr === 'object') {
                    const p1 = [];
                    if (addr.street1) p1.push(addr.street1.trim());
                    if (addr.street2) p1.push(addr.street2.trim());
                    line1 = p1.join(' ');

                    const p2 = [];
                    if (addr.city) p2.push(addr.city.trim());
                    if (addr.state) p2.push(addr.state.trim());
                    if (addr.zip) p2.push(addr.zip.trim());
                    if (addr.country) p2.push(addr.country.trim());
                    line2 = p2.join(', ');
                    addr = [line1, line2].filter(Boolean).join(', ');
                } else {
                    const parts = String(addr).split(/,\s*/);
                    line1 = parts.shift() || '';
                    line2 = parts.join(', ');
                }

                const lines = [];
                if (line1) lines.push(escapeHtml(line1));
                if (line2) lines.push(escapeHtml(line2));
                const esc = escapeHtml(addr);
                return `<span class="address-wrapper"><a href="#" class="copilot-address" data-address="${esc}">${lines.join('<br>')}</a><span class="copilot-usps" data-address="${esc}" title="USPS Lookup"> ✉️</span><span class="copilot-copy-icon" data-copy="${esc}" title="Copy">⧉</span></span>`;
            }

            function buildCardMatchTag(info) {
                const card = info.payment.card || {};
                const db = info.dbBilling || {};
                const nameMatch = db.cardholder && card["Card holder"] && db.cardholder.trim().toUpperCase() === card["Card holder"].trim().toUpperCase();
                const last4Match = db.last4 && card["Card number"] && db.last4.replace(/\D+/g, '').slice(-4) === card["Card number"].replace(/\D+/g, '').slice(-4);
                const expMatch = db.expiry && card["Expiry date"] && db.expiry.replace(/\D+/g, '').slice(0,4) === card["Expiry date"].replace(/\D+/g, '').slice(0,4);
                let compared = 0;
                let matches = 0;
                const mism = [];
                if (db.cardholder && card["Card holder"]) { compared++; if (nameMatch) matches++; else mism.push('NAME ✖️'); }
                if (db.last4 && card["Card number"]) { compared++; if (last4Match) matches++; else mism.push('LAST 4 ✖️'); }
                if (db.expiry && card["Expiry date"]) { compared++; if (expMatch) matches++; else mism.push('EXP DATE ✖️'); }
                if (!compared) return '';
                let text = '';
                let cls = 'copilot-tag copilot-tag-green';
                if (matches === compared) {
                    text = 'DB: MATCH';
                } else if (matches === 0) {
                    text = 'DB: NO MATCH';
                    cls = 'copilot-tag copilot-tag-purple';
                } else {
                    text = 'DB: PARTIAL (' + mism.join(' ') + ')';
                    cls = 'copilot-tag copilot-tag-purple';
                }
                return `<span class="${cls}">${escapeHtml(text)}</span>`;
            }

            function buildDnaHtml(info) {
                if (!info || !info.payment) return null;
                const p = info.payment;
                const card = p.card || {};
                const shopper = p.shopper || {};
                const proc = p.processing || {};

                const parts = [];

                if (card['Card holder']) {
                    const holder = `<b>${escapeHtml(card['Card holder'])}</b>`;
                    parts.push(`<div>${holder}</div>`);
                }

                const cardLine = [];
                if (card['Payment method']) cardLine.push(escapeHtml(card['Payment method']));
                if (card['Card number']) {
                    const digits = card['Card number'].replace(/\D+/g, '').slice(-4);
                    if (digits) cardLine.push(escapeHtml(digits));
                }
                if (card['Expiry date']) cardLine.push(escapeHtml(card['Expiry date']));
                if (card['Funding source']) cardLine.push(escapeHtml(card['Funding source']));
                if (cardLine.length) parts.push(`<div>${cardLine.join(' \u2022 ')}</div>`);

                if (shopper['Billing address']) {
                    parts.push(`<div class="dna-address">${renderBillingAddress(shopper['Billing address'])}</div>`);
                    if (card['Issuer name'] || card['Issuer country/region']) {
                        let bank = (card['Issuer name'] || '').trim();
                        if (bank.length > 25) bank = bank.slice(0, 22) + '...';
                        const country = (card['Issuer country/region'] || '').trim();
                        let countryInit = '';
                        if (country) {
                            countryInit = country.split(/\s+/).map(w => w.charAt(0)).join('').toUpperCase();
                            countryInit = ` (<span class="dna-country"><b>${escapeHtml(countryInit)}</b></span>)`;
                        }
                        parts.push(`<div class="dna-issuer">${escapeHtml(bank)}${countryInit}</div>`);
                    }
                }

                const cvv = proc['CVC/CVV'];
                const avs = proc['AVS'];

                function colorFor(result) {
                    if (result === 'green') return 'copilot-tag-green';
                    if (result === 'purple') return 'copilot-tag-purple';
                    return 'copilot-tag-black';
                }

                function formatCvv(text) {
                    const t = (text || '').toLowerCase();
                    if ((/\bmatch(es|ed)?\b/.test(t) || /\(m\)/.test(t)) && !/not\s+match/.test(t)) {
                        return { label: 'CVV: MATCH', result: 'green', reason: text };
                    }
                    if (/not\s+match/.test(t) || /\(n\)/.test(t)) {
                        return { label: 'CVV: NO MATCH', result: 'purple', reason: text };
                    }
                    if (/not provided|not checked|error|not supplied|unknown/.test(t)) {
                        return { label: 'CVV: UNKNOWN', result: 'black', reason: text };
                    }
                    return { label: 'CVV: UNKNOWN', result: 'black', reason: text };
                }

                function formatAvs(text) {
                    const t = (text || '').toLowerCase();
                    if (/both\s+postal\s+code\s+and\s+address\s+match/.test(t) || /^7\b/.test(t) || t.includes('both match')) {
                        return { label: 'AVS: MATCH', result: 'green', reason: text };
                    }
                    if (/^6\b/.test(t) || (t.includes('postal code matches') && t.includes("address doesn't"))) {
                        return { label: 'AVS: PARTIAL (STREET✖️)', result: 'purple', reason: text };
                    }
                    if (/^1\b/.test(t) || (t.includes('address matches') && t.includes("postal code doesn't"))) {
                        return { label: 'AVS: PARTIAL (ZIP✖️)', result: 'purple', reason: text };
                    }
                    if (/^2\b/.test(t) || t.includes('neither matches') || /\bw\b/.test(t)) {
                        return { label: 'AVS: NO MATCH', result: 'purple', reason: text };
                    }
                    if (/^0\b/.test(t) || /^3\b/.test(t) || /^4\b/.test(t) || /^5\b/.test(t) || t.includes('unavailable') || t.includes('not supported') || t.includes('no avs') || t.includes('unknown')) {
                        return { label: 'AVS: UNKNOWN', result: 'black', reason: text };
                    }
                    return { label: 'AVS: UNKNOWN', result: 'black', reason: text };
                }

                if (cvv || avs) {
                    const tags = [];
                    if (cvv) {
                        const { label, result, reason } = formatCvv(cvv);
                        tags.push(`<span class="copilot-tag ${colorFor(result)}" title="${escapeHtml(reason)}">${escapeHtml(label)}</span>`);
                    }
                    if (avs) {
                        const { label, result, reason } = formatAvs(avs);
                        tags.push(`<span class="copilot-tag ${colorFor(result)}" title="${escapeHtml(reason)}">${escapeHtml(label)}</span>`);
                    }
                    const cardTag = buildCardMatchTag(info);
                    if (cardTag) tags.push(cardTag);
                    if (tags.length) parts.push(`<div>${tags.join(' ')}</div>`);
                }

                if (proc['Fraud scoring']) parts.push(`<div><b>Fraud scoring:</b> ${escapeHtml(proc['Fraud scoring'])}</div>`);

                if (parts.length) {
                    parts.push('<hr style="border:none;border-top:1px solid #555;margin:6px 0"/>');
                }

                const txTable = buildTransactionTable(info.transactions || {});
                if (txTable) parts.push(txTable);

                if (!parts.length) return null;
                return `<div class="section-label">ADYEN'S DNA</div><div class="white-box" style="margin-bottom:10px">${parts.join('')}</div>`;
            }

            function loadDnaSummary() {
                const container = document.getElementById('dna-summary');
                if (!container) return;
                chrome.storage.local.get({ adyenDnaInfo: null }, ({ adyenDnaInfo }) => {
                    chrome.storage.local.get({ sidebarOrderInfo: null }, ({ sidebarOrderInfo }) => {
                        if (adyenDnaInfo) adyenDnaInfo.dbBilling = sidebarOrderInfo ? sidebarOrderInfo.billing : null;
                        const html = buildDnaHtml(adyenDnaInfo);
                        container.innerHTML = html || '';
                        attachCommonListeners(container);
                    });
                });
            }

            function loadDbSummary() {
                const container = document.getElementById('db-summary-section');
                if (!container) return;
                chrome.storage.local.get({ sidebarDb: [], sidebarOrderId: null }, ({ sidebarDb, sidebarOrderId }) => {
                    if (Array.isArray(sidebarDb) && sidebarDb.length) {
                        container.innerHTML = sidebarDb.join('');
                        container.style.display = 'block';
                        attachCommonListeners(container);
                        const qbox = container.querySelector('#quick-summary');
                        if (qbox) {
                            qbox.classList.remove('quick-summary-collapsed');
                            qbox.style.maxHeight = 'none';
                        }
                    } else {
                        container.innerHTML = '';
                        container.style.display = 'none';
                    }
                });
            }

            function formatIssueText(text) {
                if (!text) return '';
                let formatted = text.replace(/\s*(\d+\s*[).])/g, (m, g) => '\n' + g + ' ');
                return formatted.replace(/^\n/, '').trim();
            }

            function fillIssueBox(info, orderId) {
                const box = document.getElementById('issue-summary-box');
                const content = document.getElementById('issue-summary-content');
                const label = document.getElementById('issue-status-label');
                if (!box || !content || !label) return;
                box.style.display = 'block';
                if (info && info.text) {
                    content.textContent = formatIssueText(info.text);
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
                const content = document.getElementById('issue-summary-content');
                const label = document.getElementById('issue-status-label');
                if (content && label) {
                    content.innerHTML = `<img src="${chrome.runtime.getURL('fennec_icon.png')}" class="loading-fennec"/>`;
                    label.textContent = '';
                    label.className = 'issue-status-label';
                }
                chrome.runtime.sendMessage({ action: 'checkLastIssue', orderId }, (resp) => {
                    if (chrome.runtime.lastError) {
                        console.warn('[Copilot] Issue check failed:', chrome.runtime.lastError.message);
                        fillIssueBox(null, orderId);
                        return;
                    }
                    fillIssueBox(resp && resp.issueInfo, orderId);
                });
            }

            function showInitialStatus() {
                const db = document.getElementById('db-summary-section');
                const dna = document.getElementById('dna-summary');
                const issueBox = document.getElementById('issue-summary-box');
                if (db) { db.innerHTML = ''; db.style.display = 'none'; }
                if (dna) dna.innerHTML = '';
                if (issueBox) {
                    issueBox.style.display = 'none';
                    const content = issueBox.querySelector('#issue-summary-content');
                    const label = issueBox.querySelector('#issue-status-label');
                    if (content) content.innerHTML = '';
                    if (label) label.textContent = '';
                }
            }

            function clearSidebar() {
                chrome.storage.local.set({
                    sidebarDb: [],
                    sidebarOrderId: null,
                    sidebarOrderInfo: null,
                    adyenDnaInfo: null,
                    sidebarFreezeId: null
                });
                showInitialStatus();
            }

            function injectSidebar() {
                if (document.getElementById('copilot-sidebar')) return;
                const sidebar = document.createElement('div');
                sidebar.id = 'copilot-sidebar';
                sidebar.innerHTML = `
                    <div class="copilot-header">
                        <div class="copilot-title">
                            <img src="${chrome.runtime.getURL('fennec_icon.png')}" class="copilot-icon" alt="FENNEC (BETA)" />
                            <span>FENNEC (BETA)</span>
                        </div>
                        <button id="copilot-close">✕</button>
                    </div>
                    <div class="copilot-body">
                        <div class="copilot-dna">
                            <div id="dna-summary" style="margin-top:16px"></div>
                        </div>
                        <div id="db-summary-section"></div>
                        <div class="issue-summary-box" id="issue-summary-box" style="display:none; margin-top:10px;">
                            <strong>ISSUE <span id="issue-status-label" class="issue-status-label"></span></strong><br>
                            <div id="issue-summary-content" style="color:#ccc; font-size:13px; white-space:pre-line;">No issue data yet.</div>
                        </div>
                        <div class="copilot-footer"><button id="copilot-clear" class="copilot-button">🧹 CLEAR</button></div>
                    </div>`;
                document.body.appendChild(sidebar);
                chrome.storage.sync.get({
                    sidebarFontSize: 13,
                    sidebarFont: "'Inter', sans-serif",
                    sidebarBgColor: '#212121',
                    sidebarBoxColor: '#2e2e2e'
                }, opts => applySidebarDesign(sidebar, opts));
                document.body.style.marginRight = '340px';
                const closeBtn = sidebar.querySelector('#copilot-close');
                if (closeBtn) {
                    closeBtn.onclick = () => {
                        sidebar.remove();
                        document.body.style.marginRight = '';
                    };
                }
                const clearSb = sidebar.querySelector('#copilot-clear');
                if (clearSb) clearSb.onclick = clearSidebar;
                if (order) {
                    loadDbSummary();
                    loadDnaSummary();
                    checkLastIssue(order);
                } else {
                    showInitialStatus();
                }
            }

            function extractSection(title) {
                const headings = Array.from(document.querySelectorAll('h3.adl-heading'));
                const heading = headings.find(h => h.textContent.trim() === title);
                if (!heading) return null;
                const card = heading.closest('section');
                if (!card) return null;
                const rows = card.querySelectorAll('.structured-list__item');
                const data = {};
                rows.forEach(r => {
                    const label = r.querySelector('.structured-list__label');
                    const val = r.querySelector('.structured-list__content');
                    if (label && val) {
                        data[label.textContent.trim()] = val.textContent.trim().replace(/\s+/g, ' ');
                    }
                });
                return data;
            }

            function handlePaymentPage() {
                console.log('[FENNEC Adyen] Extracting payment page details');
                const card = extractSection('Card details') || {};
                if (card['Card number']) {
                    card['Card number'] = card['Card number']
                        .replace(/\D+/g, '')
                        .slice(-4);
                }
                const shopper = extractSection('Shopper details') || {};
                const processing = extractSection('Processing') || {};
                saveData({ payment: { card, shopper, processing } });
            }

            function openDna() {
                waitForElement('a[href*="showOilSplashList.shtml"]').then(link => {
                    try {
                        if (link) {
                            console.log('[FENNEC Adyen] Opening DNA tab');
                            window.open(link.href, '_blank');
                            sessionStorage.removeItem('fennec_order');
                        }
                    } catch (err) {
                        console.error('[FENNEC Adyen] Error opening DNA:', err);
                    }
                });
            }

            function handleDnaPage() {
                console.log('[FENNEC Adyen] Extracting DNA page stats');
                waitForElement('.data-breakdown .item').then(() => {
                    const stats = {};
                    document.querySelectorAll('.stats-bar-item').forEach(item => {
                        const label = item.querySelector('.stats-bar-item__label');
                        if (!label) return;
                        const count = item.querySelector('.stats-bar-item__text');
                        const amount = item.querySelector('.stats-bar-item__subtext');
                        stats[label.textContent.trim()] = {
                            count: count ? count.textContent.trim() : '',
                            amount: amount ? amount.textContent.trim() : ''
                        };
                    });

                    function extractNetworkTransactions() {
                        const netHeading = Array.from(document.querySelectorAll('.adl-heading'))
                            .find(h => h.textContent.trim() === 'Network');
                        if (!netHeading || !netHeading.parentElement) return null;
                        const txHeading = Array.from(netHeading.parentElement.querySelectorAll('.adl-heading'))
                            .find(h => h.textContent.trim() === 'Transactions');
                        if (!txHeading || !txHeading.parentElement) return null;
                        const data = {};
                        txHeading.parentElement.querySelectorAll('.item').forEach(item => {
                            const labelEl = item.querySelector('.u-display-flex div:first-child');
                            const amountEl = item.querySelector('.u-display-flex div:last-child');
                            const countEl = item.querySelector('.status');
                            if (labelEl) {
                                data[labelEl.textContent.trim()] = {
                                    count: countEl ? countEl.textContent.trim() : '',
                                    amount: amountEl ? amountEl.textContent.trim() : ''
                                };
                            }
                        });
                        return data;
                    }

                    const networkTx = extractNetworkTransactions();
                    saveData({ transactions: stats, networkTransactions: networkTx, updated: Date.now() });
                    console.log('[FENNEC Adyen] DNA stats stored');
                    chrome.runtime.sendMessage({ action: 'refocusTab' });
                });
            }

            const path = window.location.pathname;
            console.log('[FENNEC Adyen] Path:', path);
            const ready = document.readyState === 'loading' ? 'DOMContentLoaded' : null;
            if (ready) {
                document.addEventListener('DOMContentLoaded', injectSidebar);
            } else {
                injectSidebar();
            }

            if (order && path.includes('/overview/default.shtml')) {
                if (ready) {
                    document.addEventListener('DOMContentLoaded', fillAndSubmit);
                } else {
                    fillAndSubmit();
                }
            } else if (order && path.includes('/payments/showList.shtml')) {
                if (ready) {
                    document.addEventListener('DOMContentLoaded', openMostRecent);
                } else {
                    openMostRecent();
                }
            } else if (path.includes('/accounts/showTx.shtml')) {
                const run = () => {
                    Promise.all([
                        waitForElement('h3.adl-heading'),
                        waitForElement('a[href*="showOilSplashList.shtml"]')
                    ]).then(() => {
                        handlePaymentPage();
                        openDna();
                    });
                };
                if (ready) {
                    document.addEventListener('DOMContentLoaded', run);
                } else {
                    run();
                }
            } else if (path.includes('showOilSplashList.shtml')) {
                if (ready) {
                    document.addEventListener('DOMContentLoaded', handleDnaPage);
                } else {
                    handleDnaPage();
                }
            }

            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === 'local' && changes.sidebarDb) loadDbSummary();
                if (area === 'local' && changes.adyenDnaInfo) loadDnaSummary();
            });
        } catch (e) {
            console.error('[FENNEC Adyen] Launcher error:', e);
        }
    });
})();
