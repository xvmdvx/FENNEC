// Auto-fills the search field on Adyen when the URL contains ?fennec_order=.
(function() {
    chrome.storage.local.get({ extensionEnabled: true }, ({ extensionEnabled }) => {
        if (!extensionEnabled) {
            console.log('[FENNEC] Extension disabled, skipping Adyen launcher.');
            return;
        }
        try {
            const params = new URLSearchParams(window.location.search);
            const order = params.get('fennec_order');
            if (!order) return;

            function fillAndSubmit() {
                try {
                    const input = document.querySelector('input[type="search"], input[name*="search" i]');
                    if (input) {
                        input.focus();
                        input.value = order;
                    }
                    const btn = document.querySelector('button[type="submit"], input[type="submit"], button[aria-label*="search" i]');
                    if (btn) {
                        btn.click();
                    }
                } catch (err) {
                    console.error('[FENNEC Adyen] Error filling form:', err);
                }
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', fillAndSubmit);
            } else {
                fillAndSubmit();
            }
        } catch (e) {
            console.error('[FENNEC Adyen] Launcher error:', e);
        }
    });
})();
