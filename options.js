// Loads and stores sidebar options using chrome.storage.sync

document.addEventListener("DOMContentLoaded", () => {
    const reviewBox = document.getElementById("default-review");
    const widthInput = document.getElementById("sidebar-width");
    const saveBtn = document.getElementById("save-btn");

    chrome.storage.sync.get({ defaultReviewMode: false, sidebarWidth: 340 }, (opts) => {
        reviewBox.checked = Boolean(opts.defaultReviewMode);
        widthInput.value = parseInt(opts.sidebarWidth, 10) || 340;
    });

    function save() {
        const width = parseInt(widthInput.value, 10) || 340;
        chrome.storage.sync.set({
            defaultReviewMode: reviewBox.checked,
            sidebarWidth: width,
            fennecReviewMode: reviewBox.checked
        });
        chrome.storage.local.set({ fennecReviewMode: reviewBox.checked });
    }

    saveBtn.addEventListener("click", save);
});
