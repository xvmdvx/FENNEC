(function() {
    chrome.storage.local.get({ extensionEnabled: true }, ({ extensionEnabled }) => {
        if (!extensionEnabled) return;
        const params = new URLSearchParams(location.search);
        const email = params.get('fennec_email');
        if (!email) return;
        function run() {
            const input = document.querySelector('#search_field');
            if (input) {
                input.value = email;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const btn = document.querySelector('button[type="submit"],input[type="submit"]');
            if (btn) btn.click();
            const gather = () => {
                const rows = document.querySelectorAll('.search_result tbody tr');
                if (!rows.length) { setTimeout(gather, 500); return; }
                const orders = Array.from(rows).map(r => {
                    const link = r.querySelector('a[href*="/order/detail/"]');
                    const id = link ? link.textContent.replace(/\D+/g, '') : '';
                    const typeCell = r.querySelector('td:nth-child(4)');
                    const type = typeCell ? typeCell.textContent.trim() : '';
                    return { orderId: id, type };
                });
                chrome.runtime.sendMessage({ action: 'dbEmailSearchResults', orders });
            };
            gather();
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run);
        } else run();
    });
})();
