const ora = require("ora");
const chalk = require("chalk");
const Table = require("cli-table3");
const config = require("./config");
const BrowserSession = require("./browser");
class CampHavenBot {
  constructor(privateKey, index) {
    this.privateKey = privateKey;
    this.index = index;
    this.session = new BrowserSession(); // Manage browser instance
    this.userId = null;
  }

  async login() {
    const spinner = ora(
      `Wallet #${this.index} Logging in (Browser Mode)...`
    ).start();
    try {
      this.userId = await this.session.init(this.privateKey);
      spinner.succeed(
        chalk.green(
          `Login Successful! (User ID: ${this.userId.substring(0, 8)}...)`
        )
      );
      return true;
    } catch (error) {
      spinner.fail(chalk.red(`Login Failed: ${error.message}`));
      await this.session.close();
      return false;
    }
  }

  async dailyCheckin() {
    const spinner = ora("Daily Check-in...").start();
    const mutation = `mutation upsertDailyCheckin($object: DailyCheckinInput!) { daily_checkin(point_source_data: $object) { id } }`;
    const variables = {
      object: {
        user_id: this.userId,
        client_season: config.CLIENT_SEASON,
        point_source_id: config.DAILY_CHECKIN_SOURCE_ID,
        status: "SUCCESS",
      },
    };

    // Run INSIDE browser
    const data = await this.session.executeGQL(
      "upsertDailyCheckin",
      mutation,
      variables
    );

    if (data?.daily_checkin) {
      spinner.succeed(chalk.green("Check-in Complete"));
    } else if (data?.error) {
      spinner.fail(`Check-in Error: ${data.error}`);
    } else {
      spinner.info("Check-in skipped (Likely already done)");
    }
  }

  async applyReferral(code) {
    const spinner = ora(`Applying Code: ${code}...`).start();
    const mutation = `mutation updateReferralCode($applyReferralCodeInput: ApplyReferralCodeInput!) { apply_referral_code(referral_code_data: $applyReferralCodeInput) { success } }`;
    const variables = {
      applyReferralCodeInput: { referral_code: code, user_id: this.userId },
    };

    const data = await this.session.executeGQL(
      "updateReferralCode",
      mutation,
      variables
    );

    if (data?.apply_referral_code?.success) {
      spinner.succeed(chalk.green("Referral Applied Successfully!"));
    } else {
      spinner.info("Referral skipped (Already set or invalid code)");
    }
  }

  async getStats() {
    const query = `query GetUserReferral($numberOfReferralsData: NumberOfReferralsInput!) { get_number_of_referrals(number_of_referrals_data: $numberOfReferralsData) { referral_code referral_count } }`;
    const variables = { numberOfReferralsData: { user_id: this.userId } };

    const data = await this.session.executeGQL(
      "GetUserReferral",
      query,
      variables
    );

    if (data?.get_number_of_referrals) {
      const stats = data.get_number_of_referrals;
      const table = new Table({
        head: [chalk.cyan("Metric"), chalk.cyan("Value")],
        colWidths: [20, 30],
      });
      table.push(
        ["Referral Code", chalk.yellow(stats.referral_code)],
        ["Referrals", chalk.green(stats.referral_count)]
      );
      console.log(table.toString());
    }
  }

  async disconnect() {
    await this.session.close();
  }
}

module.exports = CampHavenBot;
