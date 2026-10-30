const {defaultDb} = require("./admin");
const {sastDay} = require("./noteLimit");

const ACCOUNT_LIMIT = 20;
const APP_LIMIT = 200;
const LIMIT_MESSAGE = "Today's live-ranking limit is reached. The saved ranking is still shown.";

// Both places are reserved together. A refusal changes neither counter;
// a provider failure never refunds a place that may already have cost money.
async function reserveRanking(uid, {db = defaultDb(), now = new Date()} = {}) {
  const account = db.collection("rankUsage").doc(`user-${uid}`);
  const app = db.collection("rankUsage").doc("app");
  const day = sastDay(now);
  return db.runTransaction(async (transaction) => {
    const accountSnap = await transaction.get(account);
    const appSnap = await transaction.get(app);
    const used = (snap) => snap.exists && snap.data().day === day ? snap.data().count : 0;
    const accountCount = used(accountSnap);
    const appCount = used(appSnap);
    if (accountCount >= ACCOUNT_LIMIT || appCount >= APP_LIMIT) return {allowed: false};
    transaction.set(account, {day, count: accountCount + 1});
    transaction.set(app, {day, count: appCount + 1});
    return {allowed: true};
  });
}

module.exports = {reserveRanking, ACCOUNT_LIMIT, APP_LIMIT, LIMIT_MESSAGE};
