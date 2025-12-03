require("dotenv").config();
const inquirer = require("inquirer");
const figlet = require("figlet");
const boxen = require("boxen");
const chalk = require("chalk");
const gradient = require("gradient-string");
const CampHavenBot = require("./src/bot");
const { log, randomDelay } = require("./src/utils");
const config = require("./src/config");

// -----------------------------------------
// UI & Visuals
// -----------------------------------------

const showBanner = () => {
  console.clear();

  // big text
  const title = figlet.textSync("CAMP HAVEN", {
    font: "Standard",
    horizontalLayout: "default",
    verticalLayout: "default",
    width: 100,
    whitespaceBreak: true,
  });

  // gradient
  console.log(gradient.pastel.multiline(title));

  // Subtitle box
  console.log(
    boxen(chalk.cyan("Automation Tool | Browser Mode | Anti-Detect"), {
      padding: 1,
      margin: 0,
      borderStyle: "classic",
      borderColor: "cyan",
      float: "left",
    })
  );

  console.log(
    chalk.gray("\n──────────────────────────────────────────────────────────\n")
  );
};

const getPrivateKeys = () => {
  const keys = process.env.PRIVATE_KEYS;
  if (!keys) return [];
  return keys
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
};

// -----------------------------------------
// Main Application
// -----------------------------------------

const main = async () => {
  showBanner();

  // 1. Validate Keys
  const keys = getPrivateKeys();
  if (keys.length === 0) {
    log.error("No keys found!");
    console.log(chalk.yellow("➜ Open .env and add: PRIVATE_KEYS=0x123..."));
    process.exit(1);
  }

  console.log(
    `${chalk.green("✔")} Loaded ${chalk.bold.white(
      keys.length
    )} wallets ready for action.\n`
  );

  // 2. Main Menu
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do today?",
      pageSize: 10,
      choices: [
        new inquirer.Separator(chalk.gray("--- Daily Tasks ---")),
        { name: chalk.bold.cyan("➜ Daily Check-in"), value: "daily" },
        { name: chalk.bold.cyan("➜ Apply Referral Code"), value: "referral" },

        new inquirer.Separator(chalk.gray("--- Information ---")),
        {
          name: chalk.bold.blue("➜ Check Stats (Ref Code & Count)"),
          value: "stats",
        },

        new inquirer.Separator(chalk.gray("--- Automation ---")),
        { name: chalk.bold.green("➜ Run ALL Tasks Sequence"), value: "all" },

        new inquirer.Separator(chalk.gray("--- Other ---")),
        { name: chalk.red("✖ Exit"), value: "exit" },
      ],
    },
  ]);

  if (action === "exit") {
    console.log(chalk.gray("See you next time!"));
    process.exit(0);
  }

  // 3. Referral Code Input (if needed)
  let refCode = null;
  if (action === "referral" || action === "all") {
    const { code } = await inquirer.prompt([
      {
        type: "input",
        name: "code",
        message: "Enter the Referral Code to apply:",
        validate: (i) => (i.length > 0 ? true : "Code cannot be empty"),
      },
    ]);
    refCode = code;
  }

  console.log(""); // spacer

  // 4. Execution Loop
  for (let i = 0; i < keys.length; i++) {
    const walletNum = i + 1;
    const total = keys.length;

    // Visual Header for each wallet
    console.log(
      gradient.cristal(`>>> Processing Wallet ${walletNum} / ${total} <<<`)
    );

    const bot = new CampHavenBot(keys[i], walletNum);

    // A. Login (Launches Browser)
    const isLoggedIn = await bot.login();

    if (isLoggedIn) {
      try {
        // Pause slightly to let page stabilize
        await new Promise((r) => setTimeout(r, 1000));

        // B. Perform Actions
        if (action === "daily" || action === "all") {
          await bot.dailyCheckin();
          if (action === "all")
            await new Promise((r) => setTimeout(r, randomDelay(1000, 3000)));
        }

        if ((action === "referral" || action === "all") && refCode) {
          await bot.applyReferral(refCode);
          if (action === "all")
            await new Promise((r) => setTimeout(r, randomDelay(1000, 3000)));
        }

        if (action === "stats" || action === "all") {
          await bot.getStats();
        }
      } catch (err) {
        log.error(`Task Error: ${err.message}`);
      } finally {
        // C. CRITICAL: Close Browser for this wallet
        await bot.disconnect();
      }
    }

    // D. Wait before next wallet (but not after the last one)
    if (i < keys.length - 1) {
      const waitTime = randomDelay(...config.DELAYS.BETWEEN_WALLETS);
      const seconds = Math.floor(waitTime / 1000);

      console.log(chalk.gray(`\nWaiting ${seconds}s for safety...\n`));
      await new Promise((r) => setTimeout(r, waitTime));
    }
  }

  // 5. Final Banner
  console.log("");
  console.log(
    boxen(gradient.pastel("ALL TASKS COMPLETED"), {
      padding: 1,
      borderStyle: "round",
      borderColor: "green",
      float: "center",
    })
  );
};

main();
