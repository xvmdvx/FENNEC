(function main() {
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
                            <img src="${chrome.runtime.getURL('icons/copilot_icon.png')}" class="copilot-icon" alt="FENNEC" />
                            <span>FENNEC</span>
                            <button id="copilot-close">✕</button>
                        </div>
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
                    extractAndShowData();
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

    // ----------- FUNCIONES DE EXTRACCIÓN Y RENDER ------------

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
        const first = parts.shift();
        const display = parts.length ? `${escapeHtml(first)}<br>${escapeHtml(parts.join(', '))}`
                                      : escapeHtml(first);
        const escFull = escapeHtml(addr);
        return `<span class="address-wrapper"><a href="#" class="copilot-address" data-address="${escFull}">${display}</a><span class="copilot-usps" data-address="${escFull}" title="USPS Lookup"> ✉️</span></span>`;
    }

    function renderCopy(text) {
        if (!text) return '<span style="color:#aaa">-</span>';
        const esc = escapeHtml(text);
        return `<span class="copilot-copy" data-copy="${esc}">${esc}</span>`;
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
                        obj[field.name] = valDiv.innerText.trim();
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
                        obj[field.name] = valDiv.innerText.trim();
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
        const blocks = Array.from(root.querySelectorAll('.row.m-b-10'));
        if (!blocks.length) return extractRows(sectionSel, fields);
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
                            obj[field.name] = valDiv.innerText.trim();
                        }
                    }
                });
            });
            return Object.values(obj).some(x => x) ? obj : null;
        }).filter(Boolean);
    }

    // Extrae oficiales listados como "President: Name" dentro de .form-group
    function extractOfficers(sectionSel) {
        const root = document.querySelector(sectionSel);
        if (!root) return [];
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

    // Obtiene el estatus de subscripción del Registered Agent desde la pestaña
    // de suscripciones. Busca la fila correspondiente y retorna el valor de la
    // columna de estatus (p.ej. "Active" o "Inactive").
    function getAgentSubscriptionStatus() {
        const rows = document.querySelectorAll('#vsubscriptions .table-list-of-subs tbody tr');
        for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 3) {
                const planName = cells[1].innerText || '';
                if (/registered agent/i.test(planName)) {
                    return cells[2].innerText.trim();
                }
            }
        }
        return null;
    }

    function extractAndShowData() {
        // 1. COMPANY
        const companyRaw = extractSingle('#vcomp .form-body', [
            {name: 'name', label: 'company name'},
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

        const headerStatus = document.querySelector('.btn-status-text')?.innerText?.trim() || null;

        const company = companyRaw ? {
            name: companyRaw.name,
            state: companyRaw.state,
            status: companyRaw.status || headerStatus,
            purpose: companyRaw.purpose,
            address: buildAddress(companyRaw)
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
            {name: 'status', label: 'subscription'},
            {name: 'status', label: 'registered agent service'}
        ]);
        const agent = agentRaw ? {
            name: agentRaw.name,
            status: agentRaw.status,
            address: buildAddress(agentRaw)
        } : {};

        // Detectar el estatus de suscripción del Registered Agent desde la
        // pestaña de Subscriptions.
        const agentSub = getAgentSubscriptionStatus();
        if (agentSub) {
            agent.status = agentSub;
        }

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
        const officers = extractOfficers('#vofficers .form-body');

        // Render del HTML
        let html = '';

        // COMPANY
        if (company) {
            html += `
            <div class="white-box" style="margin-bottom:10px">
                <div class="box-title">🏢</div>
                <div><b>${renderCopy(company.name)}</b></div>
                <div>${company.state || '<span style="color:#aaa">-</span>'}</div>
                <div>${company.status || '<span style="color:#aaa">-</span>'}</div>
                <div>${renderCopy(company.purpose)}</div>
                <div>${renderAddress(company.address)}</div>
            </div>`;
        }
        // AGENT
        if (agent && Object.values(agent).some(v => v)) {
            html += `
            <div class="white-box" style="margin-bottom:10px">
                <div class="box-title">🕵️</div>
                <div><b>${renderCopy(agent.name)}</b></div>
                <div>${renderAddress(agent.address)}</div>
                <div>${agent.status || '<span style="color:#aaa">-</span>'}</div>
            </div>`;
        }
        // DIRECTORS / MEMBERS
        if (directors.length) {
            html += `
            <div class="white-box" style="margin-bottom:10px">
                <div class="box-title">👥</div>
                ${directors.map(d => `
                    <div><b>${renderCopy(d.name)}</b></div>
                    <div>${renderAddress(d.address)}</div>
                `).join('<hr style="border:none; border-top:1px solid #eee; margin:6px 0"/>')}
            </div>`;
        }
        // SHAREHOLDERS
        if (shareholders.length) {
            html += `
            <div class="white-box" style="margin-bottom:10px">
                <div class="box-title">💰</div>
                ${shareholders.map(s => `
                    <div><b>${renderCopy(s.name)}</b></div>
                    <div>${renderAddress(s.address)}</div>
                    <div>${renderCopy(s.shares)}</div>
                `).join('<hr style="border:none; border-top:1px solid #eee; margin:6px 0"/>')}
            </div>`;
        }
        // OFFICERS
        if (officers.length) {
            html += `
            <div class="white-box" style="margin-bottom:10px">
                <div class="box-title">👮</div>
                ${officers.map(o => `
                    <div><b>${renderCopy(o.name)}</b></div>
                    ${o.address ? `<div>${renderAddress(o.address)}</div>` : ''}
                    <div>${renderCopy(o.position)}</div>
                `).join('<hr style="border:none; border-top:1px solid #eee; margin:6px 0"/>')}
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
        }
    }
})();
