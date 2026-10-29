// Simulated cards against the real card rules, in the throwaway Firestore
// emulator under the local-only "demo-fola" project (npm run test:rules).
// firestore.rules isn't changed or loosened. A simulated card has a live
// card's content: with source and createdAt set as a live save sets them,
// every card of a run is accepted, and source "simulation" alone is enough
// for the rules to refuse one. Setup: the cards create rule also reads the
// reporter's profile (the reporter fields must match it), so each made-up
// reporter gets a profile, written with the rules off. Nothing else is
// needed: the daily note limit lives in processNote, not in the rules.
import { readFileSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, serverTimestamp, setDoc, setLogLevel, Timestamp, writeBatch } from "firebase/firestore";
import { createRun } from "../../src/sim/engine.js";
import { REPORTERS } from "../../src/sim/reporters.js";

const RULES = readFileSync(process.env.RULES_FILE || new URL("../../firestore.rules", import.meta.url), "utf8");
const EARLIER = Timestamp.fromDate(new Date("2026-10-01T08:00:00Z"));
// Seed 1's water run: background, seeded cluster and red herring, history included.
const run = createRun({ seed: 1, scenario: "water" });
const RECORDS = run.cardsUpTo(run.lastDay);
const BATCH_SIZE = 400;

setLogLevel("error");

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({ projectId: "demo-fola", firestore: { rules: RULES } });
});

after(() => testEnv.cleanup());

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    for (const { uid, role, facilityType, area } of REPORTERS) {
      await setDoc(doc(context.firestore(), "users", uid), { role, facilityType, area, createdAt: EARLIER, updatedAt: EARLIER });
    }
  });
});

const dbAs = (uid) => testEnv.authenticatedContext(uid).firestore();
const recordsBy = (uid) => RECORDS.filter((record) => record.card.reporterUid === uid);
// What a live save sets: source "voice" and the server's time.
const asLiveSave = (card) => ({ ...card, source: "voice", createdAt: serverTimestamp() });
// One card from each reporter, to check each refusal on its own.
const firstCards = () => REPORTERS.map(({ uid }) => recordsBy(uid)[0]).filter(Boolean);

test("every card of seed 1's water run passes the card rules, with only source and createdAt set as a live save sets them", async () => {
  let saved = 0;
  for (const { uid } of REPORTERS) {
    const records = recordsBy(uid);
    for (let start = 0; start < records.length; start += BATCH_SIZE) {
      const db = dbAs(uid);
      const batch = writeBatch(db);
      for (const { id, card } of records.slice(start, start + BATCH_SIZE)) batch.set(doc(db, "cards", id), asLiveSave(card));
      await assertSucceeds(batch.commit());
      saved += Math.min(BATCH_SIZE, records.length - start);
    }
  }
  if (saved !== RECORDS.length) throw new Error(`${saved} of ${RECORDS.length} cards were checked`);
});

test("source \"simulation\" alone is refused, even with the server's time", async () => {
  for (const { id, card } of firstCards()) {
    const db = dbAs(card.reporterUid);
    await assertFails(setDoc(doc(db, "cards", id), { ...card, createdAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(db, "cards", id), asLiveSave(card)));
  }
});

test("a createdAt in milliseconds alone is refused, even with source \"voice\"", async () => {
  for (const { id, card } of firstCards()) {
    const db = dbAs(card.reporterUid);
    await assertFails(setDoc(doc(db, "cards", id), { ...card, source: "voice" }));
    await assertSucceeds(setDoc(doc(db, "cards", id), asLiveSave(card)));
  }
});

test("a simulated card exactly as the engine makes it is refused", async () => {
  for (const { id, card } of firstCards()) await assertFails(setDoc(doc(dbAs(card.reporterUid), "cards", id), card));
});
