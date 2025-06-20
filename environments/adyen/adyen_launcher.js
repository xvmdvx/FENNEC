// Auto-navigates to the DNA page when an order number is provided via
// ?fennec_order= in the URL or session storage.
(function() {
    chrome.storage.local.get({ extensionEnabled: true }, ({ extensionEnabled }) => {
        if (!extensionEnabled) {
            console.log('[FENNEC] Extension disabled, skipping Adyen launcher.');
            return;
        }

        try {
            const params = new URLSearchParams(window.location.search);
            const orderParam = params.get('fennec_order');
            if (orderParam) {
                sessionStorage.setItem('fennec_order', orderParam);
            }

            const order = sessionStorage.getItem('fennec_order');
            if (!order) return;

            function fillAndSubmit() {
                try {
                    const input = document.querySelector('.header-search__input, input[name="query"]');
                    if (input) {
                        input.focus();
                        input.value = order;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    const payments = document.querySelector('input[type="radio"][value="payments"]');
                    if (payments) payments.click();
                    const btn = document.querySelector('button[type="submit"], input[type="submit"], button[aria-label*="search" i]');
                    if (btn) btn.click();
                } catch (err) {
                    console.error('[FENNEC Adyen] Error filling form:', err);
                }
            }

            function openMostRecent() {
                try {
                    const links = Array.from(document.querySelectorAll('a[href*="showTx.shtml?pspReference="]'));
                    if (links.length) {
                        links[0].click();
                    }
                } catch (err) {
                    console.error('[FENNEC Adyen] Error opening result:', err);
                }
            }

            function openDna() {
                try {
                    const link = document.querySelector('a[href*="showOilSplashList.shtml"]');
                    if (link) {
                        window.open(link.href, '_blank');
                        sessionStorage.removeItem('fennec_order');
                    }
                } catch (err) {
                    console.error('[FENNEC Adyen] Error opening DNA:', err);
                }
            }

            const path = window.location.pathname;
            const ready = document.readyState === 'loading' ? 'DOMContentLoaded' : null;

            if (path.includes('/overview/default.shtml')) {
                if (ready) {
                    document.addEventListener('DOMContentLoaded', fillAndSubmit);
                } else {
                    fillAndSubmit();
                }
            } else if (path.includes('/payments/showList.shtml')) {
                if (ready) {
                    document.addEventListener('DOMContentLoaded', openMostRecent);
                } else {
                    openMostRecent();
                }
            } else if (path.includes('/accounts/showTx.shtml')) {
                if (ready) {
                    document.addEventListener('DOMContentLoaded', openDna);
                } else {
                    openDna();
                }
            }
        } catch (e) {
            console.error('[FENNEC Adyen] Launcher error:', e);
        }
    });
})();
