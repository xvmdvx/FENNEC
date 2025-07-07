// Injects the FENNEC sidebar into Gmail pages.
// Pads main panels and the attachment viewer so content stays visible.
(function persistentSidebar() {
    // Clear the closed flag on full reloads so the sidebar returns
    window.addEventListener('beforeunload', () => {
        sessionStorage.removeItem("fennecSidebarClosed");
    });
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'fennecToggle') {
            window.location.reload();
        }
        if (msg.action === 'sosPermissionError') {
            alert('Permiso denegado para abrir la búsqueda SOS.');
        }
    });
    chrome.storage.sync.get({ fennecReviewMode: false, fennecDevMode: false, sidebarWidth: 340 }, ({ fennecReviewMode, fennecDevMode, sidebarWidth }) => {
        chrome.storage.local.get({ extensionEnabled: true, lightMode: false, fennecDevMode: false }, ({ extensionEnabled, lightMode, fennecDevMode: localDev }) => {
        const devMode = localDev || fennecDevMode;
        if (!extensionEnabled) {
            console.log('[FENNEC] Extension disabled, skipping Gmail launcher.');
            return;
        }
        if (lightMode) {
            document.body.classList.add('fennec-light-mode');
        } else {
            document.body.classList.remove('fennec-light-mode');
        }
        try {
            const SIDEBAR_WIDTH = parseInt(sidebarWidth, 10) || 340;
            let reviewMode = sessionStorage.getItem('fennecReviewMode');
            reviewMode = reviewMode === null ? fennecReviewMode : reviewMode === 'true';
            let currentContext = null;
            let storedOrderInfo = null;
            // Preserve the latest DNA details across Gmail pages.
            // Older versions cleared the data on each load when no sidebar was
            // frozen, which prevented displaying Adyen's DNA in Review Mode.

            // Map of US states to their SOS business search pages
            const SOS_URLS = {
                "Alabama": { name: "https://arc-sos.state.al.us/CGI/CORPNAME.MBR/INPUT", id: "https://arc-sos.state.al.us/CGI/corpnumber.mbr/input" },
                "Alaska": { name: "https://www.commerce.alaska.gov/cbp/main/search/entities", id: "https://www.commerce.alaska.gov/cbp/main/search/entities" },
                "Arizona": { name: "https://ecorp.azcc.gov/EntitySearch/Index", id: "https://ecorp.azcc.gov/EntitySearch/Index" },
                "Arkansas": { name: "https://www.ark.org/corp-search/", id: "https://www.ark.org/corp-search/" },
                "California": { name: "https://bizfileonline.sos.ca.gov/search/business", id: "https://bizfileonline.sos.ca.gov/search/business" },
                "Colorado": { name: "https://www.sos.state.co.us/biz/BusinessEntityCriteriaExt.do", id: "https://www.sos.state.co.us/biz/BusinessEntityCriteriaExt.do" },
                "Connecticut": { name: "https://service.ct.gov/business/s/onlinebusinesssearch?language=en_US", id: "https://service.ct.gov/business/s/onlinebusinesssearch?language=en_US" },
                "Delaware": { name: "https://icis.corp.delaware.gov/Ecorp/EntitySearch/NameSearch.aspx", id: "https://icis.corp.delaware.gov/Ecorp/EntitySearch/NameSearch.aspx" },
                "District of Columbia": { name: "https://os.dc.gov/", id: "https://os.dc.gov/" },
                "Florida": { name: "https://search.sunbiz.org/Inquiry/CorporationSearch/ByName", id: "https://search.sunbiz.org/Inquiry/CorporationSearch/ByDocumentNumber" },
                "Georgia": { name: "https://ecorp.sos.ga.gov/BusinessSearch", id: "https://ecorp.sos.ga.gov/BusinessSearch" },
                "Hawaii": { name: "https://hbe.ehawaii.gov/documents/search.html", id: "https://hbe.ehawaii.gov/documents/search.html" },
                "Idaho": { name: "https://sosbiz.idaho.gov/search/business", id: "https://sosbiz.idaho.gov/search/business" },
                "Illinois": { name: "https://apps.ilsos.gov/businessentitysearch/", id: "https://apps.ilsos.gov/businessentitysearch/" },
                "Indiana": { name: "https://bsd.sos.in.gov/publicbusinesssearch", id: "https://bsd.sos.in.gov/publicbusinesssearch" },
                "Iowa": { name: "https://sos.iowa.gov/search/business/search.aspx", id: "https://sos.iowa.gov/search/business/search.aspx" },
                "Kansas": { name: "https://www.sos.ks.gov/eforms/BusinessEntity/Search.aspx", id: "https://www.sos.ks.gov/eforms/BusinessEntity/Search.aspx" },
                "Kentucky": { name: "https://sosbes.sos.ky.gov/BusSearchNProfile/Search.aspx?na=true", id: "https://sosbes.sos.ky.gov/BusSearchNProfile/Search.aspx?na=true" },
                "Louisiana": { name: "https://coraweb.sos.la.gov/commercialsearch/commercialsearch.aspx", id: "https://coraweb.sos.la.gov/commercialsearch/commercialsearch.aspx" },
                "Maine": { name: "https://apps3.web.maine.gov/nei-sos-icrs/ICRS?MainPage=", id: "https://apps3.web.maine.gov/nei-sos-icrs/ICRS?MainPage=" },
                "Maryland": { name: "https://egov.maryland.gov/businessexpress/entitysearch", id: "https://egov.maryland.gov/businessexpress/entitysearch" },
                "Massachusetts": { name: "https://corp.sec.state.ma.us/corpweb/CorpSearch/CorpSearch.aspx", id: "https://corp.sec.state.ma.us/corpweb/CorpSearch/CorpSearch.aspx" },
                "Michigan": { name: "https://www.michigan.gov/lara/online-services/business-entity-search", id: "https://www.michigan.gov/lara/online-services/business-entity-search" },
                "Minnesota": { name: "https://mblsportal.sos.mn.gov/Business/Search", id: "https://mblsportal.sos.mn.gov/Business/Search" },
                "Mississippi": { name: "https://corp.sos.ms.gov/corp/portal/c/page/corpBusinessIdSearch/portal.aspx", id: "https://corp.sos.ms.gov/corp/portal/c/page/corpBusinessIdSearch/portal.aspx" },
                "Missouri": { name: "https://bsd.sos.mo.gov/BusinessEntity/BESearch.aspx?SearchType=0", id: "https://bsd.sos.mo.gov/BusinessEntity/BESearch.aspx?SearchType=0" },
                "Montana": { name: "https://biz.sosmt.gov/search/business/1000", id: "https://biz.sosmt.gov/search/business/1000" },
                "Nebraska": { name: "https://www.nebraska.gov/sos/corp/corpsearch.cgi?nav=search", id: "https://www.nebraska.gov/sos/corp/corpsearch.cgi?nav=search" },
                "Nevada": { name: "https://esos.nv.gov/EntitySearch/OnlineEntitySearch", id: "https://esos.nv.gov/EntitySearch/OnlineEntitySearch" },
                "New Hampshire": { name: "https://quickstart.sos.nh.gov/online/BusinessInquire", id: "https://quickstart.sos.nh.gov/online/BusinessInquire" },
                "New Jersey": { name: "https://www.njportal.com/DOR/BusinessNameSearch/Search/BusinessName", id: "https://www.njportal.com/DOR/BusinessNameSearch/Search/EntityId" },
                "New Mexico": { name: "https://enterprise.sos.nm.gov/search", id: "https://enterprise.sos.nm.gov/search" },
                "New York": { name: "https://apps.dos.ny.gov/publicInquiry/", id: "https://apps.dos.ny.gov/publicInquiry/" },
                "North Carolina": { name: "https://www.sosnc.gov/online_services/search/by_title/_Business_Registration", id: "https://www.sosnc.gov/online_services/search/by_title/_Business_Registration" },
                "North Dakota": { name: "https://firststop.sos.nd.gov/search", id: "https://firststop.sos.nd.gov/search" },
                "Ohio": { name: "https://businesssearch.ohiosos.gov/", id: "https://businesssearch.ohiosos.gov/" },
                "Oklahoma": { name: "https://www.sos.ok.gov/corp/corpInquiryFind.aspx", id: "https://www.sos.ok.gov/corp/corpInquiryFind.aspx" },
                "Oregon": { name: "https://sos.oregon.gov/business/Pages/find.aspx", id: "https://sos.oregon.gov/business/Pages/find.aspx" },
                "Pennsylvania": { name: "https://file.dos.pa.gov/search/business", id: "https://file.dos.pa.gov/search/business" },
                "Rhode Island": { name: "https://business.sos.ri.gov/corp/CorpSearch/CorpSearchInput.asp", id: "https://business.sos.ri.gov/corp/CorpSearch/CorpSearchInput.asp" },
                "South Carolina": { name: "https://businessfilings.sc.gov/BusinessFiling/Entity/NewFiling", id: "https://businessfilings.sc.gov/BusinessFiling/Entity/NewFiling" },
                "South Dakota": { name: "https://sosenterprise.sd.gov/BusinessServices/Business/FilingSearch.aspx", id: "https://sosenterprise.sd.gov/BusinessServices/Business/FilingSearch.aspx" },
                "Tennessee": { name: "https://tncab.tnsos.gov/business-entity-search", id: "https://tncab.tnsos.gov/business-entity-search" },
                "Texas": { name: "https://comptroller.texas.gov/taxes/franchise/account-status/search", id: "https://comptroller.texas.gov/taxes/franchise/account-status/search" },
                "Utah": { name: "https://businessregistration.utah.gov/NameAvailabilitySearch", id: "https://businessregistration.utah.gov/EntitySearch/OnlineEntitySearch" },
                "Vermont": { name: "https://www.vermontbusinessregistry.com/BusinessSearch.aspx", id: "https://www.vermontbusinessregistry.com/BusinessSearch.aspx" },
                "Virginia": { name: "https://cis.scc.virginia.gov/EntitySearch/Index", id: "https://cis.scc.virginia.gov/EntitySearch/Index" },
                "Washington": { name: "https://ccfs.sos.wa.gov/#/", id: "https://ccfs.sos.wa.gov/#/" },
                "West Virginia": { name: "https://apps.sos.wv.gov/business/corporations/", id: "https://apps.sos.wv.gov/business/corporations/" },
                "Wisconsin": { name: "https://apps.dfi.wi.gov/apps/corpsearch/search.aspx", id: "https://apps.dfi.wi.gov/apps/corpsearch/search.aspx" },
                "Wyoming": { name: "https://wyobiz.wyo.gov/business/filingsearch.aspx", id: "https://wyobiz.wyo.gov/business/filingsearch.aspx" }
            };

            function canonicalizeState(state) {
                if (!state) return '';
                const clean = String(state).trim().toLowerCase();
                for (const key of Object.keys(SOS_URLS)) {
                    if (key.toLowerCase() === clean) return key;
                }
                return String(state).trim();
            }

            function buildSosUrl(state, query, type = 'name') {
                const rec = SOS_URLS[canonicalizeState(state)];
                if (!rec) return null;
                const base = rec[type] || rec.name;
                if (!query) return base;
                const sep = base.includes('?') ? '&' : '?';
                return base + sep + 'q=' + encodeURIComponent(query);
            }
            window.buildSosUrl = buildSosUrl;

        function applyPaddingToMainPanels() {
            const candidates = [
                ...Array.from(document.body.querySelectorAll(':scope > .nH')),
                ...Array.from(document.body.querySelectorAll('.aeF')),
                ...Array.from(document.body.querySelectorAll('.Bk')),
                ...Array.from(document.body.querySelectorAll('div[role="dialog"]'))
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
        function showFloatingIcon() {
            if (document.getElementById("fennec-floating-icon")) return;
            const icon = document.createElement("img");
            icon.id = "fennec-floating-icon";
            icon.src = chrome.runtime.getURL("fennec_icon.png");
            icon.alt = "FENNEC";
            icon.addEventListener("click", () => {
                icon.remove();
                sessionStorage.removeItem("fennecSidebarClosed");
                const panels = applyPaddingToMainPanels();
                injectSidebar(panels);
                showInitialStatus();
            });
            document.body.appendChild(icon);
        }

        function ensureFloatingIcon() {
            if (sessionStorage.getItem("fennecSidebarClosed") === "true" &&
                !document.getElementById("fennec-floating-icon") &&
                !document.getElementById("copilot-sidebar")) {
                showFloatingIcon();
            }
        }


        function showFullDetails() {
            const container = document.getElementById("db-summary-section");
            if (!container) return;
            Array.from(container.children).forEach(el => el.style.display = "");
            const btn = document.getElementById("review-details-btn");
            if (btn) btn.remove();
        }

        function updateDetailVisibility() {
            const container = document.getElementById("db-summary-section");
            if (!container) return;
            const quick = container.querySelector("#quick-summary");
            const orderBox = document.querySelector(".order-summary-box");
            const issueBox = document.getElementById("issue-summary-box");
            const clientLabel = container.querySelector("#client-section-label");
            const clientBox = container.querySelector("#client-section-box");
            const billingLabel = container.querySelector("#billing-section-label");
            const billingBox = container.querySelector("#billing-section-box");
            if (!quick || !orderBox) return;
            if (reviewMode) {
                const compLabel = Array.from(container.querySelectorAll(".section-label"))
                    .find(l => l.textContent.trim().startsWith("COMPANY"));
                const compBox = compLabel ? compLabel.nextElementSibling : null;
                if (compBox) {
                    compBox.dataset.reviewMerged = "1";
                    const purposeEl = compBox.querySelector('.company-purpose');
                    if (purposeEl) {
                        let prev = purposeEl.previousElementSibling;
                        while (prev) {
                            const toRemove = prev;
                            prev = prev.previousElementSibling;
                            toRemove.remove();
                        }
                    }
                    const last = compBox.lastElementChild;
                    if (last && !last.textContent.trim()) last.remove();
                    orderBox.appendChild(compBox);
                }
                if (compLabel) compLabel.remove();
                orderBox.appendChild(quick);
                quick.classList.remove("white-box");
                quick.classList.remove("quick-summary-collapsed");
                quick.style.margin = "8px 0 0";
                quick.style.padding = "0";
                quick.style.maxHeight = "none";
                Array.from(container.children).forEach(el => {
                    if (el !== quick && el !== clientLabel && el !== clientBox && el !== billingLabel && el !== billingBox) el.style.display = "none";
                });
                if (clientLabel && clientBox) { clientLabel.style.display = ""; clientBox.style.display = ""; }
                if (billingLabel && billingBox) { billingLabel.style.display = ""; billingBox.style.display = ""; }
                if (issueBox) issueBox.style.display = "none";
            } else {
                if (issueBox) issueBox.style.display = "";
                orderBox.querySelectorAll('[data-review-merged="1"]').forEach(el => el.remove());
                if (quick.parentElement !== container) container.prepend(quick);
                quick.classList.add("white-box");
                quick.classList.add("quick-summary-collapsed");
                quick.style.marginBottom = "10px";
                quick.style.padding = "12px";
                quick.style.maxHeight = "0";
                showFullDetails();
                if (clientLabel && clientBox) { clientLabel.style.display = "none"; clientBox.style.display = "none"; }
                if (billingLabel && billingBox) { billingLabel.style.display = "none"; billingBox.style.display = "none"; }
            }
        }

        function applyReviewMode() {
            const header = document.querySelector("#copilot-sidebar .order-summary-header");
            if (header) header.style.display = reviewMode ? "none" : "";
            const orderBoxEl = document.querySelector("#copilot-sidebar .order-summary-box");
            if (orderBoxEl) orderBoxEl.style.marginTop = reviewMode ? "4px" : "12px";
            const actionsRow = document.querySelector("#copilot-sidebar .copilot-actions");
            const dnaRow = document.querySelector("#copilot-sidebar .copilot-dna");
            const dnaBtn = document.getElementById("btn-dna");
            const xrayBtn = document.getElementById("btn-xray");
            const openOrder = document.getElementById("btn-open-order");
            if (reviewMode) {
                if (openOrder) openOrder.style.display = "none";
                if (actionsRow && !dnaBtn) {
                    const btn = document.createElement("button");
                    btn.id = "btn-dna";
                    btn.className = "copilot-button";
                    btn.textContent = "🧬 DNA";
                    actionsRow.appendChild(btn);
                    setupDnaButton();
                    loadDnaSummary();
            loadKountSummary();
                }
                if (actionsRow && !xrayBtn) {
                    const xbtn = document.createElement("button");
                    xbtn.id = "btn-xray";
                    xbtn.className = "copilot-button";
                    xbtn.textContent = "🩻 XRAY";
                    actionsRow.appendChild(xbtn);
                    setupXrayButton();
                }
            } else {
                if (openOrder) openOrder.style.display = "";
                if (dnaBtn) {
                    dnaBtn.remove();
                    refreshSidebar();
                }
                if (xrayBtn) xrayBtn.remove();
            }
            chrome.storage.sync.set({ fennecReviewMode: reviewMode });
            chrome.storage.local.set({ fennecReviewMode: reviewMode });
            updateDetailVisibility();
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


        function renderAddress(addr) {
            if (!addr) return '<span style="color:#aaa">-</span>';
            addr = cleanAddress(addr);
            const parts = addr.split(/,\s*/);

            const firstLine = parts.shift() || '';
            let secondLine = '';
            let rest = '';

            if (parts.length > 2) {
                secondLine = parts.shift();
                rest = parts.join(', ');
            } else {
                rest = parts.join(', ');
            }

            const lines = [firstLine];
            if (secondLine) lines.push(secondLine);
            if (rest) lines.push(rest);
            const display = lines.map(escapeHtml).join('<br>');
            const escFull = escapeHtml(addr);
            return `<span class="address-wrapper"><a href="#" class="copilot-address" data-address="${escFull}">${display}</a><span class="copilot-usps" data-address="${escFull}" title="USPS Lookup"> ✉️</span><span class="copilot-copy-icon" data-copy="${escFull}" title="Copy">⧉</span></span>`;
        }

        // Format billing address into two lines and add USPS verification
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
                addr = cleanAddress(addr);
                const parts = addr.split(/,\s*/);
                line1 = parts.shift() || '';
                if (parts.length > 1) {
                    const second = parts[0].trim();
                    if (parts.length > 2 || /\d/.test(second) || /(apt|suite|ste|unit|#|floor|bldg|building|po box)/i.test(second)) {
                        line1 += ' ' + parts.shift();
                    }
                }
                line2 = parts.join(', ');
            }

            const lines = [];
            if (line1) lines.push(escapeHtml(line1));
            if (line2) lines.push(escapeHtml(line2));
            const escFull = escapeHtml(addr);
            return `<span class="address-wrapper"><a href="#" class="copilot-address" data-address="${escFull}">${lines.join('<br>')}</a><span class="copilot-usps" data-address="${escFull}" title="USPS Lookup"> ✉️</span><span class="copilot-copy-icon" data-copy="${escFull}" title="Copy">⧉</span></span>`;
        }

        function normalizeAddr(a) {
            if (!a) return '';
            return cleanAddress(a)
                .toLowerCase()
                .replace(/[.,]/g, '')
                .replace(/\s+/g, ' ')
                .replace(/\s+(?:us|usa|united states(?: of america)?)$/, '')
                .trim();
        }

        function getBillingInfo() {
            const box = document.querySelector('#billing-section-box');
            if (!box) return null;
            const info = { cardholder: '', last4: '', expiry: '', address: '' };
            const divs = box.querySelectorAll(':scope > div');
            if (divs[0]) info.cardholder = divs[0].textContent.trim();
            if (divs[1]) {
                const parts = divs[1].textContent.split('•').map(s => s.trim());
                if (parts[1]) info.last4 = parts[1];
                if (parts[2]) info.expiry = parts[2];
            }
            const addrLink = box.querySelector('.address-wrapper a');
            if (addrLink) info.address = addrLink.getAttribute('data-address') || addrLink.textContent.trim();
            return info;
        }


        function buildCardMatchTag(info) {
            const billing = getBillingInfo();
            if (!billing) return '';
            const card = info.payment.card || {};
            const normalizeName = n => (n || '').toUpperCase().replace(/\s+/g, ' ').trim();
            const dbName = normalizeName(billing.cardholder);
            const dnaName = normalizeName(card['Card holder']);
            const dbDigits = (billing.last4 || '').replace(/\D+/g, '').slice(-4);
            const dnaDigits = (card['Card number'] || '').replace(/\D+/g, '').slice(-4);
            const parseExp = d => {
                if (!d) return '';
                const digits = d.replace(/\D+/g, '');
                return digits.length >= 4 ? digits.slice(0, 2) + digits.slice(-2) : digits;
            };
            const dbExp = parseExp(billing.expiry);
            const dnaExp = parseExp(card['Expiry date']);

            let compared = 0;
            let matches = 0;
            const mism = [];
            if (dbName && dnaName) {
                compared++;
                if (dbName === dnaName) {
                    matches++;
                } else {
                    mism.push('NAME ✖️');
                }
            }
            if (dbDigits && dnaDigits) {
                compared++;
                if (dbDigits === dnaDigits) {
                    matches++;
                } else {
                    mism.push('LAST 4 ✖️');
                }
            }
            if (dbExp && dnaExp) {
                compared++;
                if (dbExp === dnaExp) {
                    matches++;
                } else {
                    mism.push('EXP DATE ✖️');
                }
            }
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

        function renderCopy(text) {
            if (!text) return '<span style="color:#aaa">-</span>';
            const esc = escapeHtml(text);
            return `<span class="copilot-copy" data-copy="${esc}">${esc}</span>`;
        }

        function renderCopyIcon(text) {
            if (!text) return '';
            const esc = escapeHtml(text);
            return `<span class="copilot-copy-icon" data-copy="${esc}" title="Copy">⧉</span>`;
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
            const container = document.querySelector('.order-summary-box');
            if (container) container.style.display = 'block';
            const orderId = context?.orderNumber || (storedOrderInfo && storedOrderInfo.orderId) || '';
            const url = orderId ? `https://db.incfile.com/incfile/order/detail/${orderId}` : '#';

            let html = `<div id="order-summary-link" style="text-align:center">`;
            if (reviewMode && storedOrderInfo) {
                const nameBase = buildSosUrl(storedOrderInfo.companyState, null, 'name');
                const companyName = escapeHtml(storedOrderInfo.companyName || '');
                if (companyName) {
                    const cLink = nameBase ? `<a href="#" id="company-link" class="copilot-sos copilot-link" data-url="${nameBase}" data-query="${companyName}" data-type="name">${companyName}</a>` : companyName;
                    html += `<div class="order-summary-company"><b>${cLink}</b></div>`;
                }
                if (storedOrderInfo.companyId) {
                    const idBase = buildSosUrl(storedOrderInfo.companyState, null, 'id');
                    const compId = escapeHtml(storedOrderInfo.companyId);
                    const idLink = idBase ? `<a href="#" class="copilot-sos copilot-link" data-url="${idBase}" data-query="${compId}" data-type="id">${compId}</a>` : compId;
                    const dof = storedOrderInfo.type && storedOrderInfo.type.toLowerCase() !== 'formation' && storedOrderInfo.formationDate
                        ? ` (${escapeHtml(storedOrderInfo.formationDate)})`
                        : '';
                    html += `<div>${idLink}${dof} ${renderCopyIcon(storedOrderInfo.companyId)}</div>`;
                }
            }
            if (orderId) html += `<div><b><a href="#" id="order-link" class="order-link">${renderCopy(orderId)}</a> ${renderCopyIcon(orderId)}</b></div>`;
            if (reviewMode && storedOrderInfo) {
                const typeTag = storedOrderInfo.type ? `<span class="copilot-tag">${escapeHtml(storedOrderInfo.type)}</span>` : "";
                const expClass = storedOrderInfo.expedited ? 'copilot-tag copilot-tag-green' : 'copilot-tag';
                const expTag = `<span class="${expClass}">${storedOrderInfo.expedited ? 'Expedited' : 'Non Expedited'}</span>`;
                html += `<div>${typeTag} ${expTag}</div>`;
            }
            html += '</div>';
            summaryBox.innerHTML = html;
            const link = summaryBox.querySelector('#order-link');
            if (link && orderId) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    chrome.runtime.sendMessage({ action: 'openActiveTab', url });
                });
            }
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


        function loadDbSummary(expectedId) {
            const container = document.getElementById('db-summary-section');
            if (!container) return;
            document.querySelectorAll('#copilot-sidebar #quick-summary').forEach(el => el.remove());
            chrome.storage.local.get({ sidebarDb: [], sidebarOrderId: null, sidebarOrderInfo: null }, ({ sidebarDb, sidebarOrderId, sidebarOrderInfo }) => {
                if (Array.isArray(sidebarDb) && sidebarDb.length && (!expectedId || sidebarOrderId === expectedId)) {
                    container.innerHTML = sidebarDb.join("");
                    container.style.display = 'block';
                    attachCommonListeners(container);
                    const qbox = container.querySelector('#quick-summary');
                    if (qbox) {
                        qbox.classList.remove('quick-summary-collapsed');
                        qbox.style.maxHeight = 'none';
                    }
                    storedOrderInfo = sidebarOrderInfo;
                    fillOrderSummaryBox(currentContext);
                } else {
                    container.innerHTML = '';
                    container.style.display = 'none';
                    storedOrderInfo = null;
                }


                repositionDnaSummary();

                updateDetailVisibility();
            });
        }

        function repositionDnaSummary() {
            const dnaBox = document.querySelector('.copilot-dna');
            const summary = document.getElementById('dna-summary');
            if (!dnaBox || !summary) return;
            const dnaBtn = dnaBox.querySelector('#btn-dna');
            const xrayBtn = dnaBox.querySelector('#btn-xray');
            const afterBtn = xrayBtn || dnaBtn;
            if (afterBtn) {
                const next = afterBtn.nextSibling;
                if (next !== summary) dnaBox.insertBefore(summary, next);
            } else if (summary.parentElement !== dnaBox) {
                dnaBox.appendChild(summary);
            }
            const compLabel = Array.from(document.querySelectorAll('#copilot-sidebar .section-label'))
                .find(el => el.textContent.trim().startsWith('COMPANY'));
            if (compLabel && dnaBox.nextElementSibling !== compLabel) {
                compLabel.parentElement.insertBefore(dnaBox, compLabel);
            }
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

       function buildDnaHtml(info) {
            if (!info || !info.payment) return null;
            const p = info.payment;
            const card = p.card || {};
            const shopper = p.shopper || {};
            const proc = p.processing || {};

            const parts = [];

            // First line: bold card holder name only
            if (card['Card holder']) {
                const holder = `<b>${escapeHtml(card['Card holder'])}</b>`;
                parts.push(`<div>${holder}</div>`);
            }

            // Second line: card type, last 4 digits, expiry and funding source
            const cardLine = [];
            if (card['Payment method']) cardLine.push(escapeHtml(card['Payment method']));
            if (card['Card number']) {
                const digits = card['Card number'].replace(/\D+/g, '').slice(-4);
                if (digits) cardLine.push(escapeHtml(digits));
            }
            function formatExpiry(date) {
                if (!date) return '';
                const digits = date.replace(/\D+/g, '');
                if (digits.length >= 4) {
                    const mm = digits.slice(0, 2);
                    const yy = digits.slice(-2);
                    return `${mm}/${yy}`;
                }
                return date;
            }

            if (card['Expiry date']) cardLine.push(escapeHtml(formatExpiry(card['Expiry date'])));
            if (card['Funding source']) cardLine.push(escapeHtml(card['Funding source']));
            if (cardLine.length) parts.push(`<div>${cardLine.join(' \u2022 ')}</div>`);

            // Billing address with issuer info below
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

            // CVV and AVS on the same line
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
                    return { label: 'CVV: MATCH', result: 'green' };
                }
                if (/not\s+match/.test(t) || /\(n\)/.test(t)) {
                    return { label: 'CVV: NO MATCH', result: 'purple' };
                }
                if (/not provided|not checked|error|not supplied|unknown/.test(t)) {
                    return { label: 'CVV: UNKNOWN', result: 'black' };
                }
                return { label: 'CVV: UNKNOWN', result: 'black' };
            }

            function formatAvs(text) {
                const t = (text || '').toLowerCase();
                if (/both\s+postal\s+code\s+and\s+address\s+match/.test(t) || /^7\b/.test(t) || t.includes('both match')) {
                    return { label: 'AVS: MATCH', result: 'green' };
                }
                if (/^6\b/.test(t) || (t.includes('postal code matches') && t.includes("address doesn't"))) {
                    return { label: 'AVS: PARTIAL (STREET✖️)', result: 'purple' };
                }
                if (/^1\b/.test(t) || (t.includes('address matches') && t.includes("postal code doesn't"))) {
                    return { label: 'AVS: PARTIAL (ZIP✖️)', result: 'purple' };
                }
                if (/^2\b/.test(t) || t.includes('neither matches') || /\bw\b/.test(t)) {
                    return { label: 'AVS: NO MATCH', result: 'purple' };
                }
                if (/^0\b/.test(t) || /^3\b/.test(t) || /^4\b/.test(t) || /^5\b/.test(t) || t.includes('unavailable') || t.includes('not supported') || t.includes('no avs') || t.includes('unknown')) {
                    return { label: 'AVS: UNKNOWN', result: 'black' };
                }
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
                const cardTag = buildCardMatchTag(info);
                if (cardTag) tags.push(cardTag);
                if (tags.length) parts.push(`<div>${tags.join(' ')}</div>`);
            }

            // IP line hidden but keep spacing
            const ip = shopper['IP Address'] || shopper['IP'];
            if (ip) parts.push('<div>&nbsp;</div>');

            // Fraud scoring
            if (proc['Fraud scoring']) parts.push(`<div><b>Fraud scoring:</b> ${escapeHtml(proc['Fraud scoring'])}</div>`);

            // Separator line before transaction stats
            if (parts.length) {
                parts.push('<hr style="border:none;border-top:1px solid #555;margin:6px 0"/>');
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
            console.log('[Copilot] Loading DNA summary');
            chrome.storage.local.get({ adyenDnaInfo: null }, ({ adyenDnaInfo }) => {
                const html = buildDnaHtml(adyenDnaInfo);
                if (html) {
                    console.log('[Copilot] DNA data found');
                    container.innerHTML = html;
                } else {
                    console.log('[Copilot] No DNA data available');
                    container.innerHTML = '';
                }
                attachCommonListeners(container);
                repositionDnaSummary();
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

        function formatIssueText(text) {
            if (!text) return '';
            let formatted = text.replace(/\s*(\d+\s*[).])/g, (m, g) => '\n' + g + ' ');
            return formatted.replace(/^\n/, '').trim();
        }

        function fillIssueBox(info, orderId) {
            const box = document.getElementById('issue-summary-box');
            const content = document.getElementById('issue-summary-content');
            const label = document.getElementById('issue-status-label');
            const btn = document.getElementById('issue-resolve-btn');
            if (!box || !content || !label) return;
            box.style.display = 'block';
            if (info && info.text) {
                content.textContent = formatIssueText(info.text);
                label.textContent = info.active ? 'ACTIVE' : 'RESOLVED';
                label.className = 'issue-status-label ' + (info.active ? 'issue-status-active' : 'issue-status-resolved');
                if (btn) btn.textContent = info.active ? 'RESOLVE & COMMENT' : 'COMMENT';
            } else {
                const link = orderId ? `<a href="https://db.incfile.com/incfile/order/detail/${orderId}" target="_blank">${orderId}</a>` : '';
                content.innerHTML = `NO ISSUE DETECTED FROM ORDER: ${link}`;
                label.textContent = '';
                label.className = 'issue-status-label';
                if (btn) btn.textContent = 'COMMENT';
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
            chrome.runtime.sendMessage({ action: "checkLastIssue", orderId }, (resp) => {
                if (chrome.runtime.lastError) {
                    console.warn("[Copilot] Issue check failed:", chrome.runtime.lastError.message);
                    fillIssueBox(null, orderId);
                    return;
                }
                fillIssueBox(resp && resp.issueInfo, orderId);
            });
        }

        function showDnaLoading() {
            const dnaBox = document.querySelector('.copilot-dna');
            if (!dnaBox) return;
            let summary = dnaBox.querySelector('#dna-summary');
            if (!summary) {
                summary = document.createElement('div');
                summary.id = 'dna-summary';
                summary.style.marginTop = '16px';
            }
            const xrayBtn = dnaBox.querySelector('#btn-xray');
            const dnaBtn = dnaBox.querySelector('#btn-dna');
            const afterBtn = xrayBtn || dnaBtn;
            if (afterBtn) dnaBox.insertBefore(summary, afterBtn.nextSibling); else dnaBox.appendChild(summary);
            summary.innerHTML = `<img src="${chrome.runtime.getURL('fennec_icon.png')}" class="loading-fennec"/>`;
            chrome.storage.local.set({ adyenDnaInfo: null });
            repositionDnaSummary();
        }

        function showLoadingState() {
            currentContext = null;
            storedOrderInfo = null;
            const orderBox = document.getElementById('order-summary-content');
            const orderContainer = document.querySelector('.order-summary-box');
            const dbBox = document.getElementById('db-summary-section');
            const issueContent = document.getElementById('issue-summary-content');
            const issueLabel = document.getElementById('issue-status-label');
            const issueBox = document.getElementById('issue-summary-box');
            const icon = `<img src="${chrome.runtime.getURL('fennec_icon.png')}" class="loading-fennec"/>`;
            const dnaBox = document.querySelector('.copilot-dna');
            if (orderContainer) {
                orderContainer.querySelectorAll('[data-review-merged="1"]').forEach(el => el.remove());
            }
            if (orderBox) orderBox.innerHTML = icon;
            if (dbBox) dbBox.innerHTML = icon;
            if (issueBox) {
                const msg = document.getElementById('quick-resolve-confirm');
                if (msg) msg.remove();
                const cText = document.getElementById('quick-resolve-comment-text');
                if (cText) cText.remove();
                let input = document.getElementById('issue-comment-input');
                if (!input) {
                    input = document.createElement('textarea');
                    input.id = 'issue-comment-input';
                    input.className = 'quick-resolve-comment';
                    input.placeholder = 'Comment...';
                    issueBox.appendChild(input);
                } else {
                    input.value = '';
                }
                let btn = document.getElementById('issue-resolve-btn');
                if (!btn) {
                    btn = document.createElement('button');
                    btn.id = 'issue-resolve-btn';
                    btn.className = 'copilot-button';
                    btn.style.marginTop = '4px';
                    btn.textContent = 'COMMENT & RESOLVE';
                    issueBox.appendChild(btn);
                } else {
                    btn.textContent = 'COMMENT & RESOLVE';
                }
                if (issueContent) issueContent.innerHTML = icon;
                issueBox.style.display = 'block';
                setupResolveButton();
            } else if (issueContent) {
                issueContent.innerHTML = icon;
            }
            if (dnaBox) {
                const summary = dnaBox.querySelector('#dna-summary');
                if (summary) summary.innerHTML = '';
                chrome.storage.local.set({ adyenDnaInfo: null });
                repositionDnaSummary();
            }
            if (issueLabel) {
                issueLabel.textContent = '';
                issueLabel.className = 'issue-status-label';
            }
        }

        function showInitialStatus() {
            const orderBox = document.getElementById('order-summary-content');
            const orderContainer = document.querySelector('.order-summary-box');
            const dbBox = document.getElementById('db-summary-section');
            const issueBox = document.getElementById('issue-summary-box');
            const dnaSummary = document.getElementById('dna-summary');
            if (orderContainer) orderContainer.style.display = 'none';
            if (dbBox) dbBox.style.display = 'none';
            if (issueBox) issueBox.style.display = 'none';
            if (orderBox) orderBox.innerHTML = '';
            if (dbBox) dbBox.innerHTML = '';
            if (issueBox) {
                const content = issueBox.querySelector('#issue-summary-content');
                if (content) content.innerHTML = '';
                const label = issueBox.querySelector('#issue-status-label');
                if (label) label.textContent = '';
                const msg = document.getElementById('quick-resolve-confirm');
                if (msg) msg.remove();
                const cText = document.getElementById('quick-resolve-comment-text');
                if (cText) cText.remove();
                let input = document.getElementById('issue-comment-input');
                if (!input) {
                    input = document.createElement('textarea');
                    input.id = 'issue-comment-input';
                    input.className = 'quick-resolve-comment';
                    input.placeholder = 'Comment...';
                    issueBox.appendChild(input);
                } else {
                    input.value = '';
                    issueBox.appendChild(input);
                }
                let btn = document.getElementById('issue-resolve-btn');
                if (!btn) {
                    btn = document.createElement('button');
                    btn.id = 'issue-resolve-btn';
                    btn.className = 'copilot-button';
                    btn.style.marginTop = '4px';
                    btn.textContent = 'COMMENT & RESOLVE';
                    issueBox.appendChild(btn);
                } else {
                    btn.textContent = 'COMMENT & RESOLVE';
                    issueBox.appendChild(btn);
                }
                setupResolveButton();
            }
            if (dnaSummary) dnaSummary.innerHTML = '';
            repositionDnaSummary();
        }

        function refreshSidebar() {
            const ctx = extractOrderContextFromEmail();
            currentContext = ctx;
            chrome.storage.local.get({ sidebarFreezeId: null }, ({ sidebarFreezeId }) => {
                if (sidebarFreezeId && (!ctx || ctx.orderNumber !== sidebarFreezeId)) {
                    chrome.storage.local.set({ sidebarFreezeId: null, adyenDnaInfo: null });
                }
            });
            if (!ctx) {
                showInitialStatus();
                return;
            }
            fillOrderSummaryBox(ctx);
            loadDbSummary(ctx && ctx.orderNumber);
            if (ctx && ctx.orderNumber) checkLastIssue(ctx.orderNumber);
            loadDnaSummary();
            loadKountSummary();
        }

        function clearSidebar() {
            storedOrderInfo = null;
            currentContext = null;
            chrome.storage.local.set({
                sidebarDb: [],
                sidebarOrderId: null,
                sidebarOrderInfo: null,
                adyenDnaInfo: null,
                sidebarFreezeId: null
            });
            showInitialStatus();
            applyReviewMode();
            loadDnaSummary();
            loadKountSummary();
            repositionDnaSummary();
        }

        function handleEmailSearchClick() {
            showLoadingState();

            const context = extractOrderContextFromEmail();
            currentContext = context;
            fillOrderSummaryBox(context);
            loadDbSummary(context && context.orderNumber);

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
                    <span id="qa-toggle" class="quick-actions-toggle">☰</span>
                    <div class="copilot-title">
                        <img src="${chrome.runtime.getURL('fennec_icon.png')}" class="copilot-icon" alt="FENNEC (BETA)" />
                        <span>FENNEC (BETA)</span>
                    </div>
                    <button id="copilot-clear-tabs">🗑</button>
                    <button id="copilot-close">✕</button>
                </div>
                <div class="copilot-body">
                    <div class="copilot-actions" style="justify-content:center">
                        <button id="btn-email-search" class="copilot-button">📧 SEARCH</button>
                    </div>
                    <div class="copilot-dna">
                        <div id="dna-summary" style="margin-top:16px"></div>
                        <div id="kount-summary" style="margin-top:10px"></div>
                    </div>
                    <div class="order-summary-box">
                        <div id="order-summary-content" style="color:#ccc; font-size:13px;">
                            No order data yet.
                        </div>
                    </div>
                    <div id="db-summary-section"></div>
                    <hr style="border:none;border-top:1px solid #555;margin:6px 0"/>
                    <div class="issue-summary-box" id="issue-summary-box" style="margin-top:10px;">
                        <strong>ISSUE <span id="issue-status-label" class="issue-status-label"></span></strong><br>
                        <div id="issue-summary-content" style="color:#ccc; font-size:13px; white-space:pre-line;">No issue data yet.</div>
                        <textarea id="issue-comment-input" class="quick-resolve-comment" placeholder="Comment..."></textarea>
                        <button id="issue-resolve-btn" class="copilot-button" style="margin-top:4px;">COMMENT &amp; RESOLVE</button>
                    </div>
                    ${devMode ? `<div class="copilot-footer"><button id="copilot-refresh" class="copilot-button">🔄 REFRESH</button></div>` : ``}
                    <div class="copilot-footer"><button id="copilot-clear" class="copilot-button">🧹 CLEAR</button></div>
                </div>
            `;
            document.body.appendChild(sidebar);
            chrome.storage.sync.get({
                sidebarFontSize: 13,
                sidebarFont: "'Inter', sans-serif",
                sidebarBgColor: '#212121',
                sidebarBoxColor: '#2e2e2e'
            }, opts => applySidebarDesign(sidebar, opts));

            console.log("[Copilot] Sidebar INYECTADO en Gmail.");

            // Start with empty layout showing only action buttons.
            showInitialStatus();
            loadDnaSummary();
            loadKountSummary();
            repositionDnaSummary();
            // Details load after the user interacts with SEARCH or when
            // opened automatically with context.

            // Botón de cierre
            document.getElementById('copilot-close').onclick = () => {
                sidebar.remove();
                // Limpiar el margin aplicado a los paneles
                mainPanels.forEach(el => el.style.marginRight = '');
                sessionStorage.setItem("fennecSidebarClosed", "true");
                showFloatingIcon();
                console.log("[Copilot] Sidebar cerrado manualmente en Gmail.");
            };

            const clearBtn = document.getElementById('copilot-clear-tabs');
            if (clearBtn) {
                clearBtn.onclick = () => {
                    chrome.runtime.sendMessage({ action: "closeOtherTabs" });
                };
            }

            // Botón SEARCH (listener UNIFICADO)
            document.getElementById("btn-email-search").onclick = handleEmailSearchClick;
            const rBtn = document.getElementById("copilot-refresh");
            if (devMode && rBtn) rBtn.onclick = refreshSidebar;
            const clearSb = document.getElementById("copilot-clear");
            if (clearSb) clearSb.onclick = clearSidebar;

            setupResolveButton();
            applyReviewMode();
            loadDnaSummary();
            loadKountSummary();
        }

        function injectSidebarIfMissing() {
            if (sessionStorage.getItem("fennecSidebarClosed") === "true") { ensureFloatingIcon(); return; }
            if (!document.getElementById('copilot-sidebar')) {
                console.log("[Copilot] Sidebar no encontrado, inyectando en Gmail...");
                const mainPanels = applyPaddingToMainPanels();
                injectSidebar(mainPanels);
                showInitialStatus();
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

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.sidebarDb && document.getElementById('db-summary-section')) {
                loadDbSummary();
            }
            if (area === 'local' && changes.adyenDnaInfo) {
                loadDnaSummary();
            loadKountSummary();
            }
            if (area === 'sync' && changes.fennecReviewMode) {
                reviewMode = changes.fennecReviewMode.newValue;
                sessionStorage.setItem("fennecReviewMode", reviewMode ? "true" : "false");
                applyReviewMode();
            }
            if ((area === 'sync' && changes.fennecDevMode) || (area === 'local' && changes.fennecDevMode)) {
                window.location.reload();
            }
            if (area === 'local' && changes.fennecQuickResolveDone) {
                const data = changes.fennecQuickResolveDone.newValue || {};
                chrome.storage.local.remove('fennecQuickResolveDone');
                const box = document.getElementById('issue-summary-box');
                if (box) {
                    const commentInput = document.getElementById('issue-comment-input');
                    const resolveBtn = document.getElementById('issue-resolve-btn');
                    if (commentInput) commentInput.remove();
                    if (resolveBtn) resolveBtn.remove();
                    if (data.comment) {
                        let c = document.getElementById('quick-resolve-comment-text');
                        if (!c) {
                            c = document.createElement('div');
                            c.id = 'quick-resolve-comment-text';
                            c.className = 'quick-resolve-comment-text';
                            box.appendChild(c);
                        }
                        c.textContent = data.comment;
                    }
                    let msg = document.getElementById('quick-resolve-confirm');
                    if (!msg) {
                        msg = document.createElement('div');
                        msg.id = 'quick-resolve-confirm';
                        msg.style.marginTop = '4px';
                        msg.style.color = '#0a0';
                        box.appendChild(msg);
                    }
                    msg.textContent = 'Issue updated successfully.';
                    msg.style.display = 'block';
                    setTimeout(() => { if (msg) msg.style.display = 'none'; }, 3000);
                    if (data.resolved) {
                        const label = document.getElementById('issue-status-label');
                        if (label) {
                            label.textContent = 'RESOLVED';
                            label.className = 'issue-status-label issue-status-resolved';
                        }
                    }
                }
            }
        });

        // Ensure DNA summary refreshes when returning from Adyen
        window.addEventListener('focus', () => {
            loadDnaSummary();
            loadKountSummary();
        });

        // --- OPEN ORDER listener reutilizable ---
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

        function setupResolveButton() {
            const resolveBtn = document.getElementById("issue-resolve-btn");
            const commentInput = document.getElementById("issue-comment-input");
            if (!resolveBtn || !commentInput || resolveBtn.dataset.listenerAttached) return;
            resolveBtn.dataset.listenerAttached = "true";
            resolveBtn.onclick = () => {
                const comment = commentInput.value.trim();
                const orderId = (storedOrderInfo && storedOrderInfo.orderId) ||
                    (currentContext && currentContext.orderNumber);
                if (!orderId) {
                    alert("No order ID detected.");
                    return;
                }
                if (!comment) {
                    commentInput.focus();
                    return;
                }
                chrome.storage.local.set({ fennecPendingComment: { orderId, comment } }, () => {
                    const url = `https://db.incfile.com/incfile/order/detail/${orderId}`;
                    chrome.runtime.sendMessage({ action: "openOrReuseTab", url, refocus: true, active: true });
                });
            };
        }

        function setupDnaButton() {
            const button = document.getElementById("btn-dna");
            if (!button || button.dataset.listenerAttached) return;
            button.dataset.listenerAttached = "true";
            button.addEventListener("click", function () {
                const skipSearch = button.dataset.skipSearch === "1";
                delete button.dataset.skipSearch;
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
                    function openAdyen() {
                        console.log('[Copilot] Opening Adyen for order', orderId);
                        const url = `https://ca-live.adyen.com/ca/ca/overview/default.shtml?fennec_order=${orderId}`;
                        showDnaLoading();
                        chrome.storage.local.set({ sidebarFreezeId: orderId }, () => {
                            chrome.runtime.sendMessage({ action: "openTab", url, refocus: true, active: true });
                        });
                    }

                    if (!storedOrderInfo || storedOrderInfo.orderId !== orderId) {
                        if (!skipSearch) handleEmailSearchClick();
                        setTimeout(openAdyen, 500);
                    } else {
                        openAdyen();
                    }
                } catch (error) {
                    console.error("Error al intentar buscar en Adyen:", error);
                    alert("Ocurrió un error al intentar buscar en Adyen.");
                }
            });
        }

        function setupXrayButton() {
            const button = document.getElementById("btn-xray");
            if (!button || button.dataset.listenerAttached) return;
            button.dataset.listenerAttached = "true";
            button.addEventListener("click", function () {
                handleEmailSearchClick();
                setTimeout(() => {
                    const dnaBtn = document.getElementById("btn-dna");
                    if (dnaBtn) {
                        dnaBtn.dataset.skipSearch = "1";
                        dnaBtn.click();
                    }
                }, 500);
            });
        }

        waitForElement("#btn-dna").then(() => {
            setupDnaButton();
        }).catch((err) => {
            console.warn("[DNA] No se pudo inyectar el listener:", err);
        });

    } catch (e) {
        console.error("[Copilot] ERROR en Gmail Launcher:", e);
    }
    });
    });
})();
