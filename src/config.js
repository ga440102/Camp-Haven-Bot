module.exports = {
  BASE_URL: "https://camphaven.xyz",
  API_URL: "https://camphaven.xyz/api",
  GQL_URL: "https://gql3.absinthe.network/v1/graphql",

  CLIENT_SEASON: "d2ct-npic",
  DAILY_CHECKIN_SOURCE_ID: "09b99963-757e-46fa-8b79-95d1cdbed7d5",

  // EXACT Chrome Headers (Windows 10)
  HEADERS: {
    Host: "camphaven.xyz",
    Connection: "keep-alive",
    "sec-ch-ua":
      '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "sec-ch-ua-mobile": "?0",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "sec-ch-ua-platform": '"Windows"',
    Origin: "https://camphaven.xyz",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    Referer: "https://camphaven.xyz/",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
  },

  DELAYS: {
    BETWEEN_WALLETS: [5000, 10000],
    BETWEEN_ACTIONS: [2000, 5000],
    AFTER_LOGIN: [2000, 4000],
  },
};
