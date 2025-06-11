(function persistentSidebar() {
    try {
        const SIDEBAR_WIDTH = 340;

        function applyPaddingToMainPanels() {
            const candidates = [
                ...Array.from(document.body.querySelectorAll(':scope > .nH')),
                ...Array.from(document.body.querySelectorAll('.aeF')),
                ...Array.from(document.body.querySelectorAll('.Bk'))
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

        function extractOrderContextFromEmail() {
            try {
                const senderSpan = document.querySelector("h3.iw span[email]");
                const senderEmail = senderSpan?.getAttribute("email") || null;
                const senderName = senderSpan?.innerText?.trim() || null;

                const a3sNodes = document.querySelectorAll('.a3s');
                let fullText = "";
                a3sNodes.forEach(n => {
                    if (n.innerText) fullText += "\n" + n.innerText;
                });

                if (!fullText.trim()) {
                    console.warn("[Copilot] .a3s no tiene texto visible.");
                    return null;
                }

                const orderMatch = fullText.match(/\b22\d{10}\b/);
                const orderNumber = orderMatch ? orderMatch[0] : null;

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
                    name: finalName
                };
            } catch (err) {
                console.warn("[Copilot] Error extrayendo contexto:", err);
                return null;
            }
        }

        function fillOrderSummaryBox(context) {
            const summaryBox = document.getElementById('order-summary-content');
            if (!summaryBox) return;
            summaryBox.innerHTML = `
                <div><strong>Order:</strong> ${context?.orderNumber || "Not found"}</div>
                <div><strong>Email:</strong> ${context?.email || "Not found"}</div>
                <div><strong>Name:</strong> ${context?.name || "Not found"}</div>
            `;
            console.log("[FENNEC] Order Summary rellenado:", context);
        }

        function handleEmailSearchClick() {
            const context = extractOrderContextFromEmail();
            fillOrderSummaryBox(context);

            if (!context || !context.email) {
                alert("No se pudo detectar el correo del cliente.");
                return;
            }

            const queryParts = [];
            if (context.orderNumber) queryParts.push(context.orderNumber);
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

            chrome.runtime.sendMessage({ action: "openTabs", urls });
        }

        function injectSidebar(mainPanels) {
            if (document.getElementById('copilot-sidebar')) return;

            const sidebar = document.createElement('div');
            sidebar.id = 'copilot-sidebar';
            sidebar.innerHTML = `
                <div class="copilot-header">
                    <img src="${chrome.runtime.getURL('icons/copilot_icon.png')}" class="copilot-icon" alt="Copilot" />
                    <span>FENNEC</span>
                    <button id="copilot-close">✕</button>
                </div>
                <div class="copilot-body">
                    <p>Hi, it's Fennec. Check your options below:</p>
                    <div class="copilot-actions">
                        <button id="btn-email-search" class="copilot-button">📧 EMAIL SEARCH</button>
                        <button id="btn-open-order" class="copilot-button">📂 OPEN ORDER</button>
                    </div>
                    <div class="order-summary-box">
                        <strong>ORDER SUMMARY</strong><br>
                        <div id="order-summary-content" style="color:#ccc; font-size:13px;">
                            No order data yet.
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(sidebar);
            console.log("[Copilot] Sidebar INYECTADO en Gmail.");

            // Botón de cierre
            document.getElementById('copilot-close').onclick = () => {
                sidebar.remove();
                // Limpiar el margin aplicado a los paneles
                mainPanels.forEach(el => el.style.marginRight = '');
                sessionStorage.setItem('copilotSidebarClosed', 'true');
                console.log("[Copilot] Sidebar cerrado manualmente en Gmail.");
            };

            // Botón EMAIL SEARCH (listener UNIFICADO)
            document.getElementById("btn-email-search").onclick = handleEmailSearchClick;
        }

        function injectSidebarIfMissing() {
            if (sessionStorage.getItem('copilotSidebarClosed') === 'true') return;
            if (!document.getElementById('copilot-sidebar')) {
                console.log("[Copilot] Sidebar no encontrado, inyectando en Gmail...");
                const mainPanels = applyPaddingToMainPanels();
                injectSidebar(mainPanels);
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

        // --- OPEN ORDER listener robusto, sin cambios ---
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

        waitForElement("#btn-open-order").then((button) => {
            button.addEventListener("click", function () {
                try {
                    const bodyNode = document.querySelector(".a3s");
                    if (!bodyNode) {
                        alert("No se encontró el cuerpo del correo.");
                        return;
                    }

                    const text = bodyNode.innerText || "";
                    const match = text.match(/\b22\d{10}\b/);
                    if (!match) {
                        alert("No se encontró ningún número de orden válido en el correo.");
                        return;
                    }

                    const orderId = match[0];
                    const url = `https://db.incfile.com/incfile/order/detail/${orderId}`;
                    window.open(url, "_blank");
                } catch (error) {
                    console.error("Error al intentar abrir la orden:", error);
                    alert("Ocurrió un error al intentar abrir la orden.");
                }
            });
        }).catch((err) => {
            console.warn("[OPEN ORDER] No se pudo inyectar el listener:", err);
        });

    } catch (e) {
        console.error("[Copilot] ERROR en Gmail Launcher:", e);
    }
})();
