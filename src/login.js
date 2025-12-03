const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { Wallet } = require("ethers");
const { generateSiweMessage } = require("./utils");

puppeteer.use(StealthPlugin());

/**
 * Launches a headless browser to perform login and extract the session.
 */
async function getSessionViaBrowser(privateKey) {
  const wallet = new Wallet(privateKey);
  let browser = null;

  try {
    // Launch Chrome
    browser = await puppeteer.launch({
      headless: "new", // Run in background.
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
    });

    const page = await browser.newPage();

    // 1. Visit Homepage to "warm up" the security tokens
    await page.goto("https://camphaven.xyz/", {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // 2. Fetch CSRF Token (Execute inside the browser page)
    const csrfToken = await page.evaluate(async () => {
      const res = await fetch("https://camphaven.xyz/api/auth/csrf");
      const data = await res.json();
      return data.csrfToken;
    });

    if (!csrfToken) throw new Error("Browser failed to find CSRF Token");

    // 3. Sign Message (Node.js side)
    const message = generateSiweMessage(wallet.address, csrfToken);
    const signature = await wallet.signMessage(message);

    // 4. Perform Login (Execute inside the browser page)
    const loginResult = await page.evaluate(
      async (msg, sig, token) => {
        const formData = new URLSearchParams();
        formData.append("message", msg);
        formData.append("redirect", "false");
        formData.append("signature", sig);
        formData.append("csrfToken", token);
        formData.append("callbackUrl", "https://camphaven.xyz/home");

        const res = await fetch(
          "https://camphaven.xyz/api/auth/callback/credentials",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData,
          }
        );

        return { status: res.status, url: res.url };
      },
      message,
      signature,
      csrfToken
    );

    // 5. Fetch Session Data (Execute inside the browser page)
    const sessionData = await page.evaluate(async () => {
      const res = await fetch("https://camphaven.xyz/api/auth/session");
      return await res.json();
    });

    if (!sessionData || !sessionData.user) {
      throw new Error("Browser Login failed: No session returned.");
    }

    // 6. Extract Cookies & User Agent
    const cookies = await page.cookies();
    const userAgent = await browser.userAgent();

    // Format cookies into a string header
    const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    return {
      userId: sessionData.user.id,
      authToken: sessionData.token,
      cookies: cookieString,
      userAgent: userAgent,
    };
  } catch (error) {
    throw new Error(`Browser Auth Error: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { getSessionViaBrowser };
