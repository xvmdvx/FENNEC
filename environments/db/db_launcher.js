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
                            <img src="${chrome.runtime.getURL('icons/copilot_icon.png')}" class="copilot-icon" alt="Copilot" />
                            <span>Copilot</span>
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
        const rows = Array.from(root.querySelectorAll('.row'));
        return rows.map(row => {
            let obj = {};
            fields.forEach(field => {
                let label = Array.from(row.querySelectorAll('label')).find(l =>
                    l.innerText.trim().toLowerCase().includes(field.label.toLowerCase())
                );
                if (label) {
                    let valDiv = label.nextElementSibling;
                    if (!valDiv || !valDiv.innerText.trim()) {
                        const parent = label.closest('div');
                        if (parent && parent.nextElementSibling) {
                            valDiv = parent.nextElementSibling;
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
        const company = extractSingle('#vcomp .form-body', [
            {name: 'name', label: 'company name'},
            {name: 'originalName', label: 'original name'},
            {name: 'state', label: 'state of formation'},
            {name: 'purpose', label: 'purpose'},
            {name: 'address', label: 'address'}
        ]);

        // 2. AGENT
        const agent = extractSingle('#vagent .form-body', [
            {name: 'name', label: 'name'},
            {name: 'address', label: 'address'},
            {name: 'status', label: 'subscription'}
        ]);

        // 3. DIRECTORS/MEMBERS
        const directors = extractRows('#vmembers .form-body', [
            {name: 'name', label: 'name'},
            {name: 'address', label: 'address'},
            {name: 'position', label: 'position'}
        ]);

        // 4. SHAREHOLDERS
        const shareholders = extractRows('#vshareholders .form-body', [
            {name: 'name', label: 'name'},
            {name: 'address', label: 'address'},
            {name: 'shares', label: 'share'}
        ]);

        // 5. OFFICERS
        const officers = extractRows('#vofficers .form-body', [
            {name: 'name', label: 'name'},
            {name: 'address', label: 'address'},
            {name: 'position', label: 'position'}
        ]);

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
        // DIRECTORS
        if (directors.length) {
            html += `
            <div class="white-box" style="margin-bottom:14px">
                <div class="box-title">DIRECTORS</div>
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
