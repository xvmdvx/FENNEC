// Injects the FENNEC sidebar into DB pages.
(function main() {
    // Clear the closed flag on reloads so the sidebar reappears
    window.addEventListener('beforeunload', () => {
        sessionStorage.removeItem("fennecSidebarClosed");
    });
    let currentOrderType = null;
    let currentOrderTypeText = null;
    let initQuickSummary = null;
    // Tracks whether Review Mode is active across DB pages
    let reviewMode = false;

    function showFloatingIcon() {
        if (document.getElementById("fennec-floating-icon")) return;
        const icon = document.createElement("img");
        icon.id = "fennec-floating-icon";
        icon.src = chrome.runtime.getURL("fennec_icon.png");
        icon.alt = "FENNEC";
        icon.addEventListener("click", () => {
            icon.remove();
            sessionStorage.removeItem("fennecSidebarClosed");
            initSidebar();
        });
        document.body.appendChild(icon);
    }

    function ensureFloatingIcon() {
        if (sessionStorage.getItem("fennecSidebarClosed") === "true" &&
            !document.getElementById("copilot-sidebar") &&
            !document.getElementById("fennec-floating-icon")) {
            showFloatingIcon();
        }
    }

    function getText(el) {
        return el ? (el.textContent || el.innerText || "").trim() : "";
    }

    function loadStoredSummary() {
        const body = document.getElementById('copilot-body-content');
        if (!body) return;
        const currentId = getBasicOrderInfo().orderId;
        chrome.storage.local.get({ sidebarDb: [], sidebarOrderId: null }, ({ sidebarDb, sidebarOrderId }) => {
            if (Array.isArray(sidebarDb) && sidebarDb.length && sidebarOrderId && sidebarOrderId === currentId) {
                body.innerHTML = sidebarDb.join('');
                if (typeof initQuickSummary === 'function') initQuickSummary();
                attachCommonListeners(body);
                updateReviewDisplay();
            } else {
                body.innerHTML = '<div style="text-align:center; color:#aaa; margin-top:40px">No DB data.</div>';
            }
        });
    }
    // Map of US states to their SOS business search pages (name and ID)
    const SOS_URLS = {
        "Alabama": {
            name: "https://arc-sos.state.al.us/CGI/CORPNAME.MBR/INPUT",
            id: "https://arc-sos.state.al.us/CGI/corpnumber.mbr/input"
        },
        "Alaska": {
            name: "https://www.commerce.alaska.gov/cbp/main/search/entities",
            id: "https://www.commerce.alaska.gov/cbp/main/search/entities"
        },
        "Arizona": {
            name: "https://ecorp.azcc.gov/EntitySearch/Index",
            id: "https://ecorp.azcc.gov/EntitySearch/Index"
        },
        "Arkansas": {
            name: "https://www.ark.org/corp-search/",
            id: "https://www.ark.org/corp-search/"
        },
        "California": {
            name: "https://bizfileonline.sos.ca.gov/search/business",
            id: "https://bizfileonline.sos.ca.gov/search/business"
        },
        "Colorado": {
            name: "https://www.sos.state.co.us/biz/BusinessEntityCriteriaExt.do",
            id: "https://www.sos.state.co.us/biz/BusinessEntityCriteriaExt.do"
        },
        "Connecticut": {
            name: "https://service.ct.gov/business/s/onlinebusinesssearch?language=en_US",
            id: "https://service.ct.gov/business/s/onlinebusinesssearch?language=en_US"
        },
        "Delaware": {
            name: "https://icis.corp.delaware.gov/Ecorp/EntitySearch/NameSearch.aspx",
            id: "https://icis.corp.delaware.gov/Ecorp/EntitySearch/NameSearch.aspx"
        },
        "District of Columbia": {
            name: "https://os.dc.gov/",
            id: "https://os.dc.gov/"
        },
        "Florida": {
            name: "https://search.sunbiz.org/Inquiry/CorporationSearch/ByName",
            id: "https://search.sunbiz.org/Inquiry/CorporationSearch/ByDocumentNumber"
        },
        "Georgia": {
            name: "https://ecorp.sos.ga.gov/BusinessSearch",
            id: "https://ecorp.sos.ga.gov/BusinessSearch"
        },
        "Hawaii": {
            name: "https://hbe.ehawaii.gov/documents/search.html",
            id: "https://hbe.ehawaii.gov/documents/search.html"
        },
        "Idaho": {
            name: "https://sosbiz.idaho.gov/search/business",
            id: "https://sosbiz.idaho.gov/search/business"
        },
        "Illinois": {
            name: "https://apps.ilsos.gov/businessentitysearch/",
            id: "https://apps.ilsos.gov/businessentitysearch/"
        },
        "Indiana": {
            name: "https://bsd.sos.in.gov/publicbusinesssearch",
            id: "https://bsd.sos.in.gov/publicbusinesssearch"
        },
        "Iowa": {
            name: "https://sos.iowa.gov/search/business/search.aspx",
            id: "https://sos.iowa.gov/search/business/search.aspx"
        },
        "Kansas": {
            name: "https://www.sos.ks.gov/eforms/BusinessEntity/Search.aspx",
            id: "https://www.sos.ks.gov/eforms/BusinessEntity/Search.aspx"
        },
        "Kentucky": {
            name: "https://sosbes.sos.ky.gov/BusSearchNProfile/Search.aspx?na=true",
            id: "https://sosbes.sos.ky.gov/BusSearchNProfile/Search.aspx?na=true"
        },
        "Louisiana": {
            name: "https://coraweb.sos.la.gov/commercialsearch/commercialsearch.aspx",
            id: "https://coraweb.sos.la.gov/commercialsearch/commercialsearch.aspx"
        },
        "Maine": {
            name: "https://apps3.web.maine.gov/nei-sos-icrs/ICRS?MainPage=",
            id: "https://apps3.web.maine.gov/nei-sos-icrs/ICRS?MainPage="
        },
        "Maryland": {
            name: "https://egov.maryland.gov/businessexpress/entitysearch",
            id: "https://egov.maryland.gov/businessexpress/entitysearch"
        },
        "Massachusetts": {
            name: "https://corp.sec.state.ma.us/corpweb/CorpSearch/CorpSearch.aspx",
            id: "https://corp.sec.state.ma.us/corpweb/CorpSearch/CorpSearch.aspx"
        },
        "Michigan": {
            name: "https://www.michigan.gov/lara/online-services/business-entity-search",
            id: "https://www.michigan.gov/lara/online-services/business-entity-search"
        },
        "Minnesota": {
            name: "https://mblsportal.sos.mn.gov/Business/Search",
            id: "https://mblsportal.sos.mn.gov/Business/Search"
        },
        "Mississippi": {
            name: "https://corp.sos.ms.gov/corp/portal/c/page/corpBusinessIdSearch/portal.aspx",
            id: "https://corp.sos.ms.gov/corp/portal/c/page/corpBusinessIdSearch/portal.aspx"
        },
        "Missouri": {
            name: "https://bsd.sos.mo.gov/BusinessEntity/BESearch.aspx?SearchType=0",
            id: "https://bsd.sos.mo.gov/BusinessEntity/BESearch.aspx?SearchType=0"
        },
        "Montana": {
            name: "https://biz.sosmt.gov/search/business/1000",
            id: "https://biz.sosmt.gov/search/business/1000"
        },
        "Nebraska": {
            name: "https://www.nebraska.gov/sos/corp/corpsearch.cgi?nav=search",
            id: "https://www.nebraska.gov/sos/corp/corpsearch.cgi?nav=search"
        },
        "Nevada": {
            name: "https://esos.nv.gov/EntitySearch/OnlineEntitySearch",
            id: "https://esos.nv.gov/EntitySearch/OnlineEntitySearch"
        },
        "New Hampshire": {
            name: "https://quickstart.sos.nh.gov/online/BusinessInquire",
            id: "https://quickstart.sos.nh.gov/online/BusinessInquire"
        },
        "New Jersey": {
            name: "https://www.njportal.com/DOR/BusinessNameSearch/Search/BusinessName",
            id: "https://www.njportal.com/DOR/BusinessNameSearch/Search/EntityId"
        },
        "New Mexico": {
            name: "https://enterprise.sos.nm.gov/search",
            id: "https://enterprise.sos.nm.gov/search"
        },
        "New York": {
            name: "https://apps.dos.ny.gov/publicInquiry/",
            id: "https://apps.dos.ny.gov/publicInquiry/"
        },
        "North Carolina": {
            name: "https://www.sosnc.gov/online_services/search/by_title/_Business_Registration",
            id: "https://www.sosnc.gov/online_services/search/by_title/_Business_Registration"
        },
        "North Dakota": {
            name: "https://firststop.sos.nd.gov/search",
            id: "https://firststop.sos.nd.gov/search"
        },
        "Ohio": {
            name: "https://businesssearch.ohiosos.gov/",
            id: "https://businesssearch.ohiosos.gov/"
        },
        "Oklahoma": {
            name: "https://www.sos.ok.gov/corp/corpInquiryFind.aspx",
            id: "https://www.sos.ok.gov/corp/corpInquiryFind.aspx"
        },
        "Oregon": {
            name: "https://sos.oregon.gov/business/Pages/find.aspx",
            id: "https://sos.oregon.gov/business/Pages/find.aspx"
        },
        "Pennsylvania": {
            name: "https://file.dos.pa.gov/search/business",
            id: "https://file.dos.pa.gov/search/business"
        },
        "Rhode Island": {
            name: "https://business.sos.ri.gov/corp/CorpSearch/CorpSearchInput.asp",
            id: "https://business.sos.ri.gov/corp/CorpSearch/CorpSearchInput.asp"
        },
        "South Carolina": {
            name: "https://businessfilings.sc.gov/BusinessFiling/Entity/NewFiling",
            id: "https://businessfilings.sc.gov/BusinessFiling/Entity/NewFiling"
        },
        "South Dakota": {
            name: "https://sosenterprise.sd.gov/BusinessServices/Business/FilingSearch.aspx",
            id: "https://sosenterprise.sd.gov/BusinessServices/Business/FilingSearch.aspx"
        },
        "Tennessee": {
            name: "https://tncab.tnsos.gov/business-entity-search",
            id: "https://tncab.tnsos.gov/business-entity-search"
        },
        "Texas": {
            name: "https://comptroller.texas.gov/taxes/franchise/account-status/search",
            id: "https://comptroller.texas.gov/taxes/franchise/account-status/search"
        },
        "Utah": {
            name: "https://businessregistration.utah.gov/NameAvailabilitySearch",
            id: "https://businessregistration.utah.gov/EntitySearch/OnlineEntitySearch"
        },
        "Vermont": {
            name: "https://www.vermontbusinessregistry.com/BusinessSearch.aspx",
            id: "https://www.vermontbusinessregistry.com/BusinessSearch.aspx"
        },
        "Virginia": {
            name: "https://cis.scc.virginia.gov/EntitySearch/Index",
            id: "https://cis.scc.virginia.gov/EntitySearch/Index"
        },
        "Washington": {
            name: "https://ccfs.sos.wa.gov/#/",
            id: "https://ccfs.sos.wa.gov/#/"
        },
        "West Virginia": {
            name: "https://apps.sos.wv.gov/business/corporations/",
            id: "https://apps.sos.wv.gov/business/corporations/"
        },
        "Wisconsin": {
            name: "https://apps.dfi.wi.gov/apps/corpsearch/search.aspx",
            id: "https://apps.dfi.wi.gov/apps/corpsearch/search.aspx"
        },
        "Wyoming": {
            name: "https://wyobiz.wyo.gov/business/filingsearch.aspx",
            id: "https://wyobiz.wyo.gov/business/filingsearch.aspx"
        }
    };

    // Used to detect and highlight US addresses within amendment details
    const STATE_ABBRS = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
    const STATE_NAMES = [
        'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'
    ];
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
        if (msg.action === 'getHoldUser') {
            getLastHoldUser().then(user => {
                sendResponse({ holdUser: user });
            });
            return true;
        }
    });
    function getOrderType() {
        const el = document.getElementById("ordType");
        if (!el) return "formation";
        const txt = (el.textContent || "").trim().toLowerCase();
        if (/amendment/.test(txt)) return "amendment";
        if (/silver|gold|platinum/.test(txt)) return "formation";
        return "other";
    }

    function normalizeOrderType(text) {
        const t = (text || "").toLowerCase();
        if (t.includes("amendment")) return "Amendment";
        if (t.includes("foreign") && t.includes("qualification")) {
            return "Foreign Qualification";
        }
        if (t.includes("registered agent") && t.includes("change")) {
            return "Registered Agent Change";
        }
        const annual = [
            "annual report",
            "business entity report",
            "biennial report",
            "information report",
            "annual statement",
            "annual registration report",
            "annual list",
            "annual certificate",
            "renewal",
            "public information report",
            "pir",
            "registration fee"
        ];
        if (annual.some(k => t.includes(k))) return "Annual Report";
        if (t.includes("silver")) return "Business Formation - Silver";
        if (t.includes("gold")) return "Business Formation - Gold";
        if (t.includes("platinum")) return "Business Formation - Platinum";
        if (t.includes("formation")) return "Business Formation";
        return text;
    }

    function mapKbCategory(text) {
        const t = (text || "").toLowerCase();
        if (t.includes("business formation")) return "Main Orders";
        if (t.includes("amendment")) return "Amendments";
        return text;
    }

    function updateReviewDisplay() {
        const label = document.getElementById('review-mode-label');
        if (label) label.style.display = reviewMode ? 'block' : 'none';
        const cLabel = document.getElementById('client-section-label');
        const cBox = document.getElementById('client-section-box');
        if (cLabel && cBox) {
            cLabel.style.display = reviewMode ? '' : 'none';
            cBox.style.display = reviewMode ? '' : 'none';
        }
        const bLabel = document.getElementById('billing-section-label');
        const bBox = document.getElementById('billing-section-box');
        if (bLabel && bBox) {
            bLabel.style.display = reviewMode ? '' : 'none';
            bBox.style.display = reviewMode ? '' : 'none';
        }
    }

    chrome.storage.local.get({ extensionEnabled: true, lightMode: false, bentoMode: false, fennecReviewMode: false }, ({ extensionEnabled, lightMode, bentoMode, fennecReviewMode }) => {
        if (!extensionEnabled) {
            console.log('[FENNEC] Extension disabled, skipping DB launcher.');
            return;
        }
        if (lightMode) {
            document.body.classList.add('fennec-light-mode');
        } else {
            document.body.classList.remove('fennec-light-mode');
        }
        if (bentoMode) {
            document.body.classList.add('fennec-bento-mode');
        } else {
            document.body.classList.remove('fennec-bento-mode');
        }

        reviewMode = fennecReviewMode;
        try {
        function initSidebar() {
            if (sessionStorage.getItem("fennecSidebarClosed") === "true") { showFloatingIcon(); return; }
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
                            <span id="qa-toggle" class="quick-actions-toggle">☰</span>
                            <div class="copilot-title">
                                <img src="${chrome.runtime.getURL('fennec_icon.png')}" class="copilot-icon" alt="FENNEC (v0.3)" />
                                <span>FENNEC (v0.3)</span>
                            </div>
                            <button id="copilot-close">✕</button>
                        </div>
                        <div class="order-summary-header"><span id="family-tree-icon" class="family-tree-icon" style="display:none">🌳</span> ORDER SUMMARY <span id="qs-toggle" class="quick-summary-toggle">⚡</span></div>
                        <div class="copilot-body" id="copilot-body-content">
                            <div style="text-align:center; color:#888; margin-top:20px;">Cargando resumen...</div>
                            <div class="copilot-footer">
                                <button id="copilot-refresh" class="copilot-button">🔄 REFRESH</button>
                            </div>
                            <div id="review-mode-label" class="review-mode-label" style="display:none; margin-top:4px; text-align:center; font-size:11px;">REVIEW MODE</div>
                        </div>
                    `;
                    document.body.appendChild(sidebar);
                    if (document.body.classList.contains('fennec-bento-mode')) {
                        const vid = document.createElement('video');
                        vid.id = 'bento-video';
                        vid.src = chrome.runtime.getURL('BG_HOLO.mp4');
                        vid.muted = true;
                        vid.autoplay = true;
                        vid.playsInline = true;
                        vid.loop = false;
                        vid.playbackRate = 0.2;
                        sidebar.prepend(vid);
                        let reverse = false;
                        vid.addEventListener('ended', () => {
                            reverse = !reverse;
                            vid.playbackRate = reverse ? -0.2 : 0.2;
                            vid.currentTime = reverse ? vid.duration - 0.01 : 0.01;
                            vid.play();
                        });
                    }
                    updateReviewDisplay();
                    const closeBtn = sidebar.querySelector('#copilot-close');
                    if (closeBtn) {
                        closeBtn.onclick = () => {
                            sidebar.remove();
                            document.body.style.marginRight = '';
                            const style = document.getElementById('copilot-db-padding');
                            if (style) style.remove();
                            sessionStorage.setItem("fennecSidebarClosed", "true");
                            console.log("[Copilot] Sidebar cerrado manualmente en DB.");
                            showFloatingIcon();
                        };
                    }
                    const isStorage = /\/storage\/incfile\//.test(location.pathname);
                    if (isStorage) {
                        loadStoredSummary();
                    } else {
                        const orderType = getOrderType();
                        currentOrderType = orderType;
                        const rawType = getText(document.getElementById('ordType')) || '';
                        currentOrderTypeText = normalizeOrderType(rawType);
                        const ftIcon = sidebar.querySelector('#family-tree-icon');
                        if (ftIcon) {
                            ftIcon.style.display = orderType !== 'formation' ? 'inline' : 'none';
                        }
                        if (orderType === "amendment") {
                            extractAndShowAmendmentData();
                        } else {
                            extractAndShowFormationData();
                        }
                    }
                    const qsToggle = sidebar.querySelector('#qs-toggle');
                    initQuickSummary = () => {
                        const box = sidebar.querySelector('#quick-summary');
                        if (box) {
                            box.style.maxHeight = '0';
                            box.classList.add('quick-summary-collapsed');
                        }
                    };
                    initQuickSummary();
                    if (qsToggle) {
                        qsToggle.addEventListener('click', () => {
                            const box = sidebar.querySelector('#quick-summary');
                            if (!box) return;
                            if (box.style.maxHeight && box.style.maxHeight !== '0px') {
                                box.style.maxHeight = '0';
                                box.classList.add('quick-summary-collapsed');
                            } else {
                                box.classList.remove('quick-summary-collapsed');
                                box.style.maxHeight = box.scrollHeight + 'px';
                            }
                        });
                    }

                    const qaToggle = sidebar.querySelector('#qa-toggle');
                    if (qaToggle) {
                        const qaMenu = document.createElement('div');
                        qaMenu.id = 'quick-actions-menu';
                        qaMenu.style.display = 'none';
                        qaMenu.innerHTML = '<div class="qa-title">QUICK ACTIONS</div>' +
                            '<ul><li id="qa-emails">Emails</li><li id="qa-cancel">Cancel</li></ul>';
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
                                showMenu();
                                const rect = qaToggle.getBoundingClientRect();
                                const menuWidth = qaMenu.offsetWidth;
                                let left = rect.left - menuWidth + rect.width;
                                if (left < 0) left = 0;
                                if (left + menuWidth > window.innerWidth) {
                                    left = window.innerWidth - menuWidth;
                                }
                                qaMenu.style.top = rect.bottom + 'px';
                                qaMenu.style.left = left + 'px';
                            }
                        });

                        document.addEventListener('click', (e) => {
                            if (!qaMenu.contains(e.target) && e.target !== qaToggle && qaMenu.style.display === 'block') {
                                hideMenu();
                            }
                        });

                        qaMenu.querySelector('#qa-emails').addEventListener('click', () => {
                            hideMenu();
                            const info = getBasicOrderInfo();
                            const client = getClientInfo();
                            const parts = [];
                            if (info.orderId) {
                                parts.push(info.orderId);
                                parts.push(`subject:"${info.orderId}"`);
                            }
                            if (client.email) parts.push(`"${client.email}"`);
                            if (client.name) parts.push(`"${client.name}"`);
                            if (parts.length) {
                                const query = parts.map(p => encodeURIComponent(p)).join('+OR+');
                                const url = 'https://mail.google.com/mail/u/0/#search/' + query;
                                chrome.runtime.sendMessage({ action: 'openActiveTab', url });
                            }
                        });


                        qaMenu.querySelector('#qa-cancel').addEventListener('click', () => {
                            hideMenu();
                            startCancelProcedure();
                        });
                    }
                        const refreshBtn = sidebar.querySelector('#copilot-refresh');
                        if (refreshBtn) {
                            refreshBtn.onclick = () => {
                                if (currentOrderType === "amendment") {
                                    extractAndShowAmendmentData();
                                } else {
                                    extractAndShowFormationData();
                                }
                            };
                        }
                        if (sessionStorage.getItem('fennecCancelPending') === '1') {
                            openCancelPopup();
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

        const body = document.getElementById('copilot-body-content');
        if (body) {
            body.innerHTML = '<div style="text-align:center; color:#aaa; margin-top:40px">Error loading summary.</div>';
        }
    }


    function buildSosUrl(state, query, type = 'name') {
        const rec = SOS_URLS[state];
        if (!rec) return null;
        const base = rec[type] || rec.name;
        if (!query) return base;
        const sep = base.includes('?') ? '&' : '?';
        return base + sep + 'q=' + encodeURIComponent(query);
    }


    function isValidField(text) {
        if (!text) return false;
        const clean = String(text).trim().toLowerCase();
        const compact = clean.replace(/\s+/g, '');
        if (!compact) return false;
        if (compact === 'n/a' || compact === 'na') return false;
        if (clean.includes('no service')) return false;
        if (['us', 'usa', 'unitedstates', 'unitedstatesofamerica'].includes(compact)) {
            return false;
        }
        return true;
    }

    function renderAddress(addr, isVA = false) {
        if (!isValidField(addr)) return '';
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
        const extra = isVA
            ? ` <span class="copilot-tag copilot-tag-green">VA</span>`
            : `<span class="copilot-usps" data-address="${escFull}" title="USPS Lookup"> ✉️</span>`;
        return `<span class="address-wrapper"><a href="#" class="copilot-address" data-address="${escFull}">${display}</a>${extra}</span>`;
    }

    function renderBillingAddress(info) {
        if (!info) return '';
        const parts1 = [];
        if (isValidField(info.street1)) parts1.push(info.street1.trim());
        if (isValidField(info.street2)) parts1.push(info.street2.trim());
        const line1 = parts1.join(' ');

        let line2 = '';
        if (isValidField(info.cityStateZipCountry)) {
            line2 = info.cityStateZipCountry.trim();
        } else {
            const seg = [];
            if (isValidField(info.cityStateZip)) seg.push(info.cityStateZip.trim());
            if (info.country && (!info.cityStateZip || !info.cityStateZip.includes(info.country))) {
                seg.push(info.country.trim());
            }
            line2 = seg.join(', ');
        }

        const displayLines = [];
        if (line1) displayLines.push(escapeHtml(line1));
        if (line2) displayLines.push(escapeHtml(line2));
        if (!displayLines.length) return '';
        const full = [line1, line2].filter(Boolean).join(', ');
        const escFull = escapeHtml(full);
        return `<span class="address-wrapper"><a href="#" class="copilot-address" data-address="${escFull}">${displayLines.join('<br>')}</a><span class="copilot-usps" data-address="${escFull}" title="USPS Lookup"> ✉️</span></span>`;
    }

    function formatExpiry(text) {
        if (!isValidField(text)) return '';
        const digits = text.replace(/[^0-9]/g, '');
        if (digits.length >= 4) {
            const month = digits.slice(0, 2).padStart(2, '0');
            const year = digits.slice(-2);
            return `${month}/${year}`;
        }
        return text.trim();
    }

    function renderCopy(text) {
        if (!isValidField(text)) return '';
        const esc = escapeHtml(text);
        return `<span class="copilot-copy" data-copy="${esc}">${esc}</span>`;
    }

    function renderName(text) {
        if (!isValidField(text)) return '';
        const esc = escapeHtml(text);
        return `<span class="copilot-copy copilot-name" data-copy="${esc}">${esc}</span>`;
    }

    function renderCopyIcon(text) {
        if (!isValidField(text)) return '';
        const esc = escapeHtml(text);
        return `<span class="copilot-copy-icon" data-copy="${esc}" title="Copy">⧉</span>`;
    }

    function renderKb(state) {
        if (!isValidField(state)) return '<span style="color:#aaa">-</span>';
        const esc = escapeHtml(state);
        const type = currentOrderTypeText ? mapKbCategory(currentOrderTypeText) : '';
        return `<a href="#" class="copilot-kb" data-state="${esc}" data-otype="${escapeHtml(type)}">${esc}</a>`;
    }


    function isFullAddress(text) {
        if (/\b\d{5}(?:-\d{4})?\b/.test(text)) return true;
        const abbrRe = new RegExp('\\b(' + STATE_ABBRS.join('|') + ')\\b', 'i');
        if (abbrRe.test(text)) return true;
        const nameRe = new RegExp('\\b(' + STATE_NAMES.join('|') + ')\\b', 'i');
        return nameRe.test(text);
    }

    function highlightAddresses(text) {
        const re = /\b\d[\w-]*[^.\n]*?(?:street|st\.?|road|rd\.?|ave\.?|avenue|drive|dr\.?|lane|ln\.?|boulevard|blvd\.?|pkwy|parkway|court|ct\.?|hwy|highway|way|loop|circle|cir\.?|place|pl\.?|trail|trl\.?|point|pt\.?|falls?|fls?|bit)[^.\n]*/gi;
        let out = '';
        let last = 0;
        for (let m; (m = re.exec(text)); ) {
            out += escapeHtml(text.slice(last, m.index));
            const addr = m[0].trim();
            if (isFullAddress(addr)) {
                out += renderAddress(addr);
            } else {
                out += '<strong>' + renderName(addr) + '</strong>';
            }
            last = re.lastIndex;
        }
        out += escapeHtml(text.slice(last));
        return out;
    }

    function isAddressLine(line) {
        if (!line) return false;
        const addrRegex = /(street|st\.?|road|rd\.?|ave\.?|avenue|drive|dr\.?|lane|ln\.?|boulevard|blvd\.?|pkwy|parkway|court|ct\.?|hwy|highway|way|loop|circle|cir\.?|place|pl\.?|trail|trl\.?|point|pt\.?|falls?|fls?|bit)/i;
        return addrRegex.test(line) && /\d/.test(line);
    }

    function formatAmendmentDetails(text) {
        if (!text) return '';
        const lines = text.split(/\n+|\.\s*/).map(l => l.trim()).filter(Boolean);
        return lines.map(l => {
            const idx = l.indexOf(':');
            if (idx !== -1) {
                const before = l.slice(0, idx + 1);
                const after = l.slice(idx + 1).trim();
                return `<div>${escapeHtml(before)} ${highlightAddresses(after)}</div>`;
            }
            return `<div>${highlightAddresses(l)}</div>`;
        }).join('');
    }

    function extractAmendmentDetails() {
        const label = Array.from(document.querySelectorAll('#vcomp label'))
            .find(l => getText(l).toLowerCase().includes('amendment details'));
        if (!label) return null;
        let valDiv = label.nextElementSibling;
        const parent = label.closest('div');
        if ((!valDiv || !getText(valDiv)) && parent) {
            if (parent.nextElementSibling && getText(parent.nextElementSibling)) {
                valDiv = parent.nextElementSibling;
            } else {
                const siblings = Array.from(parent.parentElement.children);
                const idx = siblings.indexOf(parent);
                for (let i = idx + 1; i < siblings.length; i++) {
                    if (getText(siblings[i])) {
                        valDiv = siblings[i];
                        break;
                    }
                }
            }
        }
        return valDiv ? getText(valDiv) : null;
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
                    getText(l).toLowerCase().includes(field.label.toLowerCase())
                );
                if (label) {
                    let valDiv = label.nextElementSibling;
                    const parent = label.closest('div');
                    if ((!valDiv || !getText(valDiv)) && parent) {
                        if (parent.nextElementSibling && getText(parent.nextElementSibling)) {
                            valDiv = parent.nextElementSibling;
                        } else {
                            const siblings = Array.from(parent.parentElement.children);
                            const idx = siblings.indexOf(parent);
                            for (let i = idx + 1; i < siblings.length; i++) {
                                if (getText(siblings[i])) {
                                    valDiv = siblings[i];
                                    break;
                                }
                            }
                        }
                    }
                    if (valDiv) {
                        obj[field.name] = cleanFieldValue(field.name, getText(valDiv));
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
                    getText(l).toLowerCase().includes(field.label.toLowerCase())
                );
                if (label) {
                    let valDiv = label.nextElementSibling;
                    const parent = label.closest('div');
                    if ((!valDiv || !getText(valDiv)) && parent) {
                        if (parent.nextElementSibling && getText(parent.nextElementSibling)) {
                            valDiv = parent.nextElementSibling;
                        } else {
                            const siblings = Array.from(parent.parentElement.children);
                            const idx = siblings.indexOf(parent);
                            for (let i = idx + 1; i < siblings.length; i++) {
                                if (getText(siblings[i])) {
                                    valDiv = siblings[i];
                                    break;
                                }
                            }
                        }
                    }
                    if (valDiv) {
                        obj[field.name] = cleanFieldValue(field.name, getText(valDiv));
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
                    getText(l).toLowerCase().includes(field.label.toLowerCase())
                );
                if (label) {
                    let valDiv = label.nextElementSibling;
                    const parent = label.closest('div');
                    if ((!valDiv || !getText(valDiv)) && parent) {
                        if (parent.nextElementSibling && getText(parent.nextElementSibling)) {
                            valDiv = parent.nextElementSibling;
                        } else {
                            const siblings = Array.from(parent.parentElement.children);
                            const idx = siblings.indexOf(parent);
                            for (let i = idx + 1; i < siblings.length; i++) {
                                if (getText(siblings[i])) {
                                    valDiv = siblings[i];
                                    break;
                                }
                            }
                        }
                    }
                    if (valDiv) {
                        obj[field.name] = cleanFieldValue(field.name, getText(valDiv));
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
                        getText(l).toLowerCase().includes(field.label.toLowerCase())
                    );
                    if (label) {
                        let valDiv = label.nextElementSibling;
                        const parent = label.closest('div');
                        if ((!valDiv || !getText(valDiv)) && parent) {
                            if (parent.nextElementSibling && getText(parent.nextElementSibling)) {
                                valDiv = parent.nextElementSibling;
                            } else {
                                const siblings = Array.from(parent.parentElement.children);
                                const idx = siblings.indexOf(parent);
                                for (let i = idx + 1; i < siblings.length; i++) {
                                    if (getText(siblings[i])) {
                                        valDiv = siblings[i];
                                        break;
                                    }
                                }
                            }
                        }
                        if (valDiv) {
                            obj[field.name] = cleanFieldValue(field.name, getText(valDiv));
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
                if (!label || !val || !getText(val)) return null;
                return {
                    name: getText(val),
                    position: getText(label).replace(/:/g, '')
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
                if (!label || !val || !getText(val)) continue;
                const text = getText(label).toLowerCase();
                if (text.includes('street') || text.includes('city') ||
                    text.includes('zip') || text.includes('address')) {
                    continue;
                }
                name = getText(val);
                position = getText(label).replace(/:/g, '');
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
        const dbSections = [];
        function addEmptySection(label, text = "NO INFO") {
            const section = `
            <div class="section-label">${label}</div>
            <div class="white-box" style="margin-bottom:10px">
                <div style="color:#aaa">${text}</div>
            </div>`;
            html += section;
            dbSections.push(section);
        }
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
            {name: 'address', label: 'address'},
            {name: 'avs', label: 'avs'}
        ]);

        const physicalBox = Array.from(document.querySelectorAll('#vcomp .form-body h4, #vcomp .form-body h3'))
            .find(h => getText(h).toLowerCase().includes('physical'));
        const mailingBox = Array.from(document.querySelectorAll('#vcomp .form-body h4, #vcomp .form-body h3'))
            .find(h => getText(h).toLowerCase().includes('mailing'));

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

        const headerStatus = getText(document.querySelector('.btn-status-text')) || null;

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
        const hasAgentInfo = agent && (isValidField(agent.name) || isValidField(agent.address));



        // Detectar tipo de entidad para nombrar apropiadamente
        const entTypeEl = document.getElementById('entityType');
        const entityType = entTypeEl ? getText(entTypeEl).toLowerCase() : '';
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

        const amendmentDetails = isAmendment ? extractAmendmentDetails() : null;

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
            if (!name || !isValidField(name) || isInternal(name, addr)) return;
            const key = name.trim().toLowerCase();
            if (!roleMap[key]) roleMap[key] = { display: name.trim(), roles: new Set() };
            roleMap[key].roles.add(role);
        };

        if (agent && agent.name) addRole(agent.name, 'RA', agent.address);
        directors.forEach(d => addRole(d.name, isLLC ? 'MEMBER' : 'DIRECTOR', d.address));
        if (!isLLC) {
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
        }

        const client = getClientInfo();
        if (client && client.name) addRole(client.name, 'CLIENT');
        const billing = getBillingInfo();
        if (billing && billing.cardholder) addRole(billing.cardholder, 'BILLING');

        const addrs = [];
        const pushAddr = (label, addr, name) => {
            if (!isValidField(addr) || isInternal(name, addr)) return;
            addrs.push({ label, addr });
        };
        if (company) {
            pushAddr('Company', company.address, company.name);
            pushAddr('Company Physical', company.physicalAddress, company.name);
            pushAddr('Company Mailing', company.mailingAddress, company.name);
        }
        if (agent && agent.address) pushAddr('Agent', agent.address, agent.name);
        directors.forEach((d, i) => pushAddr(`${isLLC ? 'Member' : 'Director'} ${i+1}`, d.address, d.name));
        if (!isLLC) {
            shareholders.forEach((s, i) => pushAddr(`Shareholder ${i+1}`, s.address, s.name));
            officers.forEach((o, i) => pushAddr(`Officer ${i+1}`, o.address, o.name));
        }

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
            .map(li => getText(li).toLowerCase());

        // Registered Agent subscription status from #vagent section
        const hasRA = /^yes/i.test(agent.status || '');

        // Virtual Address status from #vvirtual-address section or fallback button
        let hasVA = false;
        const vaSection = document.querySelector('#vvirtual-address');
        if (vaSection) {
            const vaTexts = Array.from(vaSection.querySelectorAll('td, span'))
                .map(el => getText(el).toLowerCase());
            hasVA = vaTexts.some(t => t.includes('active'));
            if (!hasVA && vaTexts.some(t => t.includes('inactive'))) {
                hasVA = false;
            }
        } else {
            const vaBtn = Array.from(document.querySelectorAll('button'))
                .find(b => /virtual address/i.test(getText(b)));
            if (vaBtn) {
                const txt = getText(vaBtn).toLowerCase();
                hasVA = txt.includes('active');
            }
        }

        const raClass = hasRA
            ? 'copilot-tag copilot-tag-green'
            : 'copilot-tag copilot-tag-purple';
        const vaClass = hasVA
            ? 'copilot-tag copilot-tag-green'
            : 'copilot-tag copilot-tag-purple';
        const isVAAddress = addr => hasVA && /#\s*\d{3,}/.test(addr);

        const addrValues = Object.values(addrMap);
        const addrEntries = addrValues
            .map(a => {
                const tags = a.labels.map(l => `<span class="copilot-tag">${escapeHtml(l)}</span>`).join(' ');
                return `<div style="margin-left:10px"><b>${renderAddress(a.addr, isVAAddress(a.addr))}</b><br>${tags}</div>`;
            });

        // Render del HTML
        let html = '';

        const summaryParts = [];
        const roleEntries = Object.values(roleMap)
            .map(r => {
                const name = renderCopy(r.display);
                if (!name) return null;
                const tags = Array.from(r.roles)
                    .map(role => `<span class="copilot-tag">${escapeHtml(role)}</span>`)
                    .join(' ');
                return `<div style="margin-left:10px"><b>${name}</b><br>${tags}</div>`;
            })
            .filter(Boolean);
        if (roleEntries.length) {
            summaryParts.push(...roleEntries);
        }
        if (addrEntries.length) {
            if (summaryParts.length) summaryParts.push('<hr style="border:none;border-top:1px solid #eee;margin:6px 0"/>');
            summaryParts.push(...addrEntries);
        }

        const quickSection = `
            <div class="white-box quick-summary-content" id="quick-summary" style="margin-bottom:10px">
                ${summaryParts.join('')}
            </div>
        `;
        html += quickSection;
        dbSections.push(quickSection);

        if (client && (client.id || client.name || client.email)) {
            const lines = [];
            if (client.name) {
                let nameLine = `<b>${renderName(client.name)}</b>`;
                if (client.id) {
                    const url = `${location.origin}/incfile/companies/${client.id}`;
                    nameLine += ` (<a href="${url}" class="copilot-link" target="_blank">${escapeHtml(client.id)}</a>)`;
                }
                lines.push(`<div>${nameLine}</div>`);
                const r = roleMap[client.name.trim().toLowerCase()];
                if (r && r.roles && r.roles.size) {
                    const tags = Array.from(r.roles)
                        .map(role => `<span class="copilot-tag">${escapeHtml(role)}</span>`)
                        .join(' ');
                    lines.push(`<div>${tags}</div>`);
                } else {
                    lines.push(`<div><span class="copilot-tag copilot-tag-purple">NOT LISTED</span></div>`);
                }
            }
            if (client.email || client.phone) {
                const parts = [];
                if (client.email) {
                    const emailHtml = `<a href="mailto:${encodeURIComponent(client.email)}" class="copilot-link">${escapeHtml(client.email)}</a>`;
                    parts.push(emailHtml);
                }
                if (client.phone) parts.push(escapeHtml(client.phone));
                lines.push(`<div>${parts.join(' \u2022 ')}</div>`);
            }
            const counts = [];
            if (client.orders) counts.push(`Companies: ${renderCopy(client.orders)}`);
            if (client.ltv) counts.push(`LTV: ${renderCopy(client.ltv)}`);
            if (counts.length) lines.push(`<div>${counts.join(' \u2022 ')}</div>`);
            const clientSection = `
            <div id="client-section-label" class="section-label">CLIENT:</div>
            <div id="client-section-box" class="white-box" style="margin-bottom:10px">
                ${lines.join('')}
            </div>`;
            html += clientSection;
            dbSections.push(clientSection);
        }

        if (billing) {
            const linesB = [];
            if (billing.cardholder) {
                linesB.push(`<div><b>${renderCopy(billing.cardholder)}</b></div>`);
            }
            const cardParts = [];
            if (billing.cardType) cardParts.push(renderCopy(billing.cardType));
            if (billing.last4) cardParts.push(renderCopy(billing.last4));
            if (billing.expiry) cardParts.push(renderCopy(formatExpiry(billing.expiry)));
            if (cardParts.length) linesB.push(`<div>${cardParts.join(' \u2022 ')}</div>`);
            if (billing.avs) {
                const avsTag = `<span class="copilot-tag">${escapeHtml(billing.avs)}</span>`;
                linesB.push(`<div>AVS: ${avsTag}</div>`);
            }
            const addr = renderBillingAddress(billing);
            if (addr) linesB.push(`<div>${addr}</div>`);
            const billingSection = `
            <div id="billing-section-label" class="section-label">BILLING:</div>
            <div id="billing-section-box" class="white-box" style="margin-bottom:10px">
                ${linesB.join('')}
            </div>`;
            html += billingSection;
            dbSections.push(billingSection);
        } else {
            addEmptySection('BILLING:');
        }

        if (currentOrderType !== 'formation') {
            html += `<div id="family-tree-orders" class="ft-collapsed"></div>`;
        }

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
            let nameText = escapeHtml(company.name);
            const nameBase = buildSosUrl(company.state, null, 'name');
            if (nameBase) {
                nameText = `<a href="#" class="copilot-sos" data-url="${nameBase}" data-query="${escapeHtml(company.name)}" data-type="name">${nameText}</a>`;
            }
            companyLines.push(`<div><b>${nameText} ${renderCopyIcon(company.name)}</b></div>`);
            if (company.stateId) {
                let idHtml = escapeHtml(company.stateId);
                const idBase = buildSosUrl(company.state, null, 'id');
                if (idBase) {
                    idHtml = `<a href="#" class="copilot-sos" data-url="${idBase}" data-query="${escapeHtml(company.stateId)}" data-type="id">${idHtml}</a>`;
                    idHtml += ' ' + renderCopyIcon(company.stateId);
                } else {
                    idHtml += ' ' + renderCopyIcon(company.stateId);
                }
                companyLines.push(`<div>${idHtml}</div>`);
            }
            companyLines.push(`<div>${renderKb(company.state)}</div>`);
            companyLines.push(addrHtml);
            companyLines.push(`<div class="company-purpose">${renderCopy(company.purpose)}</div>`);
            companyLines.push(
                `<div><span class="${raClass}">RA: ${hasRA ? 'Sí' : 'No'}</span> ` +
                `<span class="${vaClass}">VA: ${hasVA ? 'Sí' : 'No'}</span></div>`
            );
            companyLines.push('<hr style="border:none; border-top:1px solid #eee; margin:6px 0"/>');
            const compSection = reviewMode
                ? `
            <div class="white-box" style="margin-bottom:10px">
                ${companyLines.join('')}
            </div>`
                : `
            <div class="section-label">COMPANY:</div>
            <div class="white-box" style="margin-bottom:10px">
                ${companyLines.join('')}
            </div>`;
            if (companyLines.length) {
                html += compSection;
                dbSections.push(compSection);
            } else {
                addEmptySection('COMPANY:');
            }
        } else {
            addEmptySection('COMPANY:');
        }
        // AGENT
        if (hasAgentInfo) {
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
            const agentLines = [];
            const nameHtml = renderName(agent.name);
            if (nameHtml) agentLines.push(`<div><b>${nameHtml}</b></div>`);
            const addrHtml2 = renderAddress(agent.address, isVAAddress(agent.address));
            if (addrHtml2) agentLines.push(`<div>${addrHtml2}</div>`);
            if (showStatus) agentLines.push(`<div>${statusHtml}</div>`);
            if (agentLines.length) {
                const agentSection = `
            <div class="section-label">AGENT:</div>
            <div class="white-box" style="margin-bottom:10px">
                ${agentLines.join('')}
            </div>`;
                html += agentSection;
                dbSections.push(agentSection);
            } else {
                addEmptySection('AGENT:', 'NO RA INFO');
            }
        } else {
            addEmptySection('AGENT:', 'NO RA INFO');
        }
        // DIRECTORS / MEMBERS
        if (directors.length) {
            const dirSection = `
            <div class="section-label">${isLLC ? 'MEMBERS:' : 'DIRECTORS:'}</div>
            <div class="white-box" style="margin-bottom:10px">
                ${directors.map(d => `
                    <div><b>${renderName(d.name)}</b></div>
                    <div>${renderAddress(d.address, isVAAddress(d.address))}</div>
                `).join('<hr style="border:none; border-top:1px solid #eee; margin:6px 0"/>')}
            </div>`;
            html += dirSection;
            dbSections.push(dirSection);
        } else {
            addEmptySection(isLLC ? 'MEMBERS:' : 'DIRECTORS:');
        }
        if (!isLLC) {
            // SHAREHOLDERS
            if (shareholders.length) {
                const shSection = `
                <div class="section-label">SHAREHOLDERS:</div>
                <div class="white-box" style="margin-bottom:10px">
                    ${shareholders.map(s => {
                        const name = `<div><b>${renderName(s.name)}</b></div>`;
                        const addr = `<div>${renderAddress(s.address, isVAAddress(s.address))}</div>`;
                        const shares = renderCopy(s.shares);
                        const shareLine = shares ? `<div>Shares: ${shares}</div>` : '';
                        return `${name}${addr}${shareLine}`;
                    }).join('<hr style="border:none; border-top:1px solid #eee; margin:6px 0"/>')}
                </div>`;
                html += shSection;
                dbSections.push(shSection);
            } else {
                addEmptySection('SHAREHOLDERS:');
            }
            // OFFICERS
            if (officers.length) {
                const offSection = `
                <div class="section-label">OFFICERS:</div>
                <div class="white-box" style="margin-bottom:10px">
                    ${officers.map(o => {
                        const addrLine = o.address && o.address !== '-' ? `<div>${renderAddress(o.address, isVAAddress(o.address))}</div>` : '';
                        return `
                            <div><b>${renderName(o.name)}</b></div>
                            ${addrLine}
                            <div>${renderCopy(o.position)}</div>
                        `;
                    }).join('<hr style="border:none; border-top:1px solid #eee; margin:6px 0"/>')}
                </div>`;
                html += offSection;
                dbSections.push(offSection);
            } else {
                addEmptySection('OFFICERS:');
            }
        }
        if (isAmendment) {
            if (amendmentDetails) {
            const amendSection = `
            <div class="section-label">AMENDMENT DETAILS:</div>
            <div class="white-box" style="margin-bottom:10px">
                ${formatAmendmentDetails(amendmentDetails)}
            </div>`;
            html += amendSection;
            dbSections.push(amendSection);
            } else {
                addEmptySection('AMENDMENT DETAILS:');
            }
        }

        if (!html) {
            html = `<div style="text-align:center; color:#aaa; margin-top:40px">No se encontró información relevante de la orden.</div>`;
        }

        const orderInfo = getBasicOrderInfo();
        const sidebarOrderInfo = {
            orderId: orderInfo.orderId,
            type: currentOrderTypeText || orderInfo.type,
            expedited: isExpeditedOrder(),
            companyName: company ? company.name : null,
            companyId: company ? company.stateId : null,
            companyState: company ? company.state : null
        };
        chrome.storage.local.set({
            sidebarDb: dbSections,
            sidebarOrderId: orderInfo.orderId,
            sidebarOrderInfo
        });

        const body = document.getElementById('copilot-body-content');
        if (body) {
            body.innerHTML = html;
            if (typeof initQuickSummary === 'function') initQuickSummary();
            attachCommonListeners(body);
            updateReviewDisplay();
        }
    }

    function extractAndShowAmendmentData() {
        extractAndShowFormationData(true);
    }

    function getBillingInfo() {
        const raw = extractSingle('#vbilling .form-body', [
            {name: 'cardholder', label: 'cardholder'},
            {name: 'cardType', label: 'card type'},
            {name: 'expiry', label: 'expiration'},
            {name: 'last4', label: 'last 4'},
            {name: 'street', label: 'street'},
            {name: 'street1', label: 'street 1'},
            {name: 'street2', label: 'street 2'},
            {name: 'cityStateZipCountry', label: 'city, state, zip, country'},
            {name: 'cityStateZip', label: 'city, state, zip'},
            {name: 'country', label: 'country'},
            {name: 'address', label: 'address'}
        ]);
        if (!raw) return null;
        return {
            cardholder: raw.cardholder,
            cardType: raw.cardType,
            expiry: raw.expiry,
            last4: raw.last4,
            address: buildAddress(raw),
            street1: raw.street1 || raw.street,
            street2: raw.street2,
            cityStateZipCountry: raw.cityStateZipCountry,
            cityStateZip: raw.cityStateZip,
            country: raw.country,
            avs: raw.avs
        };
    }
    });

    function openCancelPopup() {
        const statusBtn = document.querySelector('.btn-status-text');
        if (!statusBtn) return console.warn('[Copilot] Status dropdown not found');
        statusBtn.click();
        setTimeout(() => {
            const cancelLink = Array.from(document.querySelectorAll('.dropdown-menu a'))
                .find(a => /cancel.*refund/i.test(a.textContent));
            if (!cancelLink) return console.warn('[Copilot] Cancel option not found');
            sessionStorage.removeItem('fennecCancelPending');
            cancelLink.click();
            selectCancelReason();
        }, 500);
    }

    function selectCancelReason() {
        const sel = document.querySelector('select');
        if (!sel) return setTimeout(selectCancelReason, 500);
        const opt = Array.from(sel.options)
            .find(o => /client.*cancell?ation/i.test(o.textContent));
        if (opt) {
            sel.value = opt.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    function formatDateLikeParent(text) {
        const d = new Date(text);
        if (isNaN(d)) return text;
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
        });
    }

    function startCancelProcedure() {
        console.log('[Copilot] Starting cancel procedure');
        const btn = Array.from(document.querySelectorAll('a'))
            .find(a => /mark resolved/i.test(a.textContent));
        if (btn) {
            sessionStorage.setItem('fennecCancelPending', '1');
            btn.click();
        } else {
            openCancelPopup();
        }
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
            const date = formatDateLikeParent(cells[3].textContent.trim());
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
        const m = location.pathname.match(/(?:detail|storage\/incfile)\/(\d+)/);
        const orderId = m ? m[1] : '';
        let type = getOrderType();
        const pkgEl = document.getElementById('ordType');
        if (type === 'formation' && pkgEl) {
            const pkg = getText(pkgEl).toUpperCase();
            if (/SILVER|GOLD|PLATINUM/.test(pkg)) type = pkg;
        }
        const dateLi = Array.from(document.querySelectorAll('li')).find(li =>
            li.querySelector('a') && getText(li.querySelector('a')).toLowerCase() === 'date ordered'
        );
        const dateRaw = dateLi ? getText(dateLi.querySelector('span')) || '' : '';
        const date = formatDateLikeParent(dateRaw);
        const status = getText(document.querySelector('.btn-status-text')) || '';
        return { orderId, type, date, status };
    }

    function isExpeditedOrder() {
        const li = Array.from(document.querySelectorAll('li')).find(li => {
            const icon = li.querySelector('i.mdi.mdi-truck');
            const link = li.querySelector('a');
            return icon && link && /completion date/i.test(getText(link));
        });
        if (!li) return false;
        const span = li.querySelector('span.pull-right');
        return span && /expedited/i.test(getText(span));
    }

    function getParentOrderId() {
        console.log("[Copilot] Scanning for parent order in #vcomp");
        const tab = document.querySelector('#vcomp') || document.querySelector('#vcompany');
        if (!tab) {
            console.log("[Copilot] #vcomp tab not found");
            return null;
        }
        const candidates = Array.from(
            tab.querySelectorAll("label, div, p, li, span, td, strong")
        );
        const parentEl = candidates.find(el => /parent order/i.test(getText(el)));
        if (!parentEl) {
            console.log("[Copilot] Parent order element not found; scanned:");
            candidates.forEach(el => {
                const txt = getText(el).trim();
                if (txt) console.log("- " + el.tagName + ": " + txt);
            });
            return null;
        }
        console.log("[Copilot] Parent order element text:", getText(parentEl).trim());
        let anchor = parentEl.querySelector('a[href*="/order/detail/"]');
        if (!anchor && parentEl.nextElementSibling) {
            anchor = parentEl.nextElementSibling.querySelector('a[href*="/order/detail/"]');
        }
        if (anchor) {
            console.log("[Copilot] Found parent order link", anchor.href);
            const m = anchor.href.match(/detail\/(\d+)/);
            if (m) {
                console.log("[Copilot] Extracted ID from href:", m[1]);
                return m[1];
            }
            const textId = anchor.textContent.replace(/\D/g, '');
            if (textId) {
                console.log("[Copilot] Extracted ID from link text:", textId);
                return textId;
            }
            console.log("[Copilot] No numeric ID in parent link");
        }
        let digits = parentEl.textContent.replace(/\D/g, "");
        if (!digits) {
            let valEl = parentEl.nextElementSibling;
            const container = parentEl.closest("div");
            if ((!valEl || !getText(valEl)) && container) {
                if (container.nextElementSibling && getText(container.nextElementSibling)) {
                    valEl = container.nextElementSibling;
                } else {
                    const siblings = Array.from(container.parentElement.children);
                    const idx = siblings.indexOf(container);
                    for (let i = idx + 1; i < siblings.length; i++) {
                        if (getText(siblings[i])) {
                            valEl = siblings[i];
                            break;
                        }
                    }
                }
            }
            if (valEl) {
                console.log("[Copilot] Checked sibling text:", getText(valEl).trim());
                digits = valEl.textContent.replace(/\D/g, "");
            }
        }
        if (digits) console.log("[Copilot] Extracted ID from text:", digits);
        else {
            console.log("[Copilot] No digits found in parent element text or siblings");
            console.log("[Copilot] Parent text scanned:", getText(parentEl).trim());
        }
        return digits || null;
    }

    function getClientInfo() {
        const tab = document.querySelector('#vclient');
        if (tab) {
            const row = tab.querySelector('table tbody tr');
            if (row) {
                const cells = row.querySelectorAll('td');
                const id = cells[0] ? getText(cells[0]).trim() : '';
                const orders = cells[1] ? getText(cells[1]).trim() : '';
                const ltv = cells[2] ? getText(cells[2]).trim() : '';
                const nameCell = row.querySelector('td[id^="clientName"]');
                const contactCell = row.querySelector('td[id^="clientContact"]');
                const name = nameCell ? getText(nameCell).replace(/^\s*✓?\s*/, '') : '';
                let email = '';
                let phone = '';
                if (contactCell) {
                    const mailEl = contactCell.querySelector('a[href^="mailto:"]');
                    if (mailEl) email = getText(mailEl);
                    const text = getText(contactCell);
                    if (!email) {
                        const em = text.match(/[\w.+-]+@[\w.-]+\.[\w.-]+(?=\s|$)/);
                        if (em) email = em[0];
                    }
                    const ph = text.match(/\(?\d{3}\)?[-\s.]?\d{3}[-\s.]?\d{4}/);
                    if (ph) phone = ph[0];
                }
                return { id, orders, ltv, name, email, phone };
            }
        }
        const contactHeader = Array.from(document.querySelectorAll('h3.box-title'))
            .find(h => getText(h).toLowerCase().includes('contact info'));
        if (contactHeader) {
            const body = contactHeader.closest('.form-body');
            if (body) {
                const nameLabel = Array.from(body.querySelectorAll('label'))
                    .find(l => getText(l).toLowerCase().startsWith('name'));
                const emailLabel = Array.from(body.querySelectorAll('label'))
                    .find(l => getText(l).toLowerCase().startsWith('email'));
                const name = nameLabel ? getText(nameLabel.parentElement.querySelector('.form-control-static')) : '';
                const email = emailLabel ? getText(emailLabel.parentElement.querySelector('.form-control-static')) : '';
                const phoneLabel = Array.from(body.querySelectorAll('label'))
                    .find(l => getText(l).toLowerCase().startsWith('phone'));
                const phone = phoneLabel ? getText(phoneLabel.parentElement.querySelector('.form-control-static')) : '';
                return { id: '', orders: '', ltv: '', name, email, phone };
            }
        }
        return { id: '', orders: '', ltv: '', name: '', email: '', phone: '' };
    }


    function diagnoseHoldOrders(orders) {
        let overlay = document.getElementById('fennec-diagnose-overlay');
        if (overlay) overlay.remove();
        overlay = document.createElement('div');
        overlay.id = 'fennec-diagnose-overlay';
        const close = document.createElement('div');
        close.className = 'diag-close';
        close.textContent = '✕';
        close.addEventListener('click', () => overlay.remove());
        overlay.appendChild(close);
        const loading = document.createElement('div');
        loading.className = 'diag-loading';
        loading.textContent = 'Gathering order info...';
        overlay.appendChild(loading);
        document.body.appendChild(overlay);

        const addCard = (r) => {
            const card = document.createElement('div');
            card.className = 'diag-card';
            const cls =
                /shipped|review|processing/i.test(r.order.status) ? 'copilot-tag copilot-tag-green' :
                /canceled/i.test(r.order.status) ? 'copilot-tag copilot-tag-red' :
                /hold/i.test(r.order.status) ? 'copilot-tag copilot-tag-purple' : 'copilot-tag';

            const link = document.createElement('a');
            link.href = `${location.origin}/incfile/order/detail/${r.order.orderId}`;
            link.target = '_blank';
            link.textContent = r.order.orderId;
            link.className = 'diag-order';
            card.appendChild(link);

            const tagsDiv = document.createElement('div');
            tagsDiv.className = 'diag-tags';
            const statusSpan = document.createElement('span');
            statusSpan.className = cls;
            statusSpan.textContent = r.order.status;
            tagsDiv.appendChild(statusSpan);
            const typeSpan = document.createElement('span');
            typeSpan.className = 'copilot-tag copilot-tag-white';
            typeSpan.textContent = r.order.type.toUpperCase();
            tagsDiv.appendChild(typeSpan);
            card.appendChild(tagsDiv);

            const issueDiv = document.createElement('div');
            issueDiv.className = 'diag-issue';
            issueDiv.textContent = r.issue;
            card.appendChild(issueDiv);

            const cancel = document.createElement('span');
            cancel.className = 'copilot-tag copilot-tag-red diag-cancel';
            cancel.textContent = 'CANCEL';
            cancel.addEventListener('click', startCancelProcedure);
            card.appendChild(cancel);

            overlay.appendChild(card);
        };

        const promises = orders.map(o => new Promise(res => {
            chrome.runtime.sendMessage({ action: 'fetchLastIssue', orderId: o.orderId }, resp => {
                const result = resp && resp.issueInfo
                    ? { order: o, issue: resp.issueInfo.text, active: resp.issueInfo.active }
                    : { order: o, issue: 'On hold', active: true };
                addCard(result);
                res(result);
            });
        }));
        Promise.all(promises).then(() => loading.remove());
    }

    function showDiagnoseResults() {
        // legacy function kept for compatibility
    }

function getLastHoldUser() {
        const trigger = document.querySelector("a[onclick*='modalTrackOrderHistory']");
        if (trigger) trigger.click();
        let attempts = 10;
        const parse = () => {
            const rows = Array.from(document.querySelectorAll('#modalTrackOrderHistory table tbody tr'));
            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2 && /hold status/i.test(cells[1].textContent)) {
                    const s = row.querySelector('strong');
                    if (s) return s.textContent.trim();
                }
            }
            const items = Array.from(document.querySelectorAll('#modalTrackOrderHistory .sl-item'));
            for (const item of items) {
                const link = item.querySelector('a');
                if (link && /hold status/i.test(link.textContent)) {
                    const date = item.querySelector('.sl-date');
                    if (date) {
                        const parts = date.textContent.split('-');
                        if (parts.length > 1) return parts.pop().trim();
                    }
                }
            }
            return null;
        };
    return new Promise(resolve => {
        const check = () => {
            const user = parse();
            if (user || attempts-- <= 0) {
                const closeBtn = document.querySelector('#modalTrackOrderHistory .close');
                if (closeBtn) closeBtn.click();
                resolve(user);
            } else {
                setTimeout(check, 500);
            }
        };
        check();
    });
}

    // Expose helpers so core/utils.js can access them
    window.getParentOrderId = getParentOrderId;
    window.diagnoseHoldOrders = diagnoseHoldOrders;

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.fennecReviewMode) {
        reviewMode = changes.fennecReviewMode.newValue;
        updateReviewDisplay();
    }
});
})();
