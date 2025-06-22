// Auto-navigates to the DNA page and collects payment/transaction info when an
// order number is provided via ?fennec_order= in the URL or session storage.
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

            function waitForElement(selector, timeout = 10000) {
                return new Promise(resolve => {
                    const interval = 250;
                    let elapsed = 0;
                    const run = () => {
                        const el = document.querySelector(selector);
                        if (el) {
                            resolve(el);
                        } else if (elapsed >= timeout) {
                            resolve(null);
                        } else {
                            elapsed += interval;
                            setTimeout(run, interval);
                        }
                    };
                    run();
                });
            }

            function fillAndSubmit() {
                waitForElement('.header-search__input, input[name="query"]').then(input => {
                    try {
                        if (!input) return;
                        input.focus();
                        input.value = order;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        const payments = document.querySelector('input[type="radio"][value="payments"]');
                        if (payments) payments.click();
                        waitForElement('button[type="submit"], input[type="submit"], button[aria-label*="search" i]').then(btn => {
                            if (btn) btn.click();
                        });
                    } catch (err) {
                        console.error('[FENNEC Adyen] Error filling form:', err);
                    }
                });
            }

            function openMostRecent() {
                waitForElement('a[href*="showTx.shtml?pspReference="]').then(link => {
                    try {
                        if (link) link.click();
                    } catch (err) {
                        console.error('[FENNEC Adyen] Error opening result:', err);
                    }
                });
            }

            function saveData(part) {
                chrome.storage.local.get({ adyenDnaInfo: {} }, ({ adyenDnaInfo }) => {
                    const updated = Object.assign({}, adyenDnaInfo, part);
                    chrome.storage.local.set({ adyenDnaInfo: updated });
                });
            }

            function extractSection(title) {
                const headings = Array.from(document.querySelectorAll('h3.adl-heading'));
                const heading = headings.find(h => h.textContent.trim() === title);
                if (!heading) return null;
                const card = heading.closest('section');
                if (!card) return null;
                const rows = card.querySelectorAll('.structured-list__item');
                const data = {};
                rows.forEach(r => {
                    const label = r.querySelector('.structured-list__label');
                    const val = r.querySelector('.structured-list__content');
                    if (label && val) {
                        data[label.textContent.trim()] = val.textContent.trim().replace(/\s+/g, ' ');
                    }
                });
                return data;
            }

            function handlePaymentPage() {
                const card = extractSection('Card details') || {};
                if (card['Card number']) {
                    card['Card number'] = card['Card number']
                        .replace(/\D+/g, '')
                        .slice(-4);
                }
                const shopper = extractSection('Shopper details') || {};
                const processing = extractSection('Processing') || {};
                saveData({ payment: { card, shopper, processing } });
            }

            function openDna() {
                waitForElement('a[href*="showOilSplashList.shtml"]').then(link => {
                    try {
                        if (link) {
                            window.open(link.href, '_blank');
                            sessionStorage.removeItem('fennec_order');
                        }
                    } catch (err) {
                        console.error('[FENNEC Adyen] Error opening DNA:', err);
                    }
                });
            }

            function handleDnaPage() {
                const stats = {};
                document.querySelectorAll('.stats-bar-item').forEach(item => {
                    const label = item.querySelector('.stats-bar-item__label');
                    if (!label) return;
                    const count = item.querySelector('.stats-bar-item__text');
                    const amount = item.querySelector('.stats-bar-item__subtext');
                    stats[label.textContent.trim()] = {
                        count: count ? count.textContent.trim() : '',
                        amount: amount ? amount.textContent.trim() : ''
                    };
                });
                saveData({ transactions: stats, updated: Date.now() });
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
                const run = () => { openDna(); handlePaymentPage(); };
                if (ready) {
                    document.addEventListener('DOMContentLoaded', run);
                } else {
                    run();
                }
            } else if (path.includes('showOilSplashList.shtml')) {
                if (ready) {
                    document.addEventListener('DOMContentLoaded', handleDnaPage);
                } else {
                    handleDnaPage();
                }
            }
        } catch (e) {
            console.error('[FENNEC Adyen] Launcher error:', e);
        }
    });
})();
