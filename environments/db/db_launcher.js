(function main() {
    try {
        setTimeout(() => {
            if (!document.getElementById('copilot-sidebar')) {
                console.log("[Copilot] Sidebar no encontrado, inyectando en DB...");

                const SIDEBAR_WIDTH = 340;
                document.body.style.transition = 'margin-right 0.2s';
                document.body.style.marginRight = SIDEBAR_WIDTH + 'px';

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
                        console.log("[Copilot] Sidebar cerrado manualmente en DB.");
                    };
                    extractAndShowData();
                })();
            }
        }, 400);
        console.log("[Copilot] Timeout de chequeo de sidebar lanzado (DB).");
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
        const esc = escapeHtml(addr);
        return `<a href="#" class="copilot-address" data-address="${esc}">${esc}</a>`;
    }

    function buildAddress(obj) {
        if (!obj) return '';
        const parts = [];
        const line1 = obj.address || obj.street || obj.street1;
        if (line1) parts.push(line1);
        if (obj.street2) parts.push(obj.street2);
        if (obj.cityStateZipCountry) {
            parts.push(obj.cityStateZipCountry);
        } else {
            if (obj.cityStateZip) parts.push(obj.cityStateZip);
            if (obj.country && (!obj.cityStateZip || !obj.cityStateZip.includes(obj.country))) {
                parts.push(obj.country);
            }
        }
        return parts.filter(Boolean).join(', ');
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

    // Extrae un solo objeto (como para Company o Agent)
    function extractSingle(sectionSel, fields) {
        let rows = extractRows(sectionSel, fields);
        return rows[0] || null;
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
            {name: 'status', label: 'subscription'}
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
            {name: 'country', label: 'country'},
            {name: 'position', label: 'position'}
        ]);
        const directors = directorsRaw.map(d => ({
            name: d.name,
            address: buildAddress(d),
            position: d.position
        }));

        // 4. SHAREHOLDERS
        const shareholdersRaw = extractRows('#vshareholders .form-body', [
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
        const officersRaw = extractRows('#vofficers .form-body', [
            {name: 'name', label: 'name'},
            {name: 'address', label: 'address'},
            {name: 'street', label: 'street'},
            {name: 'street1', label: 'street 1'},
            {name: 'street2', label: 'street 2'},
            {name: 'cityStateZipCountry', label: 'city, state, zip, country'},
            {name: 'cityStateZip', label: 'city, state, zip'},
            {name: 'country', label: 'country'},
            {name: 'position', label: 'position'}
        ]);
        const officers = officersRaw.map(o => ({
            name: o.name,
            address: buildAddress(o),
            position: o.position
        }));

        // Render del HTML
        let html = '';

        // COMPANY
        if (company) {
            html += `
            <div class="white-box" style="margin-bottom:14px">
                <div class="box-title">🏢 COMPANY</div>
                <div><strong>Name:</strong> ${company.name || '<span style="color:#aaa">-</span>'}</div>
                <div><strong>State:</strong> ${company.state || '<span style="color:#aaa">-</span>'}</div>
                <div><strong>Status:</strong> ${company.status || '<span style="color:#aaa">-</span>'}</div>
                <div><strong>Purpose:</strong> ${company.purpose || '<span style="color:#aaa">-</span>'}</div>
                <div><strong>Address:</strong> ${renderAddress(company.address)}</div>
            </div>`;
        }
        // AGENT
        if (agent && Object.values(agent).some(v => v)) {
            html += `
            <div class="white-box" style="margin-bottom:14px">
                <div class="box-title">🕵️ AGENT</div>
                <div><strong>Name:</strong> ${agent.name || '<span style="color:#aaa">-</span>'}</div>
                <div><strong>Address:</strong> ${renderAddress(agent.address)}</div>
                <div><strong>Subscription:</strong> ${agent.status || '<span style="color:#aaa">-</span>'}</div>
            </div>`;
        }
        // DIRECTORS / MEMBERS
        if (directors.length) {
            const directorsTitle = isLLC ? 'MEMBERS' : 'DIRECTORS';
            html += `
            <div class="white-box" style="margin-bottom:14px">
                <div class="box-title">👥 ${directorsTitle}</div>
                ${directors.map(d => `
                    <div><strong>Name:</strong> ${d.name || '<span style="color:#aaa">-</span>'}</div>
                    <div><strong>Address:</strong> ${renderAddress(d.address)}</div>
                    <div><strong>Position:</strong> ${d.position || '<span style="color:#aaa">-</span>'}</div>
                    <hr style="border:none; border-top:1px solid #eee; margin:6px 0"/>
                `).join('')}
            </div>`;
        }
        // SHAREHOLDERS
        if (shareholders.length) {
            html += `
            <div class="white-box" style="margin-bottom:14px">
                <div class="box-title">💰 SHAREHOLDERS</div>
                ${shareholders.map(s => `
                    <div><strong>Name:</strong> ${s.name || '<span style="color:#aaa">-</span>'}</div>
                    <div><strong>Address:</strong> ${renderAddress(s.address)}</div>
                    <div><strong>Shares:</strong> ${s.shares || '<span style="color:#aaa">-</span>'}</div>
                    <hr style="border:none; border-top:1px solid #eee; margin:6px 0"/>
                `).join('')}
            </div>`;
        }
        // OFFICERS
        if (officers.length) {
            html += `
            <div class="white-box" style="margin-bottom:14px">
                <div class="box-title">👮 OFFICERS</div>
                ${officers.map(o => `
                    <div><strong>Name:</strong> ${o.name || '<span style="color:#aaa">-</span>'}</div>
                    <div><strong>Address:</strong> ${renderAddress(o.address)}</div>
                    <div><strong>Position:</strong> ${o.position || '<span style="color:#aaa">-</span>'}</div>
                    <hr style="border:none; border-top:1px solid #eee; margin:6px 0"/>
                `).join('')}
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
        }
    }
})();
