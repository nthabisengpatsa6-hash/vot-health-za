const {defaultDb} = require("./admin");
const {sastDay} = require("./noteLimit");
const ACCOUNT_LIMIT = 20, APP_LIMIT = 200;

async function reserveDraft(uid, {db = defaultDb(), now = new Date()} = {}) {
  const account = db.collection("draftUsage").doc(`user-${uid}`), app = db.collection("draftUsage").doc("app"), day = sastDay(now);
  return db.runTransaction(async (transaction) => {
    const accountSnap = await transaction.get(account), appSnap = await transaction.get(app);
    const count = (snap) => snap.exists && snap.data().day === day ? snap.data().count : 0;
    const accountCount = count(accountSnap), appCount = count(appSnap);
    if (appCount >= APP_LIMIT) return {allowed:false,reason:"app-cap"};
    if (accountCount >= ACCOUNT_LIMIT) return {allowed:false,reason:"account-cap"};
    transaction.set(account,{day,count:accountCount+1});
    transaction.set(app,{day,count:appCount+1});
    return {allowed:true};
  });
}
module.exports = {reserveDraft,ACCOUNT_LIMIT,APP_LIMIT};
