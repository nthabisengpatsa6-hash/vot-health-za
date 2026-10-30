const assert = require("node:assert/strict");
const {test} = require("node:test");
const {reserveRanking, ACCOUNT_LIMIT, APP_LIMIT} = require("../lib/rankLimit");

// Optimistic transactions: conflicting reads retry the whole callback;
// writes commit together. A non-transactional reservation fails contention.
function fakeDb(initial = {}) {
  const docs = new Map(Object.entries(initial));
  let version = 0;
  return {
    docs,
    collection: (name) => ({doc: (id) => ({path: `${name}/${id}`})}),
    async runTransaction(work) {
      for (;;) {
        const readVersion = version;
        const pending = new Map();
        const result = await work({
          get: async ({path}) => {
            const value = docs.get(path);
            return {exists: docs.has(path), data: () => value};
          },
          set: ({path}, value) => pending.set(path, value),
        });
        if (version !== readVersion) continue;
        for (const [path, value] of pending) docs.set(path, value);
        if (pending.size) version++;
        return result;
      }
    },
  };
}
const now = new Date("2026-10-30T10:00:00Z");
const today = (count) => ({day: "2026-10-30", count});

test("both counters store day and count only", async () => {
  const db = fakeDb();
  assert.deepEqual(await reserveRanking("a", {db, now}), {allowed: true});
  assert.deepEqual(db.docs.get("rankUsage/user-a"), today(1));
  assert.deepEqual(db.docs.get("rankUsage/app"), today(1));
});

test("20 per account and 200 app-wide, without partial reservations", async () => {
  assert.equal(ACCOUNT_LIMIT, 20); assert.equal(APP_LIMIT, 200);
  for (const initial of [
    {"rankUsage/user-a": today(20), "rankUsage/app": today(100)},
    {"rankUsage/user-a": today(5), "rankUsage/app": today(200)},
  ]) {
    const db = fakeDb(initial);
    assert.deepEqual(await reserveRanking("a", {db, now}), {allowed: false});
    assert.deepEqual(Object.fromEntries(db.docs), initial);
  }
});

test("counts reset at midnight SAST, not midnight UTC", async () => {
  const db = fakeDb({"rankUsage/user-a": today(20), "rankUsage/app": today(200)});
  assert.equal((await reserveRanking("a", {db, now: new Date("2026-10-30T21:59:59Z")})).allowed, false);
  assert.equal((await reserveRanking("a", {db, now: new Date("2026-10-30T22:00:00Z")})).allowed, true);
  for (const value of db.docs.values()) assert.deepEqual(value, {day: "2026-10-31", count: 1});
});

test("concurrent requests cannot exceed either last available place", async () => {
  for (const accountCap of [true, false]) {
    const db = fakeDb({"rankUsage/user-a": today(accountCap ? 19 : 0), "rankUsage/app": today(accountCap ? 100 : 199)});
    const replies = await Promise.all(Array.from({length: 12}, (_, i) => reserveRanking(accountCap ? "a" : `user-${i}`, {db, now})));
    assert.equal(replies.filter(({allowed}) => allowed).length, 1);
    assert.equal(db.docs.get("rankUsage/app").count, accountCap ? 101 : 200);
    if (accountCap) assert.equal(db.docs.get("rankUsage/user-a").count, 20);
  }
});
