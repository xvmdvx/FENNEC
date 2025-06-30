const puppeteer = require("puppeteer");
const ADDRESS = {
    street: "17350 State Highway 249 Ste 220",
    city: "Houston",
    state: "TX",
    zip: "77064",
    country: "US"
};

async function waitAndType(page, selector, text) {
    await page.waitForSelector(selector, { visible: true });
    await page.focus(selector);
    await page.evaluate(() => document.activeElement.value = "");
    await page.type(selector, text);
}

async function clickAndWait(page, selector) {
    await Promise.all([
        page.waitForNavigation({ waitUntil: "domcontentloaded" }),
        page.click(selector)
    ]);
}

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const user = process.env.TXSOS_USER || "username";
    const pass = process.env.TXSOS_PASS || "password";
    const company = process.env.TX_COMPANY || "My Company LLC";
    const organizer = "LOVETTE DOBSON";

    console.log("[PUPPETEER] Starting TX SOS automation");
    await page.goto("https://direct.sos.state.tx.us/acct/acct-login.asp");
    await waitAndType(page, "input[name='client_id']", user);
    await waitAndType(page, "input[name='web_password']", pass);
    await clickAndWait(page, "input[name='submit'][value='Submit']");

    await page.select("select[name='payment_type_id']", "5");
    await clickAndWait(page, "input[name='Submit'][value='Continue']");

    await clickAndWait(page, "a[href*='home-corp.asp']");

    await page.select("select[name=':Ncorp_type_id']", "6");
    await clickAndWait(page, "input[name='submit'][value='File Document']");

    await page.select("select[name=':Nfiling_type_id']", "10601");
    await clickAndWait(page, "input[name='submit'][value='Continue']");

    await page.click("input[name=':Norg_ending'][value='0']");
    await waitAndType(page, "input[name=':Scorp_name']", company);
    await clickAndWait(page, "input[name='submit'][value='Continue']");

    await waitAndType(page, "input[name=':Smail_address']", ADDRESS.street);
    await waitAndType(page, "input[name=':Scity']", ADDRESS.city);
    await waitAndType(page, "input[name=':Sstate']", ADDRESS.state);
    await waitAndType(page, "input[name=':Szip']", ADDRESS.zip);
    await waitAndType(page, "input[name=':Scountry']", ADDRESS.country);
    await clickAndWait(page, "input[name='submit'][value='Continue']");

    // Registered agent information should be filled here
    // await waitAndType(page, "input[name=':Sra_name']", "RA NAME");
    // await clickAndWait(page, "input[name='submit'][value='Continue']");

    await page.click("input[value='2']");
    await clickAndWait(page, "input[name='submit'][value='Add Manager/Member']");

    await waitAndType(page, "input[name=':Smm_name']", organizer);
    await waitAndType(page, "input[name=':Smm_address']", ADDRESS.street);
    await waitAndType(page, "input[name=':Smm_city']", ADDRESS.city);
    await waitAndType(page, "input[name=':Smm_state']", ADDRESS.state);
    await waitAndType(page, "input[name=':Smm_zip']", ADDRESS.zip);
    await page.select("select[name=':Smm_country']", ADDRESS.country);
    await clickAndWait(page, "input[name='submit'][value='Update']");

    await clickAndWait(page, "input[name='submit'][value='Continue']");
    await clickAndWait(page, "input[name='submit'][value='Continue']");

    await waitAndType(page, "input[name=':Sorganizer_name']", organizer);
    await waitAndType(page, "input[name=':Sorganizer_address']", ADDRESS.street);
    await waitAndType(page, "input[name=':Sorganizer_city']", ADDRESS.city);
    await waitAndType(page, "input[name=':Sorganizer_state']", ADDRESS.state);
    await waitAndType(page, "input[name=':Sorganizer_zip']", ADDRESS.zip);
    await page.select("select[name=':Sorganizer_country']", ADDRESS.country);
    await clickAndWait(page, "input[name='submit'][value='Continue']");

    await waitAndType(page, "input[name=':Ssignature_name']", organizer);
    await clickAndWait(page, "input[name='submit'][value='Continue']");

    console.log("[PUPPETEER] Review and verify the information");

    await browser.close();
})();
