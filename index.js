const fs = require('fs');
const path = require('path');
const inquirer = require("inquirer");
const figlet = require("figlet");
const boxen = require("boxen");
const chalk = require("chalk");
const gradient = require("gradient-string");
const CampHavenBot = require("./src/bot");
const { log, randomDelay } = require("./src/utils");
const config = require("./src/config");
const cron = require('node-cron');

// 时间格式化辅助函数
const formatDuration = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}秒`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `${minutes}分${seconds}秒`;
};

// -----------------------------------------
// 工具函数
// -----------------------------------------
const getPrivateKeys = () => {
  try {
    const walletsPath = path.resolve(__dirname, 'wallets.txt');
    if (!fs.existsSync(walletsPath)) {
      console.log(chalk.yellow('➜ 未找到 wallets.txt 文件，正在创建...'));
      fs.writeFileSync(walletsPath, '');
      return [];
    }
    
    const content = fs.readFileSync(walletsPath, 'utf8');
    const keys = content
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.startsWith('0x') && k.length >= 64);
      
    if (keys.length === 0) {
      console.log(chalk.yellow('➜ wallets.txt 中没有找到有效的私钥'));
      console.log(chalk.yellow('➜ 请每行添加一个以 0x 开头的私钥'));
    }
    
    return keys;
  } catch (error) {
    console.error('读取钱包文件出错:', error.message);
    return [];
  }
};

// -----------------------------------------
// UI 界面
// -----------------------------------------
const showBanner = () => {
  console.clear();
  const title = figlet.textSync("CAMP HAVEN", {
    font: "Standard",
    horizontalLayout: "default",
    verticalLayout: "default",
    width: 100,
    whitespaceBreak: true,
  });

  console.log(gradient.pastel.multiline(title));
  console.log(
    boxen(chalk.cyan("自动化工具 | 浏览器模式 | 防检测 | 时间统计"), {
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

// 显示下次执行时间
function showNextRunTime(task) {
  let nextRun;
  if (typeof task.nextDate === 'function') {
    nextRun = new Date(task.nextDate().toISOString());
  } else if (task.next) {
    nextRun = new Date(task.next().toISOString());
  } else {
    nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(8, 1, 0, 0);
  }
  
  console.log(chalk.green(`\n✅ 自动签到任务已设置完成！`));
  console.log(chalk.yellow(`⏰ 下次执行时间: ${nextRun.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`));
  console.log(chalk.yellow("按 Ctrl+C 可退出程序。\n"));
}

// -----------------------------------------
// 任务执行
// -----------------------------------------
const executeTasks = async (action, refCode = null) => {
  const startTime = Date.now();
  const keys = getPrivateKeys();
  let successCount = 0;
  let failCount = 0;

  if (keys.length === 0) {
    log.error("未找到私钥！");
    console.log(chalk.yellow("➜ 请在 wallets.txt 文件中添加私钥，每行一个"));
    return false;
  }

  console.log(`${chalk.green("✔")} 正在处理 ${chalk.bold.white(keys.length)} 个钱包...\n`);

  for (let i = 0; i < keys.length; i++) {
    const walletNum = i + 1;
    const total = keys.length;
    const walletStartTime = Date.now();

    console.log(gradient.cristal(`>>> 正在处理钱包 ${walletNum} / ${total} <<<`));
    const bot = new CampHavenBot(keys[i], walletNum);
    const isLoggedIn = await bot.login();

    if (isLoggedIn) {
      try {
        await new Promise((r) => setTimeout(r, 1000));

        if (action === "all") {
          if (refCode) {
            console.log(chalk.blue("正在应用推荐码..."));
            const refStart = Date.now();
            await bot.applyReferral(refCode);
            console.log(chalk.green(`✓ 推荐码应用完成 (${formatDuration(Date.now() - refStart)})`));
            await new Promise((r) => setTimeout(r, randomDelay(1000, 3000)));
          }
          console.log(chalk.blue("正在执行每日签到..."));
          const checkinStart = Date.now();
          await bot.dailyCheckin();
          console.log(chalk.green(`✓ 签到完成 (${formatDuration(Date.now() - checkinStart)})`));
        } 
        else if (action === "daily") {
          console.log(chalk.blue("正在执行每日签到..."));
          const checkinStart = Date.now();
          await bot.dailyCheckin();
          console.log(chalk.green(`✓ 签到完成 (${formatDuration(Date.now() - checkinStart)})`));
        } 
        else if (action === "referral" && refCode) {
          console.log(chalk.blue("正在应用推荐码..."));
          const refStart = Date.now();
          await bot.applyReferral(refCode);
          console.log(chalk.green(`✓ 推荐码应用完成 (${formatDuration(Date.now() - refStart)})`));
        } 
        else if (action === "stats") {
          console.log(chalk.blue("正在获取钱包状态..."));
          const statsStart = Date.now();
          await bot.getStats();
          console.log(chalk.green(`✓ 状态获取完成 (${formatDuration(Date.now() - statsStart)})`));
        }

        successCount++;
      } catch (err) {
        failCount++;
        log.error(`任务执行出错: ${err.message}`);
      } finally {
        await bot.disconnect();
      }
    } else {
      failCount++;
    }

    const walletTime = Date.now() - walletStartTime;
    console.log(chalk.gray(`↳ 钱包 ${walletNum} 处理完成，耗时: ${formatDuration(walletTime)}`));

    if (i < keys.length - 1) {
      const waitTime = randomDelay(...config.DELAYS.BETWEEN_WALLETS);
      const seconds = Math.floor(waitTime / 1000);
      console.log(chalk.gray(`\n等待 ${seconds} 秒后处理下一个钱包...\n`));
      await new Promise((r) => setTimeout(r, waitTime));
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(chalk.green(`\n✅ 所有任务完成！总耗时: ${formatDuration(totalTime)}`));
  console.log(chalk.cyan(`📊 统计: ${successCount} 个成功, ${failCount} 个失败`));
  
  return successCount > 0;
};

// -----------------------------------------
// 主程序
// -----------------------------------------
const main = async () => {
  showBanner();

  // 自动模式
  if (process.argv.includes('--auto')) {
    console.log(chalk.yellow("自动模式: 正在执行每日签到..."));
    await executeTasks('daily');
    return;
  }

  const keys = getPrivateKeys();
  if (keys.length === 0) {
    log.error("未找到私钥！");
    console.log(chalk.yellow("➜ 请在 wallets.txt 文件中添加私钥，每行一个"));
    process.exit(1);
  }

  console.log(`${chalk.green("✔")} 已加载 ${chalk.bold.white(keys.length)} 个钱包。\n`);

  // 主菜单
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "请选择要执行的操作：",
      pageSize: 10,
      choices: [
        new inquirer.Separator(chalk.gray("--- 每日任务 ---")),
        { 
          name: chalk.bold.cyan("➜ 自动每日签到"), 
          value: "auto_daily",
          description: "设置自动每日签到（每天上午8:01）"
        },
        { 
          name: chalk.bold.cyan("➜ 使用推荐码"), 
          value: "referral",
          description: "输入推荐码获取奖励"
        },
        new inquirer.Separator(chalk.gray("--- 信息查询 ---")),
        {
          name: chalk.bold.blue("➜ 查看钱包状态"),
          value: "stats",
          description: "查看推荐码和统计信息"
        },
        new inquirer.Separator(chalk.gray("--- 自动化 ---")),
        { 
          name: chalk.bold.green("➜ 执行所有任务"), 
          value: "all",
          description: "按顺序执行所有可用任务"
        },
        new inquirer.Separator(chalk.gray("--- 其他 ---")),
        { 
          name: chalk.red("✖ 退出程序"), 
          value: "exit" 
        },
      ],
    },
  ]);

  if (action === "exit") {
    console.log(chalk.gray("再见！"));
    process.exit(0);
  }

  if (action === "auto_daily") {
    console.log(chalk.green("\n正在设置自动每日签到..."));
    console.log(chalk.cyan("\n正在执行首次签到..."));
    await executeTasks('daily');
    
    // 设置定时任务（每天上午8:01执行）
    console.log(chalk.cyan("\n正在设置定时任务..."));
    const task = cron.schedule('1 8 * * *', async () => {
      console.log(chalk.cyan(`\n[${new Date().toLocaleString()}] 正在执行自动签到...`));
      await executeTasks('daily');
    }, {
      timezone: "Asia/Shanghai",
      scheduled: true,
    });

    showNextRunTime(task);
    return new Promise(() => {});
  }

  let refCode = null;
  if (action === "referral" || action === "all") {
    const { code } = await inquirer.prompt([
      {
        type: "input",
        name: "code",
        message: "请输入推荐码:",
        validate: (i) => (i.length > 0 ? true : "推荐码不能为空"),
      },
    ]);
    refCode = code;
  }

  await executeTasks(action, refCode);
};

// 错误处理
process.on('unhandledRejection', (err) => {
  console.error('未处理的错误:', err);
  process.exit(1);
});

// 启动程序
main().catch(console.error);
