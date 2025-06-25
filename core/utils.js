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
    if (ftIcon) {
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
            if (container.style.maxHeight && container.style.maxHeight !== '0px') {
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
                const pStatusClass =
                    /shipped|review|processing/i.test(parent.status) ? 'copilot-tag copilot-tag-green' :
                    /canceled/i.test(parent.status) ? 'copilot-tag copilot-tag-red' :
                    /hold/i.test(parent.status) ? 'copilot-tag copilot-tag-purple' : 'copilot-tag';
                html += `<div class="section-label">PARENT</div>`;
                html += `<div class="ft-grid">` +
                    `<div><b><a href="#" class="ft-link" data-id="${escapeHtml(parent.orderId)}">${escapeHtml(parent.orderId)}</a></b></div>` +
                    `<div class="ft-type">${escapeHtml(parent.type).toUpperCase()}</div>` +
                    `<div class="ft-date">${escapeHtml(parent.date)}</div>` +
                    `<div><span class="${pStatusClass}">${escapeHtml(parent.status)}</span></div>` +
                    `</div>`;
                html += `<div class="section-label">CHILD</div>`;
                html += resp.childOrders.map(o => {
                    const cls =
                        /shipped|review|processing/i.test(o.status) ? 'copilot-tag copilot-tag-green' :
                        /canceled/i.test(o.status) ? 'copilot-tag copilot-tag-red' :
                        /hold/i.test(o.status) ? 'copilot-tag copilot-tag-purple' : 'copilot-tag';
                    return `
                            <div class="ft-grid">
                                <div><b><a href="#" class="ft-link" data-id="${escapeHtml(o.orderId)}">${escapeHtml(o.orderId)}</a></b></div>
                                <div class="ft-type">${escapeHtml(o.type).toUpperCase()}</div>
                                <div class="ft-date">${escapeHtml(o.date)}</div>
                                <div><span class="${cls}">${escapeHtml(o.status)}</span></div>
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
                            chrome.runtime.sendMessage({ action: 'openTab', url: `${location.origin}/incfile/order/detail/${id}` });
                        }
                    });
                });
                const diagBtn = container.querySelector('#ar-diagnose-btn');
                if (diagBtn && typeof diagnoseHoldOrders === 'function') {
                    diagBtn.addEventListener('click', () => {
                        const relevant = resp.childOrders.filter(o => {
                            const status = o.status || '';
                            const type = o.type || '';
                            return /hold/i.test(status) ||
                                (/amendment/i.test(type) && /review/i.test(status));
                        });
                        if (!relevant.length) {
                            alert('No applicable orders found');
                            return;
                        }
                        const current = typeof getBasicOrderInfo === 'function'
                            ? getBasicOrderInfo().orderId
                            : null;
                        diagnoseHoldOrders(relevant, parent.orderId, current);
                    });
                }
            });
        });
    }
}

