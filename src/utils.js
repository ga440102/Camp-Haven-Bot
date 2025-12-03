const chalk = require("chalk");
const { DateTime } = require("luxon");

const getTimestamp = () => {
  return chalk.gray(`[${DateTime.now().toFormat("HH:mm:ss")}]`);
};

const log = {
  info: (msg) =>
    console.log(`${getTimestamp()} ${chalk.cyan("ℹ")} ${chalk.blue(msg)}`),
  success: (msg) =>
    console.log(`${getTimestamp()} ${chalk.green("✔")} ${chalk.green(msg)}`),
  warning: (msg) =>
    console.log(`${getTimestamp()} ${chalk.yellow("⚠")} ${chalk.yellow(msg)}`),
  error: (msg) =>
    console.log(`${getTimestamp()} ${chalk.red("✖")} ${chalk.red(msg)}`),
  step: (msg) =>
    console.log(
      `${getTimestamp()} ${chalk.magenta("➜")} ${chalk.magenta(msg)}`
    ),
  header: (msg) => console.log(`\n${chalk.bold.underline.white(msg)}\n`),
};

const randomDelay = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const generateSiweMessage = (address, csrfToken) => {
  // Standard ISO string matches the server requirement
  const issuedAt = new Date().toISOString();

  return `camphaven.xyz wants you to sign in with your Ethereum account:
${address}

Please sign with your account

URI: https://camphaven.xyz
Version: 1
Chain ID: 1
Nonce: ${csrfToken}
Issued At: ${issuedAt}
Resources:
- connector://io.rabby`;
};

module.exports = { log, randomDelay, generateSiweMessage };
