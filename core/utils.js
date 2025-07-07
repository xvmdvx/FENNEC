// Common utilities for FENNEC content scripts.
// Provides escapeHtml and attachCommonListeners helpers.

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function applySidebarDesign(sidebar, opts) {
    if (!sidebar || !opts) return;
    if (opts.sidebarBgColor) {
        sidebar.style.setProperty('--sb-bg', opts.sidebarBgColor);
    }
    if (opts.sidebarBoxColor) {
        sidebar.style.setProperty('--sb-box-bg', opts.sidebarBoxColor);
    }
    const fs = parseInt(opts.sidebarFontSize, 10);
    if (fs) {
        sidebar.style.setProperty('--sb-font-size', fs + 'px');
    }
    if (opts.sidebarFont) {
        sidebar.style.setProperty('--sb-font-family', opts.sidebarFont);
    }
}
window.applySidebarDesign = applySidebarDesign;

function abbreviateOrderType(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('annual report')) return 'AR';
    if (t.includes('state filings bundle')) return 'SFB';
    if (t.includes('foreign qualification')) return 'FQ';
    if (t.includes('assumed business name')) return 'ABN';
    if (t.includes('sales tax registration')) return 'SALES TAX';
    if (t.includes('registered agent change')) return 'RA CHANGE';
    if (t.includes('trade name search')) return 'TRADENAME';
    return type;
}
window.abbreviateOrderType = abbreviateOrderType;

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
    rootEl.querySelectorAll('.copilot-copy, .copilot-copy-icon').forEach(el => {
        el.addEventListener('click', () => {
            const text = el.dataset.copy;
            if (!text) return;
            navigator.clipboard.writeText(text).catch(err => console.warn('[Copilot] Clipboard', err));
        });
    });
    rootEl.querySelectorAll('.copilot-sos').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            const url = el.dataset.url;
            const query = el.dataset.query;
            const type = el.dataset.type || 'name';
            if (!url || !query) return;
            navigator.clipboard.writeText(query).catch(err => console.warn('[Copilot] Clipboard', err));
            chrome.runtime.sendMessage({ action: 'sosSearch', url, query, searchType: type });
        });
    });
    rootEl.querySelectorAll('.copilot-kb').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            const state = el.dataset.state;
            const otype = el.dataset.otype || '';
            if (!state) return;
            if (typeof window.openKbWindow === 'function') {
                window.openKbWindow(state, otype);
            } else {
                chrome.runtime.sendMessage({ action: 'openKnowledgeBaseWindow', state, orderType: otype });
            }
        });
    });
    rootEl.querySelectorAll('.company-purpose .copilot-copy').forEach(el => {
        el.addEventListener('click', () => {
            const text = el.dataset.copy;
            if (!text) return;
            window.open('https://www.google.com/search?q=' + encodeURIComponent(text), '_blank');
        });
    });
    rootEl.querySelectorAll('.copilot-name').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            const text = el.dataset.copy;
            if (!text) return;
            navigator.clipboard.writeText(text).catch(err => console.warn('[Copilot] Clipboard', err));
        });
    });
    const ftIcon = document.getElementById('family-tree-icon');
    if (ftIcon && !ftIcon.dataset.listenerAttached) {
        ftIcon.dataset.listenerAttached = 'true';
        ftIcon.addEventListener('click', () => {
            console.log('[Copilot] Family Tree icon clicked');
            let container = document.getElementById('family-tree-orders');
            if (!container) {
                const qs = document.getElementById('quick-summary');
                if (qs) {
                    container = document.createElement('div');
                    container.id = 'family-tree-orders';
                    container.className = 'ft-collapsed';
                    qs.insertAdjacentElement('afterend', container);
                } else {
                    return;
                }
            }
            if (container.style.maxHeight && parseInt(container.style.maxHeight) > 0) {
                container.style.maxHeight = '0';
                container.classList.add('ft-collapsed');
                return;
            }
            container.classList.remove('ft-collapsed');
            if (container.dataset.loaded === 'true') {
                requestAnimationFrame(() => {
                    container.style.maxHeight = container.scrollHeight + 'px';
                });
                return;
            }
            const parentId = typeof getParentOrderId === 'function' ? getParentOrderId() : null;
            console.log('[Copilot] Detected parent order ID:', parentId);
            if (!parentId) {
                console.warn('[Copilot] Parent order not found');
                alert('Parent order not found');
                return;
            }
            ftIcon.style.opacity = '0.5';
            ftIcon.style.pointerEvents = 'none';
            chrome.runtime.sendMessage({ action: 'fetchChildOrders', orderId: parentId }, (resp) => {
                ftIcon.style.opacity = '1';
                ftIcon.style.pointerEvents = 'auto';
                if (!resp || !resp.childOrders || !resp.parentInfo) return;
                const box = document.createElement('div');
                box.className = 'white-box';
                box.style.marginBottom = '10px';
                let html = '';
                const parent = resp.parentInfo;

                // Determine duplicate orders by type when status is REVIEW/PROCESSING/HOLD
                const allOrders = [parent].concat(resp.childOrders);
                const dupMap = {};
                allOrders.forEach(o => {
                    if (/review|processing|hold/i.test(o.status || '')) {
                        const key = (abbreviateOrderType(o.type) || '').toLowerCase();
                        if (!dupMap[key]) dupMap[key] = [];
                        dupMap[key].push(o);
                    }
                });
                const dupIds = new Set();
                Object.values(dupMap).forEach(list => {
                    if (list.length > 1) list.forEach(o => dupIds.add(String(o.orderId)));
                });

                const pStatusClass =
                    /shipped|review|processing/i.test(parent.status) ? 'copilot-tag copilot-tag-green' :
                    /canceled/i.test(parent.status) ? 'copilot-tag copilot-tag-red' :
                    /hold/i.test(parent.status) ? 'copilot-tag copilot-tag-purple' : 'copilot-tag';
                html += `<div class="section-label">PARENT</div>`;
                html += `<div class="ft-grid">` +
                    `<div><b><a href="#" class="ft-link" data-id="${escapeHtml(parent.orderId)}">${escapeHtml(parent.orderId)}</a></b>` +
                    `${dupIds.has(String(parent.orderId)) ? ` <span class="ft-cancel" data-id="${escapeHtml(parent.orderId)}">❌</span>` : ''}</div>` +
                    `<div class="ft-type">${escapeHtml(abbreviateOrderType(parent.type)).toUpperCase()}</div>` +
                    `<div class="ft-date">${escapeHtml(parent.date)}</div>` +
                    `<div><span class="${pStatusClass} ft-status" data-id="${escapeHtml(parent.orderId)}">${escapeHtml(parent.status)}</span></div>` +
                    `</div>`;
                html += `<div class="section-label">CHILD</div>`;
                html += resp.childOrders.map(o => {
                    const cls =
                        /shipped|review|processing/i.test(o.status) ? 'copilot-tag copilot-tag-green' :
                        /canceled/i.test(o.status) ? 'copilot-tag copilot-tag-red' :
                        /hold/i.test(o.status) ? 'copilot-tag copilot-tag-purple' : 'copilot-tag';
                    return `
                            <div class="ft-grid">
                                <div><b><a href="#" class="ft-link" data-id="${escapeHtml(o.orderId)}">${escapeHtml(o.orderId)}</a></b>` +
                                `${dupIds.has(String(o.orderId)) ? ` <span class="ft-cancel" data-id="${escapeHtml(o.orderId)}">❌</span>` : ''}</div>
                                <div class="ft-type">${escapeHtml(abbreviateOrderType(o.type)).toUpperCase()}</div>
                                <div class="ft-date">${escapeHtml(o.date)}</div>
                                <div><span class="${cls} ft-status" data-id="${escapeHtml(o.orderId)}">${escapeHtml(o.status)}</span></div>
                            </div>`;
                }).join('');
                html += `<div style="text-align:center; margin-top:8px;">
                            <button id="ar-diagnose-btn" class="copilot-button">🩺 DIAGNOSE</button>
                        </div>`;
                box.innerHTML = html;
                container.innerHTML = '';
                container.appendChild(box);
                container.dataset.loaded = 'true';
                const extra = parseInt(box.style.marginBottom) || 0;
                requestAnimationFrame(() => {
                    container.style.maxHeight = (container.scrollHeight + extra) + 'px';
                    container.classList.remove('ft-collapsed');
                });
                container.querySelectorAll('.ft-link').forEach(a => {
                    a.addEventListener('click', e => {
                        e.preventDefault();
                        const id = a.dataset.id;
                        if (id) {
                            chrome.runtime.sendMessage({
                                action: 'openOrReuseTab',
                                url: `${location.origin}/incfile/order/detail/${id}`,
                                active: false
                            });
                        }
                    });
                });
                container.querySelectorAll('.ft-cancel').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = btn.dataset.id;
                        if (!id) return;
                        if (!confirm('Cancel and refund order ' + id + '?')) return;
                        chrome.storage.local.set({ fennecDupCancel: id }, () => {
                            chrome.runtime.sendMessage({
                                action: 'openOrReuseTab',
                                url: `${location.origin}/incfile/order/detail/${id}`,
                                active: true
                            });
                        });
                    });
                });

                if (!window.ftDupListener) {
                    chrome.storage.onChanged.addListener((changes, area) => {
                        if (area === 'local' && changes.fennecDupCancelDone) {
                            const data = changes.fennecDupCancelDone.newValue || {};
                            const span = container.querySelector(`.ft-status[data-id="${data.orderId}"]`);
                            if (span) {
                                span.textContent = 'CANCELED';
                                span.className = 'copilot-tag copilot-tag-red ft-status';
                            }
                        }
                    });
                    window.ftDupListener = true;
                }
                const diagBtn = container.querySelector('#ar-diagnose-btn');
                if (diagBtn && typeof diagnoseHoldOrders === 'function') {
                    diagBtn.addEventListener('click', () => {
                        const relevant = resp.childOrders.filter(o => {
                            const status = o.status || '';
                            const type = o.type || '';
                            return /hold/i.test(status) ||
                                ((/amendment/i.test(type) || /reinstat/i.test(type)) && /review/i.test(status));
                        });
                        if (!relevant.length) {
                            alert('No applicable orders found');
                            return;
                        }
                        const current = typeof getBasicOrderInfo === 'function'
                            ? getBasicOrderInfo().orderId
                            : null;
                        const typeText = typeof currentOrderTypeText !== 'undefined' ? currentOrderTypeText : null;
                        diagnoseHoldOrders(relevant, parent.orderId, current, typeText);
                    });
                }
            });
        });
    }

    rootEl.querySelectorAll('.company-search-toggle').forEach(el => {
        el.addEventListener('click', () => {
            const box = el.closest('.white-box');
            if (box && typeof toggleCompanySearch === 'function') {
                toggleCompanySearch(box);
            }
        });
    });
}

