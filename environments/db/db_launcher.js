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
                        <div class="copilot-body">
                            <p>Hola, soy tu Copilot.<br>Selecciona texto o navega y verás ayuda aquí.</p>
                        </div>
                    `;
                    document.body.appendChild(sidebar);
                    console.log("[Copilot] Sidebar INYECTADO en DB.");
                    document.getElementById('copilot-close').onclick = () => {
                        sidebar.remove();
                        document.body.style.marginRight = '';
                        console.log("[Copilot] Sidebar cerrado manualmente en DB.");
                    };
                })();
            }
        }, 400);
        console.log("[Copilot] Timeout de chequeo de sidebar lanzado (DB).");
    } catch (e) {
        console.error("[Copilot] ERROR en DB Launcher:", e);
    }
})();