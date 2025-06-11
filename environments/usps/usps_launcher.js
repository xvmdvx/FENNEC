(function() {
    try {
        const params = new URLSearchParams(window.location.search);
        const addr = params.get('fennec_addr');
        if (!addr) return;

        function fillAndSubmit() {
            try {
                const addressInput = document.querySelector('#tAddress');
                if (addressInput) {
                    addressInput.focus();
                    addressInput.value = addr;
                }
                const findBtn = document.querySelector('#zip-by-address');
                if (findBtn) {
                    findBtn.click();
                }
            } catch (err) {
                console.error('[FENNEC USPS] Error filling form:', err);
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fillAndSubmit);
        } else {
            fillAndSubmit();
        }
    } catch (e) {
        console.error('[FENNEC USPS] Launcher error:', e);
    }
})();
