// Loads and stores sidebar options using chrome.storage.sync

document.addEventListener("DOMContentLoaded", () => {
    const reviewBox = document.getElementById("default-review");
    const devBox = document.getElementById("default-dev");
    const themeSelect = document.getElementById("sidebar-theme");
    const widthInput = document.getElementById("sidebar-width");
    const fontSizeSelect = document.getElementById("sidebar-font-size");
    const fontSelect = document.getElementById("sidebar-font");
    const bgColorInput = document.getElementById("sidebar-bg-color");
    const boxColorInput = document.getElementById("sidebar-box-color");
    const headerFontSizeInput = document.getElementById("header-font-size");
    const headerBold = document.getElementById("header-bold");
    const headerBgColorInput = document.getElementById("header-bg-color");
    const headerTextColorInput = document.getElementById("header-text-color");
    const line1SizeInput = document.getElementById("line1-size");
    const line1Bold = document.getElementById("line1-bold");
    const line1ColorInput = document.getElementById("line1-color");
    const line2SizeInput = document.getElementById("line2-size");
    const line2Bold = document.getElementById("line2-bold");
    const line2ColorInput = document.getElementById("line2-color");
    const line3SizeInput = document.getElementById("line3-size");
    const line3Bold = document.getElementById("line3-bold");
    const line3ColorInput = document.getElementById("line3-color");
    const boxTitleSizeInput = document.getElementById("box-title-size");
    const boxTitleBold = document.getElementById("box-title-bold");
    const boxTitleColorInput = document.getElementById("box-title-color");
    const buttonColorInput = document.getElementById("button-color");
    const buttonTextColorInput = document.getElementById("button-text-color");
    const buttonRadiusInput = document.getElementById("button-radius");
    const iconSetSelect = document.getElementById("icon-set");
    const userInput = document.getElementById("txsos-user");
    const passInput = document.getElementById("txsos-pass");
    const saveBtn = document.getElementById("save-btn");
    const previews = Array.from(document.querySelectorAll(".sidebar-preview"));

    const customSections = Array.from(document.querySelectorAll('.custom-only'));

    function toggleCustom() {
        const show = themeSelect.value === 'custom';
        customSections.forEach(div => div.style.display = show ? 'flex' : 'none');
    }

    function updatePreview() {
        previews.forEach(p => {
            p.style.setProperty("--preview-width", `${widthInput.value}px`);
            p.style.setProperty("--preview-font-size", `${fontSizeSelect.value}px`);
            p.style.setProperty("--preview-font", fontSelect.value);
            p.style.setProperty("--preview-bg", bgColorInput.value);
            p.style.setProperty("--preview-box-bg", boxColorInput.value);
            p.style.setProperty("--header-font-size", `${headerFontSizeInput.value}px`);
            p.style.setProperty("--header-bold", headerBold.checked ? '700' : '400');
            p.style.setProperty("--header-bg-color", headerBgColorInput.value);
            p.style.setProperty("--header-text-color", headerTextColorInput.value);
            p.style.setProperty("--line1-size", `${line1SizeInput.value}px`);
            p.style.setProperty("--line1-bold", line1Bold.checked ? '700' : '400');
            p.style.setProperty("--line1-color", line1ColorInput.value);
            p.style.setProperty("--line2-size", `${line2SizeInput.value}px`);
            p.style.setProperty("--line2-bold", line2Bold.checked ? '700' : '400');
            p.style.setProperty("--line2-color", line2ColorInput.value);
            p.style.setProperty("--line3-size", `${line3SizeInput.value}px`);
            p.style.setProperty("--line3-bold", line3Bold.checked ? '700' : '400');
            p.style.setProperty("--line3-color", line3ColorInput.value);
            p.style.setProperty("--box-title-size", `${boxTitleSizeInput.value}px`);
            p.style.setProperty("--box-title-bold", boxTitleBold.checked ? '700' : '400');
            p.style.setProperty("--box-title-color", boxTitleColorInput.value);
            p.style.setProperty("--button-color", buttonColorInput.value);
            p.style.setProperty("--button-text-color", buttonTextColorInput.value);
            p.style.setProperty("--button-radius", `${buttonRadiusInput.value}px`);
        });
    }

    chrome.storage.sync.get({
        theme: 'classic',
        defaultReviewMode: false,
        defaultDevMode: false,
        sidebarWidth: 340,
        sidebarFontSize: 13,
        sidebarFont: "'Inter', sans-serif",
        sidebarBgColor: "#212121",
        sidebarBoxColor: "#2e2e2e",
        headerFontSize: 14,
        headerBold: true,
        headerBgColor: "#c6c6c6",
        headerTextColor: "#000000",
        line1Size: 13,
        line1Bold: false,
        line1Color: "#ffffff",
        line2Size: 13,
        line2Bold: false,
        line2Color: "#ffffff",
        line3Size: 13,
        line3Bold: false,
        line3Color: "#ffffff",
        boxTitleSize: 16,
        boxTitleBold: true,
        boxTitleColor: "#ffffff",
        buttonColor: "#333333",
        buttonTextColor: "#ffffff",
        buttonRadius: 6,
        iconSet: 'default',
        txsosUser: "",
        txsosPass: ""
    }, (opts) => {
        themeSelect.value = opts.theme || 'classic';
        reviewBox.checked = Boolean(opts.defaultReviewMode);
        devBox.checked = Boolean(opts.defaultDevMode);
        widthInput.value = parseInt(opts.sidebarWidth, 10) || 340;
        fontSizeSelect.value = String(opts.sidebarFontSize || 13);
        fontSelect.value = opts.sidebarFont || "'Inter', sans-serif";
        bgColorInput.value = opts.sidebarBgColor || "#212121";
        boxColorInput.value = opts.sidebarBoxColor || "#2e2e2e";
        headerFontSizeInput.value = parseInt(opts.headerFontSize,10) || 14;
        headerBold.checked = Boolean(opts.headerBold);
        headerBgColorInput.value = opts.headerBgColor || '#c6c6c6';
        headerTextColorInput.value = opts.headerTextColor || '#000000';
        line1SizeInput.value = parseInt(opts.line1Size,10) || 13;
        line1Bold.checked = Boolean(opts.line1Bold);
        line1ColorInput.value = opts.line1Color || '#ffffff';
        line2SizeInput.value = parseInt(opts.line2Size,10) || 13;
        line2Bold.checked = Boolean(opts.line2Bold);
        line2ColorInput.value = opts.line2Color || '#ffffff';
        line3SizeInput.value = parseInt(opts.line3Size,10) || 13;
        line3Bold.checked = Boolean(opts.line3Bold);
        line3ColorInput.value = opts.line3Color || '#ffffff';
        boxTitleSizeInput.value = parseInt(opts.boxTitleSize,10) || 16;
        boxTitleBold.checked = Boolean(opts.boxTitleBold);
        boxTitleColorInput.value = opts.boxTitleColor || '#ffffff';
        buttonColorInput.value = opts.buttonColor || '#333333';
        buttonTextColorInput.value = opts.buttonTextColor || '#ffffff';
        buttonRadiusInput.value = parseInt(opts.buttonRadius,10) || 6;
        iconSetSelect.value = opts.iconSet || 'default';
        userInput.value = opts.txsosUser || "";
        passInput.value = opts.txsosPass || "";
        toggleCustom();
        updatePreview();
    });

    function applyTheme(theme) {
        if (theme === 'classic') {
            widthInput.value = 340;
            fontSizeSelect.value = '13';
            fontSelect.value = "'Inter', sans-serif";
            bgColorInput.value = '#212121';
            boxColorInput.value = '#2e2e2e';
            headerBgColorInput.value = '#c6c6c6';
            headerTextColorInput.value = '#000000';
            headerFontSizeInput.value = 14;
            headerBold.checked = true;
            line1SizeInput.value = 13;
            line1Bold.checked = false;
            line1ColorInput.value = '#ffffff';
            line2SizeInput.value = 13;
            line2Bold.checked = false;
            line2ColorInput.value = '#ffffff';
            line3SizeInput.value = 13;
            line3Bold.checked = false;
            line3ColorInput.value = '#ffffff';
            boxTitleSizeInput.value = 16;
            boxTitleBold.checked = true;
            boxTitleColorInput.value = '#ffffff';
            buttonColorInput.value = '#333333';
            buttonTextColorInput.value = '#ffffff';
            buttonRadiusInput.value = 6;
            iconSetSelect.value = 'default';
        } else if (theme === 'light') {
            widthInput.value = 340;
            fontSizeSelect.value = '13';
            fontSelect.value = "'Inter', sans-serif";
            bgColorInput.value = '#ffffff';
            boxColorInput.value = '#f4f4f4';
            headerBgColorInput.value = '#e0e0e0';
            headerTextColorInput.value = '#000000';
            headerFontSizeInput.value = 14;
            headerBold.checked = true;
            line1SizeInput.value = 13;
            line1Bold.checked = false;
            line1ColorInput.value = '#000000';
            line2SizeInput.value = 13;
            line2Bold.checked = false;
            line2ColorInput.value = '#000000';
            line3SizeInput.value = 13;
            line3Bold.checked = false;
            line3ColorInput.value = '#000000';
            boxTitleSizeInput.value = 16;
            boxTitleBold.checked = true;
            boxTitleColorInput.value = '#000000';
            buttonColorInput.value = '#005a9c';
            buttonTextColorInput.value = '#ffffff';
            buttonRadiusInput.value = 6;
            iconSetSelect.value = 'default';
        }
        toggleCustom();
        updatePreview();
    }

    function save() {
        const width = parseInt(widthInput.value, 10) || 340;
        const fontSize = parseInt(fontSizeSelect.value, 10) || 13;
        chrome.storage.sync.set({
            theme: themeSelect.value,
            defaultReviewMode: reviewBox.checked,
            defaultDevMode: devBox.checked,
            sidebarWidth: width,
            sidebarFontSize: fontSize,
            sidebarFont: fontSelect.value,
            sidebarBgColor: bgColorInput.value,
            sidebarBoxColor: boxColorInput.value,
            headerBgColor: headerBgColorInput.value,
            headerTextColor: headerTextColorInput.value,
            headerFontSize: parseInt(headerFontSizeInput.value,10) || 14,
            headerBold: headerBold.checked,
            line1Size: parseInt(line1SizeInput.value,10) || 13,
            line1Bold: line1Bold.checked,
            line1Color: line1ColorInput.value,
            line2Size: parseInt(line2SizeInput.value,10) || 13,
            line2Bold: line2Bold.checked,
            line2Color: line2ColorInput.value,
            line3Size: parseInt(line3SizeInput.value,10) || 13,
            line3Bold: line3Bold.checked,
            line3Color: line3ColorInput.value,
            boxTitleSize: parseInt(boxTitleSizeInput.value,10) || 16,
            boxTitleBold: boxTitleBold.checked,
            boxTitleColor: boxTitleColorInput.value,
            buttonColor: buttonColorInput.value,
            buttonTextColor: buttonTextColorInput.value,
            buttonRadius: parseInt(buttonRadiusInput.value,10) || 6,
            iconSet: iconSetSelect.value,
            txsosUser: userInput.value,
            txsosPass: passInput.value,
            fennecReviewMode: reviewBox.checked,
            fennecDevMode: devBox.checked
        });
        chrome.storage.local.set({ fennecReviewMode: reviewBox.checked, fennecDevMode: devBox.checked });
    }

    [widthInput, fontSizeSelect, fontSelect, bgColorInput, boxColorInput,
     headerFontSizeInput, headerBgColorInput, headerTextColorInput,
     line1SizeInput, line1ColorInput, line2SizeInput, line2ColorInput,
     line3SizeInput, line3ColorInput, boxTitleSizeInput, boxTitleColorInput,
     buttonColorInput, buttonTextColorInput, buttonRadiusInput].forEach(el => el.addEventListener("input", updatePreview));
    [headerBold, line1Bold, line2Bold, line3Bold, boxTitleBold].forEach(el => el.addEventListener('change', updatePreview));
    themeSelect.addEventListener('change', () => applyTheme(themeSelect.value));
    iconSetSelect.addEventListener('change', updatePreview);
    saveBtn.addEventListener("click", () => { save(); updatePreview(); });
});
