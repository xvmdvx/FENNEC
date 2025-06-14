// Injects the FENNEC sidebar into DB pages.
(function main() {
    // Clear the closed flag on reloads so the sidebar reappears
    window.addEventListener('beforeunload', () => {
        sessionStorage.removeItem('copilotSidebarClosed');
    });
    let currentOrderType = null;

    // Map of US states to their Secretary of State business search pages
    const SOS_URLS = {
        "Alabama": "http://sos.alabama.gov/business-entities/llcs",
        "Alaska": "https://www.commerce.alaska.gov/web/cbpl/Corporations.aspx",
        "Arizona": "http://ecorp.azcc.gov/",
        "Arkansas": "http://www.sos.arkansas.gov/corps/search_all.php",
        "California": "https://businesssearch.sos.ca.gov/",
        "Colorado": "https://www.sos.state.co.us/biz/BusinessEntityCriteriaExt.do",
        "Connecticut": "https://www.concord-sots.ct.gov/CONCORD/online?sn=PublicInquiry&eid=9740",
        "Delaware": "https://icis.corp.delaware.gov/Ecorp/EntitySearch/NameSearch.aspx",
        "District of Columbia": "https://os.dc.gov/",
        "Florida": "http://search.sunbiz.org/Inquiry/CorporationSearch/ByName",
        "Georgia": "http://sos.ga.gov/index.php/Corporations/creating_a_new_entity",
        "Hawaii": "https://hbe.ehawaii.gov/documents/search.html?mobile=N&site_preference=normal",
        "Idaho": "https://sos.idaho.gov/corp/index.html",
        "Illinois": "http://www.cyberdriveillinois.com/departments/business_services/corp.html",
        "Indiana": "https://inbiz.in.gov/BOS/BusinssEntity/StartMyBusiness",
        "Iowa": "https://sos.iowa.gov/search/business/search.aspx",
        "Kansas": "https://www.kansas.gov/bess/flow/main?execution=e2s2",
        "Kentucky": "http://www.sos.ky.gov/",
        "Louisiana": "https://coraweb.sos.la.gov/CommercialSearch/CommercialSearch.aspx",
        "Maine": "http://www.maine.gov/sos/cec/corp/",
        "Maryland": "https://egov.maryland.gov/BusinessExpress/EntitySearch",
        "Massachusetts": "http://corp.sec.state.ma.us/corpweb/CorpSearch/CorpSearch.aspx",
        "Michigan": "http://www.dleg.state.mi.us/bcs_corp/sr_corp.asp",
        "Minnesota": "https://mblsportal.sos.state.mn.us/Business/Search",
        "Mississippi": "https://corp.sos.ms.gov/corp/portal/c/page/corpBusinessIdSearch/portal.aspx?#clear=1",
        "Missouri": "https://bsd.sos.mo.gov/businessentity/besearch.aspx?searchtype=0",
        "Montana": "https://biz.sosmt.gov/search/business",
        "Nebraska": "https://www.nebraska.gov/sos/corp/corpsearch.cgi?nav=search",
        "Nevada": "https://nvsos.gov/",
        "New Hampshire": "https://quickstart.sos.nh.gov/online/BusinessInquire",
        "New Jersey": "http://www.nj.gov/treasury/revenue/searchfile.shtml",
        "New Mexico": "https://portal.sos.state.nm.us/BFS/online/CorporationBusinessSearch",
        "New York": "https://appext20.dos.ny.gov/corp_public/corpsearch.entity_search_entry",
        "North Carolina": "https://www.sosnc.gov/search/index/corp",
        "North Dakota": "http://sos.nd.gov/business/business-services/business-records-search/business-record-search-name-availability",
        "Ohio": "https://www5.sos.state.oh.us:8443/ords/f?p=100:1:0:::::",
        "Oklahoma": "https://www.sos.ok.gov/corp/corpInquiryFind.aspx",
        "Oregon": "http://egov.sos.state.or.us/br/pkg_web_name_srch_inq.login",
        "Pennsylvania": "https://www.corporations.pa.gov/search/CorpSearch",
        "Rhode Island": "http://ucc.state.ri.us/CorpSearch/CorpSearchInput.asp",
        "South Carolina": "https://businessfilings.sc.gov/BusinessFiling/Entity/Search",
        "South Dakota": "https://sosenterprise.sd.gov/BusinessServices/Business/NameAvailability.aspx",
        "Tennessee": "https://tnbear.tn.gov/Ecommerce/FilingSearch.aspx",
        "Texas": "https://mycpa.cpa.state.tx.us/coa/Index.html",
        "Utah": "https://secure.utah.gov/bes/",
        "Vermont": "https://www.sec.state.vt.us/corporationsbusiness-services/searches-databases/business-search.aspx",
        "Virginia": "https://sccefile.scc.virginia.gov/Find/Business",
        "Washington": "https://www.sos.wa.gov/corps/corps_search.aspx",
        "West Virginia": "http://apps.sos.wv.gov/business/corporations/",
        "Wisconsin": "https://www.wdfi.org/apps/CorpSearch/Search.aspx",
        "Wyoming": "https://wyobiz.wy.gov/Business/FilingSearch.aspx",
    };
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'fennecToggle') {
            window.location.reload();
        }
        if (msg.action === 'getLastIssue') {
            let attempts = 10;
            const tryExtract = () => {
                try {
                    const info = getLastIssueInfo();
                    if (info || attempts <= 0) {
                        sendResponse({ issueInfo: info });
                    } else {
                        attempts--;
                        setTimeout(tryExtract, 500);
                    }
                } catch (err) {
                    console.warn('[FENNEC] Error extracting issue text:', err);
                    sendResponse({ issueInfo: null });
                }
            };
            tryExtract();
            return true;
        }
        if (msg.action === 'getChildOrders') {
            try {
                const orders = getChildOrdersInfo();
                const parent = getBasicOrderInfo();
                sendResponse({ childOrders: orders, parentInfo: parent });
            } catch (err) {
                console.warn('[FENNEC] Error extracting child orders:', err);
                sendResponse({ childOrders: null, parentInfo: null });
            }
            return true;
        }
    });
    function getOrderType() {
        const el = document.getElementById("ordType");
        if (!el) return "formation";
        const txt = el.innerText.trim().toLowerCase();
        if (/amendment/.test(txt)) return "amendment";
        if (/silver|gold|platinum/.test(txt)) return "formation";
        return "formation";
    }

    chrome.storage.local.get({ extensionEnabled: true }, ({ extensionEnabled }) => {
        if (!extensionEnabled) {
            console.log('[FENNEC] Extension disabled, skipping DB launcher.');
            return;
        }

        try {
        function initSidebar() {
            if (sessionStorage.getItem('copilotSidebarClosed') === 'true') return;
            if (!document.getElementById('copilot-sidebar')) {
                console.log("[Copilot] Sidebar no encontrado, inyectando en DB...");

                const SIDEBAR_WIDTH = 340;
                document.body.style.transition = 'margin-right 0.2s';
                document.body.style.marginRight = SIDEBAR_WIDTH + 'px';

                // Extra padding for elements that stick to the right edge
                if (!document.getElementById('copilot-db-padding')) {
                    const style = document.createElement('style');
                    style.id = 'copilot-db-padding';
                    style.textContent = `
                        #frm-search-order { margin-right: ${SIDEBAR_WIDTH}px !important; }
                        .modal-fullscreen { width: calc(100% - ${SIDEBAR_WIDTH}px); }
                    `;
                    document.head.appendChild(style);
                }

                (function injectSidebar() {
                    if (document.getElementById('copilot-sidebar')) return;
                    const sidebar = document.createElement('div');
                    sidebar.id = 'copilot-sidebar';
                    sidebar.innerHTML = `
                        <div class="copilot-header">
                            <div class="copilot-title">
                                <img src="${chrome.runtime.getURL('fennec_icon.png')}" class="copilot-icon" alt="FENNEC (Prototype)" />
                                <span>FENNEC (Prototype)</span>
                            </div>
                            <span id="qa-toggle" class="quick-actions-toggle">☰</span>
                            <button id="copilot-close">✕</button>
                        </div>
                        <div class="order-summary-header">ORDER SUMMARY <span id="qs-toggle" class="quick-summary-toggle">⚡</span></div>
                        <div class="copilot-body" id="copilot-body-content">
                            <div style="text-align:center; color:#888; margin-top:20px;">Cargando resumen...</div>
                        </div>
                    `;
                    document.body.appendChild(sidebar);
                    document.getElementById('copilot-close').onclick = () => {
                        sidebar.remove();
                        document.body.style.marginRight = '';
                        const style = document.getElementById('copilot-db-padding');
                        if (style) style.remove();
                        sessionStorage.setItem('copilotSidebarClosed', 'true');
                        console.log("[Copilot] Sidebar cerrado manualmente en DB.");
                    };
                    const orderType = getOrderType();
                    currentOrderType = orderType;
                    if (orderType === "amendment") {
                        extractAndShowAmendmentData();
                    } else {
                        extractAndShowFormationData();
                    }
                    const qsToggle = sidebar.querySelector('#qs-toggle');
                    const qsBox = sidebar.querySelector('#quick-summary');
                    if (qsBox) {
                        qsBox.style.maxHeight = '0';
                        qsBox.classList.add('quick-summary-collapsed');
                    }
                    if (qsToggle && qsBox) {
                        qsToggle.addEventListener('click', () => {
                            if (qsBox.style.maxHeight && qsBox.style.maxHeight !== '0px') {
                                qsBox.style.maxHeight = '0';
                                qsBox.classList.add('quick-summary-collapsed');
                            } else {
                                qsBox.classList.remove('quick-summary-collapsed');
                                qsBox.style.maxHeight = qsBox.scrollHeight + 'px';
                            }
                        });
                    }

                    const qaToggle = sidebar.querySelector('#qa-toggle');
                    if (qaToggle) {
                        const qaMenu = document.createElement('div');
                        qaMenu.id = 'quick-actions-menu';
                        qaMenu.style.display = 'none';
                        qaMenu.innerHTML = '<div class="qa-title">QUICK ACTIONS</div><ul><li id="qa-cancel">Cancel</li></ul>';
                        document.body.appendChild(qaMenu);

                        function showMenu() {
                            qaMenu.style.display = 'block';
                            requestAnimationFrame(() => qaMenu.classList.add('show'));
                        }

                        function hideMenu() {
                            qaMenu.classList.remove('show');
                            qaMenu.addEventListener('transitionend', function h() {
                                qaMenu.style.display = 'none';
                                qaMenu.removeEventListener('transitionend', h);
                            }, { once: true });
                        }

                        qaToggle.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (qaMenu.style.display === 'block') {
                                hideMenu();
                            } else {
                                const rect = qaToggle.getBoundingClientRect();
                                qaMenu.style.top = rect.bottom + 'px';
                                qaMenu.style.left = (rect.left - qaMenu.offsetWidth + rect.width) + 'px';
                                showMenu();
                            }
                        });

                        document.addEventListener('click', (e) => {
                            if (!qaMenu.contains(e.target) && e.target !== qaToggle && qaMenu.style.display === 'block') {
                                hideMenu();
                            }
                        });

                        qaMenu.querySelector('#qa-cancel').addEventListener('click', () => {
                            hideMenu();
                            startCancelProcedure();
                        });
                    }
                })();
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initSidebar);
        } else {
            initSidebar();
        }
    } catch (e) {
        console.error("[Copilot] ERROR en DB Launcher:", e);
    }


    function buildSosUrl(state, query) {
        const base = SOS_URLS[state];
        if (!base) return null;
        if (!query) return base;
        const sep = base.includes('?') ? '&' : '?';
        return base + sep + 'q=' + encodeURIComponent(query);
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function renderAddress(addr, isVA = false) {
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
        const extra = isVA
            ? ` <span class="copilot-tag copilot-tag-green">VA</span>`
            : `<span class="copilot-usps" data-address="${escFull}" title="USPS Lookup"> ✉️</span>`;
        return `<span class="address-wrapper"><a href="#" class="copilot-address" data-address="${escFull}">${display}</a>${extra}</span>`;
    }

    function renderCopy(text) {
        if (!text) return '<span style="color:#aaa">-</span>';
        const esc = escapeHtml(text);
        return `<span class="copilot-copy" data-copy="${esc}">${esc}</span>`;
    }

    function parseDate(text) {
        const parsed = Date.parse(text);
        return isNaN(parsed) ? null : new Date(parsed);
    }

    function cleanFieldValue(name, text) {
        if (!text) return text;
        if (name === 'expiration') {
            return text.replace(/Update Expiration Date/i, '').trim();
        }
        return text.trim();
    }

    function buildAddress(obj) {
        if (!obj) return '';

        const isValid = val => val && val.trim() && val.trim().toLowerCase() !== 'n/a';

        const parts = [];

        const line1 = isValid(obj.street1) ? obj.street1
                    : isValid(obj.street) ? obj.street
                    : obj.address;
        if (isValid(line1)) parts.push(line1.trim());
        if (isValid(obj.street2)) parts.push(obj.street2.trim());

        if (obj.cityStateZipCountry && isValid(obj.cityStateZipCountry)) {
            parts.push(obj.cityStateZipCountry.trim());
        } else {
            if (isValid(obj.cityStateZip)) parts.push(obj.cityStateZip.trim());
            if (isValid(obj.country) && (!obj.cityStateZip || !obj.cityStateZip.includes(obj.country))) {
                parts.push(obj.country.trim());
            }
        }

        return parts.join(', ');
    }

    function extractSingleElement(root, fields) {
        if (!root) return null;
        const rows = Array.from(root.querySelectorAll('.row'));
        const obj = {};
        rows.forEach(row => {
            fields.forEach(field => {
                if (obj[field.name]) return;
                let label = Array.from(row.querySelectorAll('label')).find(l =>
                    l.innerText.trim().toLowerCase().includes(field.label.toLowerCase())
                );
                if (label) {
                    let valDiv = label.nextElementSibling;
                    const parent = label.closest('div');
                    if ((!valDiv || !valDiv.innerText.trim()) && parent) {
                        if (parent.nextElementSibling && parent.nextElementSibling.innerText.trim()) {
                            valDiv = parent.nextElementSibling;
                        } else {
                            const siblings = Array.from(parent.parentElement.children);
                            const idx = siblings.indexOf(parent);
                            for (let i = idx + 1; i < siblings.length; i++) {
                                if (siblings[i].innerText.trim()) {
                                    valDiv = siblings[i];
                                    break;
                                }
                            }
                        }
                    }
                    if (valDiv) {
                        obj[field.name] = cleanFieldValue(field.name, valDiv.innerText);
                    }
                }
            });
        });
        return Object.values(obj).some(v => v) ? obj : null;
    }

    // Scrapea los .row de una sección dada y devuelve array de objetos campo:valor
    function extractRows(sectionSel, fields) {
        const root = document.querySelector(sectionSel);
        if (!root) return [];
        const rows = Array.from(root.querySelectorAll('.row'));
        return rows.map(row => {
            let obj = {};
            fields.forEach(field => {
                let label = Array.from(row.querySelectorAll('label')).find(l =>
                    l.innerText.trim().toLowerCase().includes(field.label.toLowerCase())
                );
                if (label) {
                    let valDiv = label.nextElementSibling;
                    const parent = label.closest('div');
                    if ((!valDiv || !valDiv.innerText.trim()) && parent) {
                        if (parent.nextElementSibling && parent.nextElementSibling.innerText.trim()) {
                            valDiv = parent.nextElementSibling;
                        } else {
                            const siblings = Array.from(parent.parentElement.children);
                            const idx = siblings.indexOf(parent);
                            for (let i = idx + 1; i < siblings.length; i++) {
                                if (siblings[i].innerText.trim()) {
                                    valDiv = siblings[i];
                                    break;
                                }
                            }
                        }
                    }
                    if (valDiv) {
                        obj[field.name] = cleanFieldValue(field.name, valDiv.innerText);
                    }
                }
            });
            // Devuelve sólo si hay al menos un campo con valor
            return Object.values(obj).some(x => x) ? obj : null;
        }).filter(Boolean);
    }

    // Extrae todos los campos de una sección (Company o Agent) en un solo objeto
    function extractSingle(sectionSel, fields) {
        const root = document.querySelector(sectionSel);
        if (!root) return null;
        const rows = Array.from(root.querySelectorAll('.row'));
        const obj = {};
        rows.forEach(row => {
            fields.forEach(field => {
                if (obj[field.name]) return;
                let label = Array.from(row.querySelectorAll('label')).find(l =>
                    l.innerText.trim().toLowerCase().includes(field.label.toLowerCase())
                );
                if (label) {
                    let valDiv = label.nextElementSibling;
                    const parent = label.closest('div');
                    if ((!valDiv || !valDiv.innerText.trim()) && parent) {
                        if (parent.nextElementSibling && parent.nextElementSibling.innerText.trim()) {
                            valDiv = parent.nextElementSibling;
                        } else {
                            const siblings = Array.from(parent.parentElement.children);
                            const idx = siblings.indexOf(parent);
                            for (let i = idx + 1; i < siblings.length; i++) {
                                if (siblings[i].innerText.trim()) {
                                    valDiv = siblings[i];
                                    break;
                                }
                            }
                        }
                    }
                    if (valDiv) {
                        obj[field.name] = cleanFieldValue(field.name, valDiv.innerText);
                    }
                }
            });
        });
        return Object.values(obj).some(v => v) ? obj : null;
    }

    // Extrae miembros (o directores) agrupando por contenedores m-b-10
    function extractMembers(sectionSel, fields) {
        const root = document.querySelector(sectionSel);
        if (!root) return [];
        let blocks = Array.from(root.querySelectorAll('.row.m-b-10'));
        if (!blocks.length) return extractRows(sectionSel, fields);

        // Algunos contenedores de miembros agrupan dos columnas (.col-sm-6)
        // dentro de una sola fila .row.m-b-10. Dividimos dichos contenedores
        // para procesar cada columna como un miembro independiente.
        blocks = [].concat(...blocks.map(b => {
            const cols = Array.from(b.querySelectorAll('.col-sm-6'))
                .filter(c => c.parentElement === b);
            return cols.length > 1 ? cols : [b];
        }));

        return blocks.map(block => {
            const obj = {};
            const rows = Array.from(block.querySelectorAll('.row'));
            rows.forEach(row => {
                fields.forEach(field => {
                    let label = Array.from(row.querySelectorAll('label')).find(l =>
                        l.innerText.trim().toLowerCase().includes(field.label.toLowerCase())
                    );
                    if (label) {
                        let valDiv = label.nextElementSibling;
                        const parent = label.closest('div');
                        if ((!valDiv || !valDiv.innerText.trim()) && parent) {
                            if (parent.nextElementSibling && parent.nextElementSibling.innerText.trim()) {
                                valDiv = parent.nextElementSibling;
                            } else {
                                const siblings = Array.from(parent.parentElement.children);
                                const idx = siblings.indexOf(parent);
                                for (let i = idx + 1; i < siblings.length; i++) {
                                    if (siblings[i].innerText.trim()) {
                                        valDiv = siblings[i];
                                        break;
                                    }
                                }
                            }
                        }
                        if (valDiv) {
                            obj[field.name] = cleanFieldValue(field.name, valDiv.innerText);
                        }
                    }
                });
            });
            return Object.values(obj).some(x => x) ? obj : null;
        }).filter(Boolean);
    }

    // Extrae oficiales listados en bloques m-b-10. Cada bloque contiene el
    // puesto (label) y el nombre en la primera fila, seguido de varias filas de
    // domicilio. Se agrupan las columnas para soportar múltiples oficiales por
    // fila.
    function extractOfficers(sectionSel) {
        const root = document.querySelector(sectionSel);
        if (!root) return [];

        let blocks = Array.from(root.querySelectorAll('.row.m-b-10'));
        if (!blocks.length) {
            // Fallback a la lógica antigua si no existen bloques m-b-10
            const groups = Array.from(root.querySelectorAll('.form-group'));
            return groups.map(g => {
                const label = g.querySelector('label');
                const val = g.querySelector('.form-control-static, p');
                if (!label || !val || !val.innerText.trim()) return null;
                return {
                    name: val.innerText.trim(),
                    position: label.innerText.replace(/:/g, '').trim()
                };
            }).filter(Boolean);
        }

        // Separar columnas dentro del bloque para procesar cada oficial por
        // separado.
        blocks = [].concat(...blocks.map(b => {
            const cols = Array.from(b.querySelectorAll('.col-sm-6'))
                .filter(c => c.parentElement === b);
            return cols.length > 1 ? cols : [b];
        }));

        return blocks.map(block => {
            // Nombre y puesto se encuentran en la primera form-group que no sea
            // de dirección.
            let name = null;
            let position = null;
            const groups = Array.from(block.querySelectorAll('.form-group'));
            for (const g of groups) {
                const label = g.querySelector('label');
                const val = g.querySelector('.form-control-static, p');
                if (!label || !val || !val.innerText.trim()) continue;
                const text = label.innerText.trim().toLowerCase();
                if (text.includes('street') || text.includes('city') ||
                    text.includes('zip') || text.includes('address')) {
                    continue;
                }
                name = val.innerText.trim();
                position = label.innerText.replace(/:/g, '').trim();
                break;
            }

            const addrRaw = extractSingleElement(block, [
                {name: 'street', label: 'street'},
                {name: 'street1', label: 'street 1'},
                {name: 'street2', label: 'street 2'},
                {name: 'cityStateZipCountry', label: 'city, state, zip, country'},
                {name: 'cityStateZip', label: 'city, state, zip'},
                {name: 'country', label: 'country'},
                {name: 'address', label: 'address'}
            ]);

            const address = buildAddress(addrRaw);
            return name ? { name, position, address } : null;
        }).filter(Boolean);
    }


    function extractAndShowFormationData(isAmendment = false) {
        // 1. COMPANY
        const companyRaw = extractSingle('#vcomp .form-body', [
            {name: 'name', label: 'company name'},
            {name: 'stateId', label: 'state id'},
            {name: 'state', label: 'state of formation'},
            {name: 'status', label: 'state status'},
            {name: 'purpose', label: 'purpose'},
            {name: 'street', label: 'street'},
            {name: 'street1', label: 'street 1'},
            {name: 'street2', label: 'street 2'},
            {name: 'cityStateZipCountry', label: 'city, state, zip, country'},
            {name: 'cityStateZip', label: 'city, state, zip'},
            {name: 'country', label: 'country'},
            {name: 'address', label: 'address'}
        ]);

        const physicalBox = Array.from(document.querySelectorAll('#vcomp .form-body h4, #vcomp .form-body h3'))
            .find(h => h.innerText.toLowerCase().includes('physical'));
        const mailingBox = Array.from(document.querySelectorAll('#vcomp .form-body h4, #vcomp .form-body h3'))
            .find(h => h.innerText.toLowerCase().includes('mailing'));

        const physicalRaw = physicalBox ?
            extractSingleElement(physicalBox.closest('.white-box') || physicalBox.parentElement, [
                {name: 'street', label: 'street'},
                {name: 'street1', label: 'street 1'},
                {name: 'street2', label: 'street 2'},
                {name: 'cityStateZipCountry', label: 'city, state, zip, country'},
                {name: 'cityStateZip', label: 'city, state, zip'},
                {name: 'country', label: 'country'},
                {name: 'address', label: 'address'}
            ]) : null;

        const mailingRaw = mailingBox ?
            extractSingleElement(mailingBox.closest('.white-box') || mailingBox.parentElement, [
                {name: 'street', label: 'street'},
                {name: 'street1', label: 'street 1'},
                {name: 'street2', label: 'street 2'},
                {name: 'cityStateZipCountry', label: 'city, state, zip, country'},
                {name: 'cityStateZip', label: 'city, state, zip'},
                {name: 'country', label: 'country'},
                {name: 'address', label: 'address'}
            ]) : null;

        const headerStatus = document.querySelector('.btn-status-text')?.innerText?.trim() || null;

        const company = companyRaw ? {
            name: companyRaw.name,
            stateId: companyRaw.stateId,
            state: companyRaw.state,
            status: companyRaw.status || headerStatus,
            purpose: companyRaw.purpose,
            address: buildAddress(companyRaw),
            physicalAddress: physicalRaw ? buildAddress(physicalRaw) : null,
            mailingAddress: mailingRaw ? buildAddress(mailingRaw) : null
        } : (headerStatus ? { status: headerStatus } : null);

        // 2. AGENT
        const agentRaw = extractSingle('#vagent .form-body', [
            {name: 'name', label: 'name'},
            {name: 'address', label: 'address'},
            {name: 'street', label: 'street'},
            {name: 'street1', label: 'street 1'},
            {name: 'street2', label: 'street 2'},
            {name: 'cityStateZipCountry', label: 'city, state, zip, country'},
            {name: 'cityStateZip', label: 'city, state, zip'},
            {name: 'country', label: 'country'},
            {name: 'status', label: 'registered agent service'},
            {name: 'status', label: 'subscription'},
            {name: 'expiration', label: 'expiration date'}
        ]);
        const agent = agentRaw ? {
            name: agentRaw.name,
            status: agentRaw.status,
            expiration: agentRaw.expiration,
            address: buildAddress(agentRaw)
        } : {};



        // Detectar tipo de entidad para nombrar apropiadamente
        const entTypeEl = document.getElementById('entityType');
        const entityType = entTypeEl ? entTypeEl.innerText.trim().toLowerCase() : '';
        const isLLC = entityType.includes('llc');

        // 3. DIRECTORS/MEMBERS
        const directorsRaw = extractMembers('#vmembers .form-body', [
            {name: 'name', label: 'name'},
            {name: 'address', label: 'address'},
            {name: 'street', label: 'street'},
            {name: 'street1', label: 'street 1'},
            {name: 'street2', label: 'street 2'},
            {name: 'cityStateZipCountry', label: 'city, state, zip, country'},
            {name: 'cityStateZip', label: 'city, state, zip'},
            {name: 'country', label: 'country'}
        ]);
        const directors = directorsRaw.map(d => ({
            name: d.name,
            address: buildAddress(d)
        }));

        // 4. SHAREHOLDERS
        // Usamos extractMembers en lugar de extractRows porque cada
        // accionista se encuentra agrupado dentro de bloques `.row.m-b-10`.
        // De lo contrario se generaban objetos incompletos y duplicados.
        const shareholdersRaw = extractMembers('#vshareholders .form-body', [
            {name: 'name', label: 'name'},
            {name: 'address', label: 'address'},
            {name: 'street', label: 'street'},
            {name: 'street1', label: 'street 1'},
            {name: 'street2', label: 'street 2'},
            {name: 'cityStateZipCountry', label: 'city, state, zip, country'},
            {name: 'cityStateZip', label: 'city, state, zip'},
            {name: 'country', label: 'country'},
            {name: 'shares', label: 'share'}
        ]);
        const shareholders = shareholdersRaw.map(s => ({
            name: s.name,
            address: buildAddress(s),
            shares: s.shares
        }));

        // 5. OFFICERS
        let officers = extractOfficers('#vofficers .form-body');
        // Deduplicate officers that share the same name by merging their positions
        const officerMap = {};
        officers.forEach(o => {
            const key = o.name ? o.name.trim().toLowerCase() : '';
            if (!key) return;
            if (!officerMap[key]) {
                officerMap[key] = { name: o.name.trim(), address: o.address, positions: new Set() };
            }
            if (o.position) officerMap[key].positions.add(o.position.trim());
            if (!officerMap[key].address && o.address) officerMap[key].address = o.address;
        });
        const dedupedOfficers = Object.values(officerMap).map(o => ({ name: o.name, address: o.address, position: Array.from(o.positions).join(', ') }));
        officers = dedupedOfficers;

        // ---------- QUICK SUMMARY -------------
        const INTERNAL_NAME_PATTERNS = [/incfile/i, /republic registered agent/i];
        const INTERNAL_ADDR_PATTERNS = [/17350 state hwy 249/i];
        const isInternal = (name, addr) => {
            const text = (name || '') + ' ' + (addr || '');
            return INTERNAL_NAME_PATTERNS.some(re => re.test(text)) ||
                   INTERNAL_ADDR_PATTERNS.some(re => re.test(text));
        };

        const roleMap = {};
        const addRole = (name, role, addr) => {
            if (!name || isInternal(name, addr)) return;
            const key = name.trim().toLowerCase();
            if (!roleMap[key]) roleMap[key] = { display: name.trim(), roles: new Set() };
            roleMap[key].roles.add(role);
        };

        if (agent && agent.name) addRole(agent.name, 'RA', agent.address);
        directors.forEach(d => addRole(d.name, isLLC ? 'MEMBER' : 'DIRECTOR', d.address));
        shareholders.forEach(s => addRole(s.name, 'SHAREHOLDER', s.address));
        officers.forEach(o => {
            if (o.position) {
                o.position.split(/[,/&]+|\band\b/i).forEach(p => {
                    let role = p.trim().toUpperCase();
                    if (!role) return;
                    role = role.replace(/\./g, '');
                    if (/^VICE/i.test(role) || /^VP/i.test(role)) role = 'VP';
                    addRole(o.name, role, o.address);
                });
            } else {
                addRole(o.name, 'OFFICER', o.address);
            }
        });

        const addrs = [];
        const pushAddr = (label, addr, name) => {
            if (!addr || isInternal(name, addr)) return;
            addrs.push({ label, addr });
        };
        if (company) {
            pushAddr('Company', company.address, company.name);
            pushAddr('Company Physical', company.physicalAddress, company.name);
            pushAddr('Company Mailing', company.mailingAddress, company.name);
        }
        if (agent && agent.address) pushAddr('Agent', agent.address, agent.name);
        directors.forEach((d, i) => pushAddr(`${isLLC ? 'Member' : 'Director'} ${i+1}`, d.address, d.name));
        shareholders.forEach((s, i) => pushAddr(`Shareholder ${i+1}`, s.address, s.name));
        officers.forEach((o, i) => pushAddr(`Officer ${i+1}`, o.address, o.name));

        const normalizeAddr = a => {
            if (!a) return '';
            return a
                .toLowerCase()
                .replace(/[.,]/g, '')
                .replace(/\s+/g, ' ')
                .replace(/\s+(?:us|usa|united states(?: of america)?)$/, '')
                .trim();
        };
        const addrMap = {};
        addrs.forEach(({ label, addr }) => {
            const key = normalizeAddr(addr);
            if (!key) return;
            if (!addrMap[key]) addrMap[key] = { addr, labels: [] };
            addrMap[key].labels.push(label);
        });

        const orderItems = Array.from(document.querySelectorAll('.order-items li'))
            .map(li => li.innerText.trim().toLowerCase());

        // Registered Agent subscription status from #vagent section
        const hasRA = /^yes/i.test(agent.status || '');

        // Virtual Address status from #vvirtual-address section or fallback button
        let hasVA = false;
        const vaSection = document.querySelector('#vvirtual-address');
        if (vaSection) {
            const vaTexts = Array.from(vaSection.querySelectorAll('td, span'))
                .map(el => el.innerText.trim().toLowerCase());
            hasVA = vaTexts.some(t => t.includes('active'));
            if (!hasVA && vaTexts.some(t => t.includes('inactive'))) {
                hasVA = false;
            }
        } else {
            const vaBtn = Array.from(document.querySelectorAll('button'))
                .find(b => /virtual address/i.test(b.innerText));
            if (vaBtn) {
                const txt = vaBtn.innerText.toLowerCase();
                hasVA = txt.includes('active');
            }
        }
        const isVAAddress = addr => hasVA && /#\s*\d{3,}/.test(addr);

        const addrEntries = Object.values(addrMap)
            .map(a => `<div style="margin-left:10px"><b>${renderAddress(a.addr, isVAAddress(a.addr))}</b><br>${a.labels.map(l => `<span class="copilot-tag">${escapeHtml(l)}</span>`).join(' ')}</div>`);

        // Render del HTML
        let html = '';

        const summaryParts = [];
        const roleEntries = Object.values(roleMap)
            .map(r => `
                <div style="margin-left:10px">
                    <b>${renderCopy(r.display)}</b><br>
                    ${Array.from(r.roles)
                        .map(role => `<span class="copilot-tag">${escapeHtml(role)}</span>`)
                        .join(' ')}
                </div>`);
        if (roleEntries.length) {
            summaryParts.push(...roleEntries);
        }
        if (addrEntries.length) {
            if (summaryParts.length) summaryParts.push('<hr style="border:none;border-top:1px solid #eee;margin:6px 0"/>');
            summaryParts.push(...addrEntries);
        }
        summaryParts.push('<div style="height:4px"></div>');
        const raClass = hasRA ? 'copilot-tag copilot-tag-green' : 'copilot-tag copilot-tag-purple';
        const vaClass = hasVA ? 'copilot-tag copilot-tag-green' : 'copilot-tag copilot-tag-purple';
        summaryParts.push(`
            <br/>
            <div>
                <span class="${raClass}">RA: ${hasRA ? 'Sí' : 'No'}</span>
                <span class="${vaClass}">VA: ${hasVA ? 'Sí' : 'No'}</span>
            </div>`);
        html += `
            <div class="white-box quick-summary-content" id="quick-summary" style="margin-bottom:10px">
                ${summaryParts.join('')}
            </div>
        `;

        // COMPANY
        if (company) {
            let addrHtml = '';
            const phys = company.physicalAddress;
            const mail = company.mailingAddress;
            if (phys && mail && normalizeAddr(phys) === normalizeAddr(mail)) {
                addrHtml += `<div>${renderAddress(phys, isVAAddress(phys))}<br>` +
                            `<span class="copilot-tag">Physical</span> <span class="copilot-tag">Mailing</span></div>`;
            } else {
                if (phys) {
                    addrHtml += `<div><b>Physical:</b> ${renderAddress(phys, isVAAddress(phys))}</div>`;
                }
                if (mail) {
                    addrHtml += `<div><b>Mailing:</b> ${renderAddress(mail, isVAAddress(mail))}</div>`;
                }
            }
            if (!addrHtml) {
                addrHtml = `<div>${renderAddress(company.address, isVAAddress(company.address))}</div>`;
            }
            const companyLines = [];
            let nameHtml = renderCopy(company.name);
            const nameUrl = buildSosUrl(company.state, company.name);
            if (nameUrl) {
                nameHtml = `<a href="${nameUrl}" target="_blank">${nameHtml}</a>`;
            }
            companyLines.push(`<div><b>${nameHtml}</b></div>`);
            if (isAmendment) {
                let idHtml = company.stateId ? renderCopy(company.stateId) : '<span style="color:#aaa">-</span>';
                const idUrl = buildSosUrl(company.state, company.stateId);
                if (company.stateId && idUrl) {
                    idHtml = `<a href="${idUrl}" target="_blank">${idHtml}</a>`;
                }
                companyLines.push(`<div>${idHtml}</div>`);
                companyLines.push(`<div>${company.state || '<span style="color:#aaa">-</span>'}</div>`);
            } else {
                companyLines.push(`<div>${company.state || '<span style="color:#aaa">-</span>'}</div>`);
            }
            companyLines.push(addrHtml);
            companyLines.push(`<div class="company-purpose">${renderCopy(company.purpose)}</div>`);
            html += `
            <div class="section-label">COMPANY:</div>
            <div class="white-box" style="margin-bottom:10px">
                ${companyLines.join('')}
            </div>`;
            if (isAmendment) {
                html += `
                <div style="text-align:center;margin-bottom:10px;">
                    <button id="view-family-tree" class="copilot-button" style="padding:4px 8px;font-size:12px;">FAMILY TREE</button>
                </div>
                <div id="family-tree-orders" style="display:none"></div>`;
            }
        }
        // AGENT
        if (agent && Object.values(agent).some(v => v)) {
            const expDate = agent.expiration ? parseDate(agent.expiration) : null;
            const expired = expDate && expDate < new Date();
            let status = (agent.status || "").trim();
            let statusClass = "copilot-tag";
            let statusDisplay = "";
            const showStatus = isInternal(agent.name, agent.address);
            if (/^yes/i.test(status)) {
                statusClass += " copilot-tag-green";
                statusDisplay = `Active${agent.expiration ? ` (${escapeHtml(agent.expiration)})` : ""}`;
            } else if (/resigned|staged for resignatio/i.test(status) || expired) {
                statusClass += " copilot-tag-red";
                statusDisplay = `Resigned${agent.expiration ? ` (${escapeHtml(agent.expiration)})` : ""}`;
            } else if (status && !/no service/i.test(status)) {
                statusDisplay = `${status}${agent.expiration ? ` (${escapeHtml(agent.expiration)})` : ""}`;
            }
            const statusHtml = statusDisplay ? `<span class="${statusClass}">${escapeHtml(statusDisplay)}</span>`
                                              : '<span style="color:#aaa">-</span>';
            html += `
            <div class="section-label">AGENT:</div>
            <div class="white-box" style="margin-bottom:10px">
                <div><b>${renderCopy(agent.name)}</b></div>
                <div>${renderAddress(agent.address, isVAAddress(agent.address))}</div>
                ${showStatus ? `<div>${statusHtml}</div>` : ""}
            </div>`;
        }
        // DIRECTORS / MEMBERS
        if (directors.length) {
            html += `
            <div class="section-label">${isLLC ? 'MEMBERS:' : 'DIRECTORS:'}</div>
            <div class="white-box" style="margin-bottom:10px">
                ${directors.map(d => `
                    <div><b>${renderCopy(d.name)}</b></div>
                    <div>${renderAddress(d.address, isVAAddress(d.address))}</div>
                `).join('<hr style="border:none; border-top:1px solid #eee; margin:6px 0"/>')}
            </div>`;
        }
        // SHAREHOLDERS
        if (shareholders.length) {
            html += `
            <div class="section-label">SHAREHOLDERS:</div>
            <div class="white-box" style="margin-bottom:10px">
                ${shareholders.map(s => `
                    <div><b>${renderCopy(s.name)}</b></div>
                    <div>${renderAddress(s.address, isVAAddress(s.address))}</div>
                    <div>${renderCopy(s.shares)}</div>
                `).join('<hr style="border:none; border-top:1px solid #eee; margin:6px 0"/>')}
            </div>`;
        }
        // OFFICERS
        if (officers.length) {
            html += `
            <div class="section-label">OFFICERS:</div>
            <div class="white-box" style="margin-bottom:10px">
                ${officers.map(o => {
                    const addrLine = o.address && o.address !== '-' ? `<div>${renderAddress(o.address, isVAAddress(o.address))}</div>` : '';
                    return `
                        <div><b>${renderCopy(o.name)}</b></div>
                        ${addrLine}
                        <div>${renderCopy(o.position)}</div>
                    `;
                }).join('<hr style="border:none; border-top:1px solid #eee; margin:6px 0"/>')}
            </div>`;
        }

        if (!html) {
            html = `<div style="text-align:center; color:#aaa; margin-top:40px">No se encontró información relevante de la orden.</div>`;
        }

        const body = document.getElementById('copilot-body-content');
        if (body) {
            body.innerHTML = html;
            body.querySelectorAll('.copilot-address').forEach(el => {
                el.addEventListener('click', e => {
                    e.preventDefault();
                    const addr = el.dataset.address;
                    if (!addr) return;
                    navigator.clipboard.writeText(addr).catch(err => console.warn('[Copilot] Clipboard', err));
                    window.open('https://www.google.com/search?q=' + encodeURIComponent(addr), '_blank');
                });
            });
            body.querySelectorAll('.copilot-usps').forEach(el => {
                el.addEventListener('click', e => {
                    e.preventDefault();
                    const addr = el.dataset.address;
                    if (!addr) return;
                    const url = 'https://tools.usps.com/zip-code-lookup.htm?byaddress&fennec_addr=' + encodeURIComponent(addr);
                    window.open(url, '_blank');
                });
            });
            body.querySelectorAll('.copilot-copy').forEach(el => {
                el.addEventListener('click', e => {
                    const text = el.dataset.copy;
                    if (!text) return;
                    navigator.clipboard.writeText(text).catch(err => console.warn('[Copilot] Clipboard', err));
                });
            });
            body.querySelectorAll('.company-purpose .copilot-copy').forEach(el => {
                el.addEventListener('click', e => {
                    const text = el.dataset.copy;
                    if (!text) return;
                    window.open('https://www.google.com/search?q=' + encodeURIComponent(text), '_blank');
                });
            });
            const ftBtn = body.querySelector('#view-family-tree');
            if (ftBtn) {
                ftBtn.addEventListener('click', () => {
                    const container = body.querySelector('#family-tree-orders');
                    if (!container) return;

                    if (container.style.display === 'block') {
                        container.style.display = 'none';
                        return;
                    }
                    container.style.display = 'block';

                    if (container.dataset.loaded === 'true') return;

                    const parentId = getParentOrderId();
                    if (!parentId) {
                        alert('Parent order not found');
                        return;
                    }
                    ftBtn.disabled = true;
                    chrome.runtime.sendMessage({ action: 'fetchChildOrders', orderId: parentId }, (resp) => {
                        ftBtn.disabled = false;
                        if (!resp || !resp.childOrders || !resp.parentInfo) return;
                        const box = document.createElement('div');
                        box.className = 'white-box';
                        box.style.marginBottom = '10px';

                        let html = '';
                        const parent = resp.parentInfo;
                        html += `<div class="section-label">PARENT</div>`;
                        html += `<div class="ft-grid">` +
                            `<div><b><a href="#" class="ft-link" data-id="${escapeHtml(parent.orderId)}">${escapeHtml(parent.orderId)}</a></b></div>` +
                            `<div>${escapeHtml(parent.type)}</div>` +
                            `<div>${escapeHtml(parent.date)}</div>` +
                            `<div><span class="copilot-tag">${escapeHtml(parent.status)}</span></div>` +
                            `</div>`;
                        html += `<div class="section-label">CHILD</div>`;
                        html += resp.childOrders.map(o => `
                            <div class="ft-grid">
                                <div><b><a href="#" class="ft-link" data-id="${escapeHtml(o.orderId)}">${escapeHtml(o.orderId)}</a></b></div>
                                <div>${escapeHtml(o.type)}</div>
                                <div>${escapeHtml(o.date)}</div>
                                <div><span class="copilot-tag">${escapeHtml(o.status)}</span></div>
                            </div>`).join('');
                        box.innerHTML = html;
                        container.innerHTML = '';
                        container.appendChild(box);
                        container.dataset.loaded = 'true';

                        container.querySelectorAll('.ft-link').forEach(a => {
                            a.addEventListener('click', e => {
                                e.preventDefault();
                                const id = a.dataset.id;
                                if (id) {
                                    chrome.runtime.sendMessage({ action: 'openTab', url: `https://db.incfile.com/incfile/order/detail/${id}` });
                                }
                            });
                        });
                    });
                });
            }
        }
    }

    function extractAndShowAmendmentData() {
        extractAndShowFormationData(true);
    }

    });

    function startCancelProcedure() {
        console.log('[Copilot] Starting cancel procedure');

        function resolveIfNeeded(next) {
            const btn = Array.from(document.querySelectorAll('a'))
                .find(a => /mark resolved/i.test(a.textContent));
            if (btn) {
                btn.click();
                const check = setInterval(() => {
                    if (document.readyState === 'complete') {
                        clearInterval(check);
                        next();
                    }
                }, 1000);
            } else {
                next();
            }
        }

        function openCancelPopup() {
            const statusBtn = document.querySelector('.btn-status-text');
            if (!statusBtn) return console.warn('[Copilot] Status dropdown not found');
            statusBtn.click();
            setTimeout(() => {
                const cancelLink = Array.from(document.querySelectorAll('.dropdown-menu a'))
                    .find(a => /cancel.*refund/i.test(a.textContent));
                if (!cancelLink) return console.warn('[Copilot] Cancel option not found');
                cancelLink.click();
                selectReason();
            }, 500);
        }

        function selectReason() {
            const sel = document.querySelector('select');
            if (!sel) return setTimeout(selectReason, 500);
            const opt = Array.from(sel.options)
                .find(o => /client.*cancell?ation/i.test(o.textContent));
            if (opt) {
                sel.value = opt.value;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        resolveIfNeeded(openCancelPopup);
    }

    function getLastIssueInfo() {
        function parseRow(row) {
            const cells = row.querySelectorAll('td');
            if (cells.length < 5) return null;
            const resolution = cells[4].textContent.trim();
            const text = cells[2].textContent.trim();
            const active = /mark resolved/i.test(resolution) ? true : !/resolved/i.test(resolution);
            return { text, active };
        }

        const modalRows = Array.from(document.querySelectorAll('#modalUpdateIssue table tbody tr'))
            .filter(r => r.querySelectorAll('td').length >= 5);
        if (modalRows.length) {
            const info = parseRow(modalRows[0]);
            if (info) return info;
        }

        const tableRows = Array.from(document.querySelectorAll('.issue-history table tbody tr'))
            .filter(r => r.querySelectorAll('td').length >= 5);
        if (tableRows.length) {
            const info = parseRow(tableRows[0]);
            if (info) return info;
        }

        const history = document.querySelector('.issue-history .steamline');
        if (history) {
            const item = history.querySelector('.sl-item');
            if (item) {
                const desc = item.querySelector('.desc');
                const txt = desc ? desc.textContent.trim() : item.textContent.trim();
                const icon = item.querySelector('.sl-left');
                const active = icon && icon.classList.contains('bg-red') ? true : !/resolved/i.test(txt);
                return { text: txt, active };
            }
        }
        return null;
    }

    function getChildOrdersInfo() {
        const rows = Array.from(document.querySelectorAll('.child-orders tbody tr'));
        const parse = row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 5) return null;
            const numTxt = cells[0].textContent.replace(/[^0-9]/g, '');
            const type = cells[2].textContent.trim();
            const date = cells[3].textContent.trim();
            const status = cells[4].textContent.trim();
            return { orderId: numTxt, type, date, status };
        };
        const info = rows.map(parse).filter(Boolean);
        info.sort((a, b) => {
            const da = Date.parse(a.date);
            const db = Date.parse(b.date);
            return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
        });
        return info.slice(0, 3);
    }

    function getBasicOrderInfo() {
        const orderId = (location.pathname.match(/detail\/(\d+)/) || [])[1] || '';
        const type = getOrderType();
        const dateLi = Array.from(document.querySelectorAll('li')).find(li =>
            li.querySelector('a') && li.querySelector('a').innerText.trim().toLowerCase() === 'date ordered'
        );
        const date = dateLi ? dateLi.querySelector('span')?.innerText.trim() || '' : '';
        const status = document.querySelector('.btn-status-text')?.innerText.trim() || '';
        return { orderId, type, date, status };
    }

    function getParentOrderId() {
        const link = Array.from(document.querySelectorAll('a[href*="/order/detail/"]'))
            .find(a => /parent order/i.test(a.closest('li')?.innerText || a.closest('.form-group')?.innerText || ''));
        if (!link) return null;
        const m = link.href.match(/detail\/(\d+)/);
        return m ? m[1] : null;
    }
})();
