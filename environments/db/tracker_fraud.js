(function() {
    chrome.storage.local.get({ extensionEnabled: true, lightMode: false }, opts => {
        if (!opts.extensionEnabled) return;
        if (opts.lightMode) {
            document.body.classList.add('fennec-light-mode');
        } else {
            document.body.classList.remove('fennec-light-mode');
        }
        chrome.storage.local.set({ fennecReviewMode: true });
        chrome.storage.sync.set({ fennecReviewMode: true });

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
                <div class="copilot-body" id="copilot-body-content">
                    <div style="text-align:center; color:#aaa; margin-top:40px">No DB data.</div>
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
            if (closeBtn) closeBtn.onclick = () => sidebar.remove();
        }

        function runXray(orderId) {
            const dbUrl = `https://db.incfile.com/incfile/order/detail/${orderId}`;
            const adyenUrl = `https://ca-live.adyen.com/ca/ca/overview/default.shtml?fennec_order=${orderId}`;
            chrome.runtime.sendMessage({ action: 'openTab', url: dbUrl, active: true });
            setTimeout(() => {
                chrome.runtime.sendMessage({ action: 'openTab', url: adyenUrl, refocus: true, active: true });
            }, 1000);
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
                runXray(orderId);
            });
            el.insertAdjacentElement('afterend', btn);
        }

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
        }

        function loadSummary() {
            const body = document.getElementById('copilot-body-content');
            if (!body) return;
            chrome.storage.local.get({ sidebarDb: [], sidebarOrderId: null }, ({ sidebarDb }) => {
                if (Array.isArray(sidebarDb) && sidebarDb.length) {
                    body.innerHTML = sidebarDb.join('');
                    attachCommonListeners(body);
                }
            });
        }

        injectSidebar();
        scanOrders();
        loadSummary();

        new MutationObserver(scanOrders).observe(document.body, { childList: true, subtree: true });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && (changes.sidebarDb || changes.sidebarOrderId)) {
                loadSummary();
            }
        });
    });
})();