function toggleCompanySearch(box) {
    if (!box) return;
    const mode = box.dataset.mode || 'info';
    const state = box.dataset.state || '';
    if (mode === 'search') {
        box.innerHTML = box.dataset.infoHtml || '';
        box.dataset.mode = 'info';
        attachCommonListeners(box);
        return;
    }
    box.dataset.infoHtml = box.innerHTML;
    box.dataset.mode = 'search';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Search name';
    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.placeholder = 'Search ID';
    const form = document.createElement('div');
    form.className = 'company-search-form';
    form.appendChild(nameInput);
    form.appendChild(idInput);
    box.innerHTML = '';
    box.appendChild(form);
    const searchIcon = document.createElement('span');
    searchIcon.className = 'company-search-toggle';
    searchIcon.textContent = '🔍';
    box.appendChild(searchIcon);
    const doSearch = (type) => {
        const q = type === 'name' ? nameInput.value.trim() : idInput.value.trim();
        if (!q) return;
        if (typeof buildSosUrl !== 'function') return;
        const url = buildSosUrl(state, null, type);
        if (!url) return;
        chrome.runtime.sendMessage({ action: 'sosSearch', url, query: q, searchType: type });
    };
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch('name'); });
    idInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch('id'); });
    attachCommonListeners(box);
}
window.toggleCompanySearch = toggleCompanySearch;

