(function() {
    chrome.storage.local.get({ extensionEnabled: true, lightMode: false }, opts => {
        if (!opts.extensionEnabled) return;
        if (opts.lightMode) {
            document.body.classList.add('fennec-light-mode');
        } else {
            document.body.classList.remove('fennec-light-mode');
        }
        const SIDEBAR_WIDTH = 340;
        chrome.storage.local.set({ fennecReviewMode: true });
        chrome.storage.sync.set({ fennecReviewMode: true });

        function injectSidebar() {
            if (document.getElementById('copilot-sidebar')) return;

            document.body.style.transition = 'margin-right 0.2s';
            document.body.style.marginRight = SIDEBAR_WIDTH + 'px';

            if (!document.getElementById('copilot-db-padding')) {
                const style = document.createElement('style');
                style.id = 'copilot-db-padding';
                style.textContent = `
                    #frm-search-order { margin-right: ${SIDEBAR_WIDTH}px !important; }
                    .modal-fullscreen { width: calc(100% - ${SIDEBAR_WIDTH}px); }
                `;
                document.head.appendChild(style);
            }

            const sidebar = document.createElement('div');
            sidebar.id = 'copilot-sidebar';
            sidebar.innerHTML = `
                <div class="copilot-header">
                    <div class="copilot-title">
                        <img src="${chrome.runtime.getURL('fennec_icon.png')}" class="copilot-icon" alt="FENNEC (BETA)" />
                        <span>FENNEC (BETA)</span>
                    </div>
                    <button id="copilot-clear-tabs">🗑</button>
                    <button id="copilot-close">✕</button>
                </div>
                <div class="order-summary-header">ORDER SUMMARY</div>
                <div class="copilot-body" id="copilot-body-content">
                    <div id="db-summary-section"></div>
                    <div class="copilot-dna">
                        <div id="dna-summary" style="margin-top:16px"></div>
                        <div id="kount-summary" style="margin-top:10px"></div>
                    </div>
                    <div id="fraud-summary-section"></div>
                    <div class="copilot-footer"><button id="copilot-clear" class="copilot-button">🧹 CLEAR</button></div>
                    <div id="review-mode-label" class="review-mode-label" style="margin-top:4px; text-align:center; font-size:11px;">REVIEW MODE</div>
                </div>`;
            document.body.appendChild(sidebar);
            chrome.storage.sync.get({
                sidebarFontSize: 13,
                sidebarFont: "'Inter', sans-serif",
                sidebarBgColor: '#212121',
                sidebarBoxColor: '#2e2e2e'
            }, o => applySidebarDesign(sidebar, o));
            const closeBtn = sidebar.querySelector('#copilot-close');
            if (closeBtn) closeBtn.onclick = () => {
                sidebar.remove();
                document.body.style.marginRight = '';
                const style = document.getElementById('copilot-db-padding');
                if (style) style.remove();
            };
            const clearBtn = sidebar.querySelector('#copilot-clear-tabs');
            if (clearBtn) {
                clearBtn.onclick = () => {
                    chrome.runtime.sendMessage({ action: 'closeOtherTabs' });
                };
            }
        }

        function runXray(orderId) {
            const dbUrl = `https://db.incfile.com/incfile/order/detail/${orderId}?fraud_xray=1`;
            sessionStorage.setItem('fennecShowTrialFloater', '1');
            chrome.runtime.sendMessage({ action: 'openTab', url: dbUrl, active: true, refocus: true });
        }

        function addXrayIcon(el, orderId) {
            if (el.dataset.xrayInjected) return;
            el.dataset.xrayInjected = '1';
            const btn = document.createElement('span');
            btn.textContent = '🩻';
            btn.className = 'copilot-xray';
            btn.style.cursor = 'pointer';
            btn.style.marginLeft = '4px';
            btn.title = 'XRAY';
            btn.addEventListener('click', e => {
                e.preventDefault();
                const box = document.getElementById('fraud-summary-box');
                if (box) box.remove();
                runXray(orderId);
            });
            el.insertAdjacentElement('afterend', btn);
        }

        let scanTimeout = null;

        function scanOrders() {
            const anchors = Array.from(document.querySelectorAll('a[href*="/order/detail/"]'));
            anchors.forEach(a => {
                const m = a.href.match(/order\/detail\/(\d+)/);
                if (m) addXrayIcon(a, m[1]);
            });
            const re = /22\d{10}/g;
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            const nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            nodes.forEach(node => {
                const text = node.textContent;
                if (!re.test(text)) return;
                const frag = document.createDocumentFragment();
                let last = 0;
                text.replace(re, (match, idx) => {
                    frag.appendChild(document.createTextNode(text.slice(last, idx)));
                    const span = document.createElement('span');
                    span.textContent = match;
                    addXrayIcon(span, match);
                    frag.appendChild(span);
                    last = idx + match.length;
                });
                frag.appendChild(document.createTextNode(text.slice(last)));
                node.parentNode.replaceChild(frag, node);
            });

            insertFraudSummary();
        }

        function computeFraudSummary() {
            const rows = Array.from(document.querySelectorAll('tr[data-order-id]'));
            const dateCounts = {};
            let vipDecline = 0;
            let noMames = 0;
            const prices = [];
            rows.forEach(row => {
                const link = row.querySelector('a[href*="/order/detail/"]');
                if (link) {
                    const digits = (link.textContent || '').replace(/\D/g, '');
                    if (digits.length >= 7) {
                        const first7 = digits.slice(0,7);
                        const year = 2000 + parseInt(first7.slice(0,3), 10);
                        const month = first7.slice(3,5);
                        const day = first7.slice(5,7);
                        const dateKey = `${year}-${month}-${day}`;
                        dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
                    }
                }
                const html = row.innerHTML || '';
                if (/VIP\s*Decline/i.test(html)) vipDecline++;
                if (/No mames/i.test(html)) noMames++;
                const amount = parseFloat(row.getAttribute('data-amount') || '');
                if (!isNaN(amount)) prices.push(amount);
            });
            return { dateCounts, vipDecline, noMames, prices };
        }

        function drawPriceChart(prices) {
            const canvas = document.getElementById('fraud-price-chart');
            if (!canvas || !prices.length) return;
            const ctx = canvas.getContext('2d');
            const bins = [0,0,0,0];
            prices.forEach(p => {
                if (p < 200) bins[0]++; else if (p < 300) bins[1]++; else if (p < 400) bins[2]++; else bins[3]++;
            });
            const max = Math.max(...bins, 1);
            const labels = ['$<200','200-299','300-399','$400+'];
            ctx.clearRect(0,0,canvas.width,canvas.height);
            bins.forEach((count,i) => {
                const x = i*65 + 10;
                const h = Math.round(count / max * 80);
                ctx.fillStyle = '#2cabe3';
                ctx.fillRect(x, 90 - h, 60, h);
                ctx.fillStyle = '#fff';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(labels[i], x + 30, 97);
            });
        }

        let activeFilter = null;

        function applyFilter() {
            const rows = Array.from(document.querySelectorAll('tr[data-order-id]'));
            rows.forEach(row => {
                let show = true;
                if (activeFilter) {
                    const html = row.innerHTML || '';
                    if (activeFilter.date) {
                        const link = row.querySelector('a[href*="/order/detail/"]');
                        if (link) {
                            const digits = (link.textContent || '').replace(/\D/g, '');
                            if (digits.length >= 7) {
                                const first7 = digits.slice(0,7);
                                const dKey = `${2000 + parseInt(first7.slice(0,3),10)}-${first7.slice(3,5)}-${first7.slice(5,7)}`;
                                if (dKey !== activeFilter.date) show = false;
                            }
                        }
                    }
                    if (activeFilter.vip && !/VIP\s*Decline/i.test(html)) show = false;
                    if (activeFilter.nomames && !/No mames/i.test(html)) show = false;
                }
                row.style.display = show ? '' : 'none';
            });
        }

        function toggleDateFilter(date) {
            if (activeFilter && activeFilter.date === date) {
                activeFilter = null;
            } else {
                activeFilter = { date };
            }
            applyFilter();
        }

        function toggleVipFilter() {
            if (activeFilter && activeFilter.vip) {
                activeFilter = null;
            } else {
                activeFilter = { vip: true };
            }
            applyFilter();
        }

        function toggleNmFilter() {
            if (activeFilter && activeFilter.nomames) {
                activeFilter = null;
            } else {
                activeFilter = { nomames: true };
            }
            applyFilter();
        }

        function formatSummaryDate(d) {
            const parts = d.split('-');
            const dt = new Date(parts[0], parseInt(parts[1],10)-1, parts[2]);
            return dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        }

        function getClientLtv() {
            const row = document.querySelector('#vclient table tbody tr');
            if (row) {
                const cells = row.querySelectorAll('td');
                if (cells[2]) return (cells[2].innerText || cells[2].textContent || '').trim();
            }
            return '';
        }

        function insertFraudSummary() {
            const container = document.getElementById('fraud-summary-section');
            if (!container) return;
            const summary = computeFraudSummary();
            const dateItems = Object.keys(summary.dateCounts)
                .sort()
                .map(d => `<li class="fraud-date-item" data-date="${d}" style="cursor:pointer">${formatSummaryDate(d)}: <b>${summary.dateCounts[d]}</b></li>`)
                .join('');
            container.innerHTML = `
                <div class="white-box" id="fraud-summary-box" style="text-align:left">
                    <h4 style="margin-top:0; text-align:center"><b>SUMMARY</b></h4>
                    <div><b>ORDERS:</b><ul>${dateItems}</ul></div>
                    <div class="vip-declines" style="cursor:pointer"><b>VIP DECLINES:</b> ${summary.vipDecline}</div>
                    <div class="nm-mames" style="cursor:pointer"><b>NO MAMES:</b> ${summary.noMames}</div>
                    <canvas id="fraud-price-chart" width="260" height="100" style="margin-top:8px; width:50%"></canvas>
                </div>`;
            drawPriceChart(summary.prices);
            container.querySelectorAll('.fraud-date-item').forEach(li => {
                li.addEventListener('click', () => toggleDateFilter(li.dataset.date));
            });
            const vip = container.querySelector('.vip-declines');
            if (vip) vip.addEventListener('click', toggleVipFilter);
            const nm = container.querySelector('.nm-mames');
            if (nm) nm.addEventListener('click', toggleNmFilter);
        }

        function buildDnaHtml(info) {
            if (!info || !info.payment) return null;
            const p = info.payment;
            const card = p.card || {};
            const shopper = p.shopper || {};
            const proc = p.processing || {};
            const parts = [];
            if (card['Card holder']) {
                parts.push(`<div><b>${escapeHtml(card['Card holder'])}</b></div>`);
            }
            const cardLine = [];
            if (card['Payment method']) cardLine.push(escapeHtml(card['Payment method']));
            if (card['Card number']) {
                const digits = card['Card number'].replace(/\D+/g, '').slice(-4);
                if (digits) cardLine.push(escapeHtml(digits));
            }
            function formatExpiry(d) {
                if (!d) return '';
                const digits = d.replace(/\D+/g, '');
                if (digits.length >= 4) return `${digits.slice(0,2)}/${digits.slice(-2)}`;
                return d;
            }
            if (card['Expiry date']) cardLine.push(escapeHtml(formatExpiry(card['Expiry date'])));
            if (card['Funding source']) cardLine.push(escapeHtml(card['Funding source']));
            if (cardLine.length) parts.push(`<div>${cardLine.join(' \u2022 ')}</div>`);
            if (shopper['Billing address']) {
                parts.push(`<div class="dna-address">${escapeHtml(shopper['Billing address'])}</div>`);
                if (card['Issuer name'] || card['Issuer country/region']) {
                    let bank = (card['Issuer name'] || '').trim();
                    if (bank.length > 25) bank = bank.slice(0,22) + '...';
                    const country = (card['Issuer country/region'] || '').trim();
                    let cinit = '';
                    if (country) {
                        cinit = country.split(/\s+/).map(w => w.charAt(0)).join('').toUpperCase();
                        cinit = ` (<span class="dna-country"><b>${escapeHtml(cinit)}</b></span>)`;
                    }
                    parts.push(`<div class="dna-issuer">${escapeHtml(bank)}${cinit}</div>`);
                }
            }
            const cvv = proc['CVC/CVV'];
            const avs = proc['AVS'];
            function colorFor(res) {
                if (res === 'green') return 'copilot-tag-green';
                if (res === 'purple') return 'copilot-tag-purple';
                return 'copilot-tag-black';
            }
            function formatCvv(t) {
                t = (t || '').toLowerCase();
                if ((/\bmatch(es|ed)?\b/.test(t) || /\(m\)/.test(t)) && !/not\s+match/.test(t)) return { label: 'CVV: MATCH', result: 'green' };
                if (/not\s+match/.test(t) || /\(n\)/.test(t)) return { label: 'CVV: NO MATCH', result: 'purple' };
                if (/not provided|not checked|error|not supplied|unknown/.test(t)) return { label: 'CVV: UNKNOWN', result: 'black' };
                return { label: 'CVV: UNKNOWN', result: 'black' };
            }
            function formatAvs(t) {
                t = (t || '').toLowerCase();
                if (/both\s+postal\s+code\s+and\s+address\s+match/.test(t) || /^7\b/.test(t) || t.includes('both match')) return { label: 'AVS: MATCH', result: 'green' };
                if (/^6\b/.test(t) || (t.includes('postal code matches') && t.includes("address doesn't"))) return { label: 'AVS: PARTIAL (STREET✖️)', result: 'purple' };
                if (/^1\b/.test(t) || (t.includes('address matches') && t.includes("postal code doesn't"))) return { label: 'AVS: PARTIAL (ZIP✖️)', result: 'purple' };
                if (/^2\b/.test(t) || t.includes('neither matches') || /\bw\b/.test(t)) return { label: 'AVS: NO MATCH', result: 'purple' };
                if (/^0\b/.test(t) || /^3\b/.test(t) || /^4\b/.test(t) || /^5\b/.test(t) || t.includes('unavailable') || t.includes('not supported') || t.includes('no avs') || t.includes('unknown')) return { label: 'AVS: UNKNOWN', result: 'black' };
                return { label: 'AVS: UNKNOWN', result: 'black' };
            }
            if (cvv || avs) {
                const tags = [];
                if (cvv) {
                    const { label, result } = formatCvv(cvv);
                    tags.push(`<span class="copilot-tag ${colorFor(result)}">${escapeHtml(label)}</span>`);
                }
                if (avs) {
                    const { label, result } = formatAvs(avs);
                    tags.push(`<span class="copilot-tag ${colorFor(result)}">${escapeHtml(label)}</span>`);
                }
                if (tags.length) parts.push(`<div>${tags.join(' ')}</div>`);
            }
            if (proc['Fraud scoring']) parts.push(`<div><b>Fraud scoring:</b> ${escapeHtml(proc['Fraud scoring'])}</div>`);
            if (parts.length) parts.push('<hr style="border:none;border-top:1px solid #555;margin:6px 0"/>');
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
                    return `<tr><td><span class="dna-label ${cls}">${label}${count}</span></td><td>${escapeHtml(amount)}${escapeHtml(pctText)}</td></tr>`;
                }).join("");

                return `<table class="dna-tx-table"><thead><tr><th>Type</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`;
            }

            const txTable = buildTransactionTable(info.transactions || {});
            if (txTable) parts.push(txTable);
            if (!parts.length) return null;
            return `<div class="section-label">ADYEN'S DNA</div><div class="white-box" style="margin-bottom:10px">${parts.join('')}</div>`;
        }

        function buildKountHtml(info) {
            if (!info) return null;
            const parts = [];
            if (info.emailAge) parts.push(`<div><b>Email age:</b> ${escapeHtml(info.emailAge)}</div>`);
            if (info.deviceLocation || info.ip) {
                const loc = escapeHtml(info.deviceLocation || '');
                const ip = escapeHtml(info.ip || '');
                parts.push(`<div><b>Device:</b> ${loc} ${ip}</div>`);
            }
            if (Array.isArray(info.declines) && info.declines.length) {
                parts.push(`<div><b>DECLINE LIST</b><br>${info.declines.map(escapeHtml).join('<br>')}</div>`);
            }
            if (info.ekata) {
                const e = info.ekata;
                const ipLine = e.ipValid || e.proxyRisk ? `<div><b>IP Valid:</b> ${escapeHtml(e.ipValid || '')} <b>Proxy:</b> ${escapeHtml(e.proxyRisk || '')}</div>` : '';
                const addrLine = e.addressToName || e.residentName ? `<div><b>Address to Name:</b> ${escapeHtml(e.addressToName || '')}<br><b>Resident Name:</b> ${escapeHtml(e.residentName || '')}</div>` : '';
                if (ipLine) parts.push(ipLine);
                if (addrLine) parts.push(addrLine);
            }
            if (!parts.length) return null;
            return `<div class="section-label">KOUNT</div><div class="white-box" style="margin-bottom:10px">${parts.join('')}</div>`;
        }

        function loadDnaSummary() {
            const container = document.getElementById('dna-summary');
            if (!container) return;
            chrome.storage.local.get({ adyenDnaInfo: null, sidebarOrderInfo: null }, ({ adyenDnaInfo, sidebarOrderInfo }) => {
                if (adyenDnaInfo) adyenDnaInfo.dbBilling = sidebarOrderInfo ? sidebarOrderInfo.billing : null;
                const html = buildDnaHtml(adyenDnaInfo);
                container.innerHTML = html || '';
                attachCommonListeners(container);
            });
        }

        function loadKountSummary() {
            const container = document.getElementById('kount-summary');
            if (!container) return;
            chrome.storage.local.get({ kountInfo: null }, ({ kountInfo }) => {
                const html = buildKountHtml(kountInfo);
                container.innerHTML = html || '';
                attachCommonListeners(container);
            });
        }

        function showTrialFloater() {
            const flag = sessionStorage.getItem('fennecShowTrialFloater');
            if (!flag) return;
            sessionStorage.removeItem('fennecShowTrialFloater');
            chrome.storage.local.get({ adyenDnaInfo: null, kountInfo: null, sidebarOrderInfo: null }, data => {
                if (data.sidebarOrderInfo && data.sidebarOrderInfo.orderId) {
                    localStorage.setItem('fraudXrayCompleted', String(data.sidebarOrderInfo.orderId));
                } else {
                    localStorage.setItem('fraudXrayCompleted', '1');
                }
                const html = buildTrialHtml(data.adyenDnaInfo, data.kountInfo, data.sidebarOrderInfo);
                if (!html) return;
                let overlay = document.getElementById('fennec-trial-overlay');
                let title = document.getElementById('fennec-trial-title');
                if (overlay) overlay.remove();
                if (title) title.remove();
                overlay = document.createElement('div');
                overlay.id = 'fennec-trial-overlay';
                overlay.innerHTML = html;
                title = document.createElement('div');
                title.id = 'fennec-trial-title';
                title.className = 'trial-title';
                title.textContent = 'FRAUD REVIEW';
                const close = overlay.querySelector('.trial-close');
                if (close) close.addEventListener('click', () => {
                    overlay.remove();
                    title.remove();
                });
                document.body.appendChild(title);
                document.body.appendChild(overlay);
                const subBtn = overlay.querySelector('#sub-detection-btn');
                if (subBtn) {
                    subBtn.addEventListener('click', () => {
                        subBtn.disabled = true;
                        chrome.runtime.sendMessage({
                            action: 'detectSubscriptions',
                            email: (data.sidebarOrderInfo && data.sidebarOrderInfo.clientEmail) || '',
                            ltv: (data.sidebarOrderInfo && data.sidebarOrderInfo.clientLtv) || ''
                        }, resp => {
                            subBtn.disabled = false;
                            if (!resp) return;
                            const dbCol = overlay.querySelector('.trial-col');
                            if (!dbCol) return;
                            const line1 = document.createElement('div');
                            line1.className = 'trial-line';
                            line1.textContent = `Orders: ${resp.orderCount}`;
                            dbCol.appendChild(line1);
                            if (resp.ltv) {
                                const ratio = resp.orderCount && parseFloat(resp.ltv) ? (resp.orderCount / parseFloat(resp.ltv)).toFixed(2) : 'N/A';
                                const line2 = document.createElement('div');
                                line2.className = 'trial-line';
                                line2.textContent = `Orders/LTV: ${ratio}`;
                                dbCol.appendChild(line2);
                            }
                            const line3 = document.createElement('div');
                            line3.className = 'trial-line';
                            line3.textContent = 'Active Subs: ' + (resp.activeSubs.length ? resp.activeSubs.join(', ') : 'None');
                            dbCol.appendChild(line3);
                        });
                    });
                }
            });
        }

        function buildTrialHtml(dna, kount, order) {
            if (!dna && !kount && !order) return null;
            const dbLines = [];
            const adyenLines = [];
            const kountLines = [];
            const green = [];
            const red = [];

            function colorFor(res) {
                if (res === 'green') return 'copilot-tag-green';
                if (res === 'purple') return 'copilot-tag-purple';
                return 'copilot-tag-black';
            }
            function pushFlag(html) {
                if (/copilot-tag-green/.test(html)) green.push(html);
                if (/copilot-tag-purple/.test(html)) red.push(html);
            }
            function formatCvv(t) {
                t = (t || '').toLowerCase();
                if ((/\bmatch(es|ed)?\b/.test(t) || /\(m\)/.test(t)) && !/not\s+match/.test(t)) return { label: 'CVV: MATCH', result: 'green' };
                if (/not\s+match/.test(t) || /\(n\)/.test(t)) return { label: 'CVV: NO MATCH', result: 'purple' };
                if (/not provided|not checked|error|not supplied|unknown/.test(t)) return { label: 'CVV: UNKNOWN', result: 'black' };
                return { label: 'CVV: UNKNOWN', result: 'black' };
            }
            function formatAvs(t) {
                t = (t || '').toLowerCase();
                if (/both\s+postal\s+code\s+and\s+address\s+match/.test(t) || /^7\b/.test(t) || t.includes('both match')) return { label: 'AVS: MATCH', result: 'green' };
                if (/^6\b/.test(t) || (t.includes('postal code matches') && t.includes("address doesn't"))) return { label: 'AVS: PARTIAL (STREET✖️)', result: 'purple' };
                if (/^1\b/.test(t) || (t.includes('address matches') && t.includes("postal code doesn't"))) return { label: 'AVS: PARTIAL (ZIP✖️)', result: 'purple' };
                if (/^2\b/.test(t) || t.includes('neither matches') || /\bw\b/.test(t)) return { label: 'AVS: NO MATCH', result: 'purple' };
                if (/^0\b/.test(t) || /^3\b/.test(t) || /^4\b/.test(t) || /^5\b/.test(t) || t.includes('unavailable') || t.includes('not supported') || t.includes('no avs') || t.includes('unknown')) return { label: 'AVS: UNKNOWN', result: 'black' };
                return { label: 'AVS: UNKNOWN', result: 'black' };
            }
            function parseAmount(str) {
                if (!str) return 0;
                const n = parseFloat(str.replace(/[^0-9.]/g, ''));
                return isNaN(n) ? 0 : n;
            }
            function buildCardMatchTag(dbBilling, card) {
                const db = dbBilling || {};
                const dna = card || {};
                const dbName = (db.cardholder || '').toLowerCase();
                const dnaName = (dna['Card holder'] || '').toLowerCase();
                const dbDigits = (db.last4 || '').replace(/\D+/g, '');
                const dnaDigits = (dna['Card number'] || '').replace(/\D+/g, '').slice(-4);
                const dbExp = (db.expiry || '').replace(/\D+/g, '');
                const dnaExp = (dna['Expiry date'] || '').replace(/\D+/g, '');
                if (!dbName && !dbDigits && !dbExp) return '';
                const match = dbName && dnaName && dbName === dnaName && dbDigits && dnaDigits && dbDigits === dnaDigits && dbExp && dnaExp && dbExp === dnaExp;
                const cls = match ? 'copilot-tag-green' : 'copilot-tag-purple';
                const text = match ? 'DB MATCH' : 'DB MISMATCH';
                return `<span class="copilot-tag ${cls}">${text}</span>`;
            }

            if (order && order.billing) {
                dbLines.push(`<div class="trial-line">${escapeHtml(order.billing.cardholder || '')}</div>`);
                if (order.billing.last4) dbLines.push(`<div class="trial-line">${escapeHtml(order.billing.last4)}</div>`);
                if (order.billing.expiry) dbLines.push(`<div class="trial-line">${escapeHtml(order.billing.expiry)}</div>`);
                const tag = dna && dna.payment ? buildCardMatchTag(order.billing, dna.payment.card || {}) : '';
                if (tag && /copilot-tag-green/.test(tag)) pushFlag(tag);
                let ltv = order && order.clientLtv;
                if (!ltv) ltv = getClientLtv();
                if (ltv) dbLines.push(`<div class="trial-line">LTV: ${escapeHtml(ltv)}</div>`);
                else dbLines.push(`<div class="trial-line">LTV: N/A</div>`);
                const btn = `<button id="sub-detection-btn" class="sub-detect-btn">SUB DETECTION</button>`;
                dbLines.push(`<div class="trial-line">${btn}</div>`);
            }

            if (dna && dna.payment) {
                const proc = dna.payment.processing || {};
                const card = dna.payment.card || {};
                if (card['Card holder']) adyenLines.push(`<div class="trial-line">${escapeHtml(card['Card holder'])}</div>`);
                if (card['Card number']) {
                    const digits = card['Card number'].replace(/\D+/g, '').slice(-4);
                    if (digits) adyenLines.push(`<div class="trial-line">${escapeHtml(digits)}</div>`);
                }
                if (card['Expiry date']) adyenLines.push(`<div class="trial-line">${escapeHtml(card['Expiry date'])}</div>`);
                if (proc['CVC/CVV']) {
                    const r = formatCvv(proc['CVC/CVV']);
                    adyenLines.push(`<div class="trial-line">CVV: ${escapeHtml(proc['CVC/CVV'])}</div>`);
                    if (r.result === 'green') {
                        const tag = `<span class="copilot-tag ${colorFor(r.result)}">${escapeHtml(r.label)}</span>`;
                        pushFlag(tag);
                    }
                }
                if (proc['AVS']) {
                    const r = formatAvs(proc['AVS']);
                    adyenLines.push(`<div class="trial-line">AVS: ${escapeHtml(proc['AVS'])}</div>`);
                    if (r.result === 'green') {
                        const tag = `<span class="copilot-tag ${colorFor(r.result)}">${escapeHtml(r.label)}</span>`;
                        pushFlag(tag);
                    }
                }
                const tx = dna.transactions || {};
                const settled = parseAmount((tx['Settled'] || tx['Authorised / Settled'] || {}).amount);
                const total = parseAmount((tx['Total'] || tx['Total transactions'] || {}).amount);
                if (total) {
                    const pct = Math.round(settled / total * 100);
                    adyenLines.push(`<div class="trial-line">Settled: ${pct}%</div>`);
                    if (pct < 65) red.push('<span class="copilot-tag copilot-tag-purple">APPROVED %</span>');
                }
                const cb = parseInt((tx['Chargebacks'] || tx['Chargeback'] || {}).count || '0', 10);
                adyenLines.push(`<div class="trial-line">CB: ${cb}</div>`);
                if (cb >= 1) red.push('<span class="copilot-tag copilot-tag-purple">CB</span>');
            }

            if (kount) {
                if (kount.ekata && kount.ekata.residentName) {
                    kountLines.push(`<div class="trial-line">Resident Name: ${escapeHtml(kount.ekata.residentName)}</div>`);
                }
                if (kount.ekata && kount.ekata.proxyRisk) {
                    kountLines.push(`<div class="trial-line">Proxy: ${escapeHtml(kount.ekata.proxyRisk)}</div>`);
                    if (/^yes$/i.test(kount.ekata.proxyRisk)) red.push('<span class="copilot-tag copilot-tag-purple">PROXY YES</span>');
                }
                if (kount.emailAge) kountLines.push(`<div class="trial-line">Email age: ${escapeHtml(kount.emailAge)}</div>`);
                if (Array.isArray(kount.declines)) kountLines.push(`<div class="trial-line">VIP DECLINES: ${kount.declines.length}</div>`);
                if (kount.ekata && kount.ekata.addressToName) kountLines.push(`<div class="trial-line">Address Name: ${escapeHtml(kount.ekata.addressToName)}</div>`);
            }

            const summary = `<div class="trial-summary"><div class="trial-summary-col"><b>GREEN FLAGS</b><br>${green.join(' ') || 'None'}</div><div class="trial-summary-col"><b>RED FLAGS</b><br>${red.join(' ') || 'None'}</div></div>`;

            const html = `
                <div class="trial-close">✕</div>
                <div class="trial-columns">
                    <div class="trial-col-wrap"><div class="trial-col-title">DB</div><div class="trial-col">${dbLines.join('')}</div></div>
                    <div class="trial-col-wrap"><div class="trial-col-title">ADYEN</div><div class="trial-col">${adyenLines.join('')}</div></div>
                    <div class="trial-col-wrap"><div class="trial-col-title">KOUNT</div><div class="trial-col">${kountLines.join('')}</div></div>
                </div>
                ${summary}
            `;

            return html;
        }

        function formatIssueText(text) {
            if (!text) return '';
            let formatted = text.replace(/\s*(\d+\s*[).])/g, (m,g)=>'\n'+g+' ');
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
                    fillIssueBox(null, orderId);
                    return;
                }
                fillIssueBox(resp && resp.issueInfo, orderId);
            });
        }

        function loadDbSummary() {
            const container = document.getElementById('db-summary-section');
            const fraud = document.getElementById('fraud-summary-section');
            if (!container) return;
            chrome.storage.local.get({ sidebarDb: [], sidebarOrderId: null, sidebarOrderInfo: null }, ({ sidebarDb, sidebarOrderId, sidebarOrderInfo }) => {
                if (Array.isArray(sidebarDb) && sidebarDb.length) {
                    container.innerHTML = sidebarDb.join('');
                    attachCommonListeners(container);
                    const qbox = container.querySelector('#quick-summary');
                    if (qbox) { qbox.classList.remove('quick-summary-collapsed'); qbox.style.maxHeight = 'none'; }
                    checkLastIssue(sidebarOrderId);
                    if (fraud) fraud.innerHTML = '';
                } else {
                    container.innerHTML = '';
                    fillIssueBox(null, null);
                    if (fraud) insertFraudSummary();
                }
            });
        }

        function clearSidebar() {
            chrome.storage.local.set({ sidebarDb: [], sidebarOrderId: null, sidebarOrderInfo: null, adyenDnaInfo: null, sidebarFreezeId: null });
            const db = document.getElementById('db-summary-section');
            const dna = document.getElementById('dna-summary');
            const fraud = document.getElementById('fraud-summary-section');
            const issue = document.getElementById('issue-summary-box');
            if (db) db.innerHTML = '';
            if (dna) dna.innerHTML = '';
            if (fraud) fraud.innerHTML = '';
            if (issue) { const content = issue.querySelector('#issue-summary-content'); const label = issue.querySelector('#issue-status-label'); if (content) content.innerHTML = 'No issue data yet.'; if (label) { label.textContent = ''; label.className = 'issue-status-label'; } issue.style.display = 'none'; }
            insertFraudSummary();
        }

        function showInitialStatus() {
            const db = document.getElementById('db-summary-section');
            const dna = document.getElementById('dna-summary');
            const kount = document.getElementById('kount-summary');
            const fraud = document.getElementById('fraud-summary-section');
            const issue = document.getElementById('issue-summary-box');
            if (db) db.innerHTML = '';
            if (dna) dna.innerHTML = '';
            if (kount) kount.innerHTML = '';
            if (issue) {
                const content = issue.querySelector('#issue-summary-content');
                const label = issue.querySelector('#issue-status-label');
                if (content) content.innerHTML = '';
                if (label) label.textContent = '';
                issue.style.display = 'none';
            }
            if (fraud) insertFraudSummary();
        }

        injectSidebar();
        scanOrders();
        const manualOpen = !sessionStorage.getItem('fennecShowTrialFloater');
        if (manualOpen) {
            chrome.storage.local.set({ sidebarDb: [], sidebarOrderId: null, sidebarOrderInfo: null, adyenDnaInfo: null, kountInfo: null, sidebarFreezeId: null });
            showInitialStatus();
        } else {
           loadDbSummary();
           loadDnaSummary();
           loadKountSummary();
        }
        const clearBtn = document.getElementById('copilot-clear');
        if (clearBtn) clearBtn.onclick = clearSidebar;

        new MutationObserver(() => {
            if (scanTimeout) return;
            scanTimeout = setTimeout(() => {
                scanTimeout = null;
                scanOrders();
            }, 500);
        }).observe(document.body, { childList: true, subtree: true });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && (changes.sidebarDb || changes.sidebarOrderId)) {
                loadDbSummary();
            }
            if (area === 'local' && changes.adyenDnaInfo) {
                loadDnaSummary();
            }
            if (area === 'local' && changes.kountInfo) {
                loadKountSummary();
            }
        });
        window.addEventListener('focus', () => {
            loadDnaSummary();
            loadKountSummary();
            showTrialFloater();
        });
    });
})();
