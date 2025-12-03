const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { Wallet } = require("ethers");
const { generateSiweMessage } = require("./utils");
const fs = require("fs");
const config = require("./config");

puppeteer.use(StealthPlugin());

const getExecutablePath = () => {
  const paths = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
};

class BrowserSession {
  constructor() {
    this.browser = null;
    this.page = null;
    this.userId = null;
    this.authToken = null;
  }

  async init(privateKey) {
    const wallet = new Wallet(privateKey);
    const execPath = getExecutablePath();

    this.browser = await puppeteer.launch({
      headless: "new",
      executablePath: execPath || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
    });

    this.page = await this.browser.newPage();

    // 1. Visit Home
    await this.page.goto("https://camphaven.xyz/", {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // 2. CSRF
    const csrfToken = await this.page.evaluate(async (url) => {
      const res = await fetch(`${url}/auth/csrf`);
      const data = await res.json();
      return data.csrfToken;
    }, config.API_URL);

    if (!csrfToken) throw new Error("No CSRF Token");

    // 3. Sign
    const message = generateSiweMessage(wallet.address, csrfToken);
    const signature = await wallet.signMessage(message);

    // 4. Login
    await this.page.evaluate(
      async (url, msg, sig, token) => {
        const formData = new URLSearchParams();
        formData.append("message", msg);
        formData.append("redirect", "false");
        formData.append("signature", sig);
        formData.append("csrfToken", token);
        formData.append("callbackUrl", "https://camphaven.xyz/home");

        await fetch(`${url}/auth/callback/credentials`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData,
        });
      },
      config.API_URL,
      message,
      signature,
      csrfToken
    );

    // 5. Get Session Info (Capture the Token!)
    const sessionData = await this.page.evaluate(async (url) => {
      const res = await fetch(`${url}/auth/session`);
      return await res.json();
    }, config.API_URL);

    if (!sessionData?.user) throw new Error("Login failed (No session)");

    this.userId = sessionData.user.id;
    this.authToken = sessionData.token;

    return this.userId;
  }

  async executeGQL(operationName, query, variables = {}) {
    if (!this.page) throw new Error("Browser not initialized");

    // Pass the token into the browser context
    return await this.page.evaluate(
      async (gqlUrl, token, opName, q, vars) => {
        try {
          const res = await fetch(gqlUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              operationName: opName,
              query: q,
              variables: vars,
            }),
          });
          const json = await res.json();
          if (json.errors) return { error: json.errors[0].message };
          return json.data;
        } catch (err) {
          return { error: err.message };
        }
      },
      config.GQL_URL,
      this.authToken,
      operationName,
      query,
      variables
    );
  }

  async close() {
    if (this.browser) await this.browser.close();
  }
}

module.exports = BrowserSession;
