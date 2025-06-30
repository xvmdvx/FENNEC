// Chat UI and Mistral integration for FENNEC.
// Provides a simple chat interface using a local Mistral model if available.

function sendToMistral(prompt) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "mistralGenerate", prompt }, resp => {
            if (chrome.runtime.lastError || !resp || resp.text === "Error") {
                reject(chrome.runtime.lastError || new Error("Fetch failed"));
            } else {
                resolve(resp.text || "");
            }
        });
    });
}

function initMistralChat() {
    const box = document.getElementById("mistral-chat");
    if (!box) return;
    const input = document.getElementById("mistral-input");
    const sendBtn = document.getElementById("mistral-send");
    const log = document.getElementById("mistral-log");

    function appendMessage(text, who, options) {
        const div = document.createElement("div");
        div.className = "mistral-msg " + who;
        div.textContent = text;
        if (options && options.retry) {
            const btn = document.createElement("button");
            btn.textContent = "Retry";
            btn.className = "copilot-button";
            btn.style.marginLeft = "6px";
            btn.addEventListener("click", () => {
                div.remove();
                handleSend(null, options.prompt);
            });
            div.appendChild(document.createTextNode(" "));
            div.appendChild(btn);
        }
        log.appendChild(div);
        div.style.opacity = "0";
        requestAnimationFrame(() => { div.style.opacity = "1"; });
        log.scrollTop = log.scrollHeight;
    }

    async function handleSend(event, preset) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const text = (preset !== undefined ? preset : input.value).trim();
        if (!text) return;
        appendMessage(text, "user");
        input.value = "";
        try {
            const resp = await sendToMistral(text);
            appendMessage(resp, "ai");
        } catch (e) {
            console.error("[Mistral]", e);
            appendMessage("Mistral service unavailable. Ensure Ollama is running.", "ai", { retry: true, prompt: text });
        }
    }

    sendBtn.addEventListener("click", handleSend);
    input.addEventListener("keypress", e => {
        if (e.key === "Enter") handleSend(e);
    });
}
