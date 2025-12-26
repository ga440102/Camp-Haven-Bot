# Camp Haven Bot

A professional, multi-wallet automation tool for **Camp Haven**. This bot uses a hybrid **Headless Browser (Puppeteer)** approach to bypass Cloudflare/Vercel firewall protections, enabling fully automated EVM logins and daily task execution.

![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg) ![Puppeteer](https://img.shields.io/badge/Puppeteer-Stealth-orange.svg)

## ✨ Features

- **🛡️ Firewall Bypass:** Uses a stealth headless browser to perform the TLS handshake and login, bypassing `403 Forbidden` and Cloudflare protections.
- **🔑 Multi-Wallet Support:** Handle unlimited wallets via a single `.env` file.
- **✍️ Auto-SIWE:** Automatically signs "Sign-In With Ethereum" messages using your private keys.
- **📅 Daily Tasks:**
  - Performs Daily Check-ins automatically.
  - Applies Referral Codes.
  - Fetches User Stats (Referral count, codes).
- **🎨 Beautiful CLI:** Interactive menu system with gradients, spinners, and formatted tables.
- **🚀 Memory Efficient:** Opens the browser _only_ for login/execution and closes it immediately after to save RAM.

---

## 🛠️ Prerequisites

Before you begin, ensure you have met the following requirements:

1.  **Node.js**: Version 16 or higher is recommended.
2.  **Google Chrome / Chromium**: The bot uses your system's installed browser to minimize download size and look authentic. Ensure Chrome or Chromium is installed.

---

## 📥 Installation

1.  **Clone the repository** (or download the files):

2.  **Install Dependencies**:

    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `wallets.txt` file in the root directory:

    ```bash
    touch wallets.txt
    ```

    Open `wallets.txt` and add your private keys (comma-separated, no spaces):

    ```ini
    PRIVATE_KEY_1
    PRIVATE_KEY_2
    PRIVATE_KEY_3
    ```

---

## 🚀 Usage

Run the bot using the start command:

```bash
npm start
```
