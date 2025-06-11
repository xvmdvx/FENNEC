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

    // Scrapea los .row de una sección dada y devuelve array de objetos campo:valor
    function extractRows(sectionSel, fields) {
        const root = document.querySelector(sectionSel);
        if (!root) return [];
        let groups = Array.from(root.children).filter(el => el.classList.contains('row'));
        if (!groups.length) {
            groups = Array.from(root.querySelectorAll('.row'));
        }
        return groups.map(row => {
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

    function extractAndShowData() {
        // 1. COMPANY
        const companyRaw = extractSingle('#vcomp .form-body', [
            {name: 'name', label: 'company name'},
            {name: 'originalName', label: 'original name'},
            {name: 'state', label: 'state of formation'},
            {name: 'purpose', label: 'purpose'},
            {name: 'street', label: 'street'},
            {name: 'street1', label: 'street 1'},
            {name: 'cityStateZip', label: 'city, state, zip'},
            {name: 'address', label: 'address'}
        ]);
        const company = companyRaw ? {
            name: companyRaw.name,
            originalName: companyRaw.originalName,
            state: companyRaw.state,
            purpose: companyRaw.purpose,
            address: [
                companyRaw.address || companyRaw.street || companyRaw.street1,
                companyRaw.cityStateZip
            ].filter(Boolean).join(', ')
        } : null;

        // 2. AGENT
        const agentRaw = extractSingle('#vagent .form-body', [
            {name: 'name', label: 'name'},
            {name: 'address', label: 'address'},
            {name: 'street', label: 'street'},
            {name: 'street1', label: 'street 1'},
            {name: 'cityStateZip', label: 'city, state, zip'},
            {name: 'status', label: 'subscription'}
        ]);
        const agent = agentRaw ? {
            name: agentRaw.name,
            address: [
                agentRaw.address || agentRaw.street || agentRaw.street1,
                agentRaw.cityStateZip
            ].filter(Boolean).join(', '),
            status: agentRaw.status
        } : null;

        // 3. DIRECTORS/MEMBERS
        const directorsTitleEl = document.querySelector('#vmembers .box-title');
        const directorsLabel = directorsTitleEl && /member/i.test(directorsTitleEl.innerText)
            ? 'MEMBERS'
            : 'DIRECTORS';
        const directorsRaw = extractRows('#vmembers .form-body', [
            {name: 'name', label: 'name'},
            {name: 'address', label: 'address'},
            {name: 'street', label: 'street'},
            {name: 'street1', label: 'street 1'},
            {name: 'cityStateZip', label: 'city, state, zip'},
            {name: 'position', label: 'position'}
        ]);
        const directors = directorsRaw.map(d => ({
            name: d.name,
            address: [
                d.address || d.street || d.street1,
                d.cityStateZip
            ].filter(Boolean).join(', '),
            position: d.position
        }));

        // 4. SHAREHOLDERS
        const shareholdersRaw = extractRows('#vshareholders .form-body', [
            {name: 'name', label: 'name'},
            {name: 'address', label: 'address'},
            {name: 'street', label: 'street'},
            {name: 'street1', label: 'street 1'},
            {name: 'cityStateZip', label: 'city, state, zip'},
            {name: 'shares', label: 'share'}
        ]);
        const shareholders = shareholdersRaw.map(s => ({
            name: s.name,
            address: [
                s.address || s.street || s.street1,
                s.cityStateZip
            ].filter(Boolean).join(', '),
            shares: s.shares
        }));

        // 5. OFFICERS
        const officersRaw = extractRows('#vofficers .form-body', [
            {name: 'name', label: 'name'},
            {name: 'address', label: 'address'},
            {name: 'street', label: 'street'},
            {name: 'street1', label: 'street 1'},
            {name: 'cityStateZip', label: 'city, state, zip'},
            {name: 'position', label: 'position'}
        ]);
        const officers = officersRaw.map(o => ({
            name: o.name,
            address: [
                o.address || o.street || o.street1,
                o.cityStateZip
            ].filter(Boolean).join(', '),
            position: o.position
        }));

        // Render del HTML
        let html = '';

        // COMPANY
        if (company) {
            html += `
            <div class="white-box" style="margin-bottom:14px">
                <div class="box-title">COMPANY</div>
                <div><strong>Name:</strong> ${company.name || '<span style="color:#aaa">-</span>'}</div>
                <div><strong>Original Name:</strong> ${company.originalName || '<span style="color:#aaa">-</span>'}</div>
                <div><strong>State:</strong> ${company.state || '<span style="color:#aaa">-</span>'}</div>
                <div><strong>Purpose:</strong> ${company.purpose || '<span style="color:#aaa">-</span>'}</div>
                <div><strong>Address:</strong> ${company.address || '<span style="color:#aaa">-</span>'}</div>
            </div>`;
        }
        // AGENT
        if (agent) {
            html += `
            <div class="white-box" style="margin-bottom:14px">
                <div class="box-title">AGENT</div>
                <div><strong>Name:</strong> ${agent.name || '<span style="color:#aaa">-</span>'}</div>
                <div><strong>Address:</strong> ${agent.address || '<span style="color:#aaa">-</span>'}</div>
                <div><strong>Subscription:</strong> ${agent.status || '<span style="color:#aaa">-</span>'}</div>
            </div>`;
        }
        // DIRECTORS/MEMBERS
        if (directors.length) {
            html += `
            <div class="white-box" style="margin-bottom:14px">
                <div class="box-title">${directorsLabel}</div>
                ${directors.map(d => `
                    <div><strong>Name:</strong> ${d.name || '<span style="color:#aaa">-</span>'}</div>
                    <div><strong>Address:</strong> ${d.address || '<span style="color:#aaa">-</span>'}</div>
                    <div><strong>Position:</strong> ${d.position || '<span style="color:#aaa">-</span>'}</div>
                    <hr style="border:none; border-top:1px solid #eee; margin:6px 0"/>
                `).join('')}
            </div>`;
        }
        // SHAREHOLDERS
        if (shareholders.length) {
            html += `
            <div class="white-box" style="margin-bottom:14px">
                <div class="box-title">SHAREHOLDERS</div>
                ${shareholders.map(s => `
                    <div><strong>Name:</strong> ${s.name || '<span style="color:#aaa">-</span>'}</div>
                    <div><strong>Address:</strong> ${s.address || '<span style="color:#aaa">-</span>'}</div>
                    <div><strong>Shares:</strong> ${s.shares || '<span style="color:#aaa">-</span>'}</div>
                    <hr style="border:none; border-top:1px solid #eee; margin:6px 0"/>
                `).join('')}
            </div>`;
        }
        // OFFICERS
        if (officers.length) {
            html += `
            <div class="white-box" style="margin-bottom:14px">
                <div class="box-title">OFFICERS</div>
                ${officers.map(o => `
                    <div><strong>Name:</strong> ${o.name || '<span style="color:#aaa">-</span>'}</div>
                    <div><strong>Address:</strong> ${o.address || '<span style="color:#aaa">-</span>'}</div>
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
        }
    }
})();
