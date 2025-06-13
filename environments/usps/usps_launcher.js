// Injects the FENNEC sidebar into USPS pages.
(function() {
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'fennecToggle') {
            window.location.reload();
        }
    });
    chrome.storage.local.get({ extensionEnabled: true }, ({ extensionEnabled }) => {
        if (!extensionEnabled) {
            console.log('[FENNEC] Extension disabled, skipping USPS launcher.');
            return;
        }
        try {
        const params = new URLSearchParams(window.location.search);
        const addr = params.get('fennec_addr');
        if (!addr) return;

        function parseAddress(str) {
            const result = { line1: '', line2: '', city: '', state: '', zip: '' };
            if (!str) return result;

            const parts = str.split(',').map(p => p.trim()).filter(Boolean);

            if (parts.length) {
                result.line1 = parts.shift();
            }
            if (parts.length > 2) {
                result.line2 = parts.shift();
            }

            const cityStateZip = parts.join(', ');
            const m = cityStateZip.match(/^(.*?)[,\s]+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/i);
            if (m) {
                result.city = m[1];
                result.state = m[2];
                result.zip = m[3];
            } else {
                const tokens = cityStateZip.split(/\s+/);
                if (tokens.length >= 3) {
                    result.city = tokens.slice(0, -2).join(' ');
                    result.state = tokens[tokens.length - 2];
                    result.zip = tokens[tokens.length - 1];
                } else if (tokens.length === 2) {
                    result.city = tokens[0];
                    result.state = tokens[1];
                } else if (tokens.length === 1) {
                    result.city = tokens[0];
                }
            }

            return result;
        }

        function fillAndSubmit() {
            try {
                const parsed = parseAddress(addr);

                const addressInput = document.querySelector('#tAddress');
                if (addressInput) {
                    addressInput.focus();
                    addressInput.value = parsed.line1;
                }

                const address2Input = document.querySelector('#tAddress2');
                if (address2Input && parsed.line2) {
                    address2Input.value = parsed.line2;
                }

                const cityInput = document.querySelector('#tCity');
                if (cityInput && parsed.city) {
                    cityInput.value = parsed.city;
                }

                const stateSelect = document.querySelector('#tState');
                if (stateSelect && parsed.state) {
                    stateSelect.value = parsed.state.toUpperCase();
                }

                const zipInput = document.querySelector('#tZip-byaddress');
                if (zipInput && parsed.zip) {
                    zipInput.value = parsed.zip;
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
    });
})();
