// Firestore rules for cards/{cardId}. Run with `npm run test:rules`, which
// starts a throwaway Firestore emulator under the local-only "demo-fola"
// project. The allowed values come from the app's own lists, so the copies
// in firestore.rules can't drift from them unnoticed. RULES_FILE lets the
// break-the-rule check run these tests against a deliberately broken copy.
import { readdirSync, readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, setLogLevel, Timestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { AGE_GROUPS, COMPARED_WITH_USUAL, EXPOSURE_TYPES, OBSERVATIONS, ONSETS, SYMPTOM_GROUPS } from "../../src/config/cardOptions.js";
import { draftFromCard, toCardDoc } from "../../src/lib/cardDraft.js";

const places = JSON.parse(readFileSync(new URL("../../functions/data/places.json", import.meta.url), "utf8"));
const AREA_NAMES = places.areas.map((area) => area.name);
const RULES = readFileSync(process.env.RULES_FILE || new URL("../../firestore.rules", import.meta.url), "utf8");

const OWNER = "user-a";
const OTHER = "user-b";
const NO_PROFILE = "user-c";
const EARLIER = Timestamp.fromDate(new Date("2026-10-01T08:00:00Z"));
const PROFILES = {
  [OWNER]: { role: "nurse", facilityType: "clinic", area: "Thaga Park" },
  [OTHER]: { role: "doctor", facilityType: "hospital", area: "Lebone Gardens" },
};

setLogLevel("error");

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({ projectId: "demo-fola", firestore: { rules: RULES } });
});

after(() => testEnv.cleanup());

// Every test starts with two profiles and no cards.
beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    for (const [uid, profile] of Object.entries(PROFILES)) {
      await setDoc(doc(context.firestore(), "users", uid), { ...profile, createdAt: EARLIER, updatedAt: EARLIER });
    }
  });
});

function dbAs(uid) {
  const context = uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext();
  return context.firestore();
}

function cardRef(db, id = "card-1") {
  return doc(db, "cards", id);
}

// A valid card from uid, matching their profile.
function newCard(overrides = {}, uid = OWNER) {
  const profile = PROFILES[uid] || PROFILES[OWNER];
  return {
    reporterUid: uid,
    reporterRole: profile.role,
    reporterFacilityType: profile.facilityType,
    reporterArea: profile.area,
    symptomGroup: "diarrhoea_vomiting",
    unusualDescription: null,
    symptomsInWords: "watery diarrhoea",
    caseCount: 4,
    comparedWithUsual: "more",
    ageGroup: "under_5",
    area: "Thaga Park",
    onset: "today",
    exposure: { types: ["water"], words: "the tap water smelled funny" },
    observations: { moreSevere: false, notResponding: false, unusualSymptoms: false, shortOfSupplies: false, suppliesNote: null },
    notifiableConditionMentioned: null,
    source: "voice",
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

// An existing card, written past the rules as if saved earlier.
function seedCard(id, uid = OWNER) {
  return testEnv.withSecurityRulesDisabled((context) => setDoc(cardRef(context.firestore(), id), newCard({ createdAt: EARLIER }, uid)));
}

const longText = (length) => "x".repeat(length);

describe("allowed", () => {
  test("the owner can save a valid card", async () => {
    await assertSucceeds(setDoc(cardRef(dbAs(OWNER)), newCard()));
  });

  test("every symptom group, age group, onset and compared-with-usual value", async () => {
    const db = dbAs(OWNER);
    const sweeps = {
      symptomGroup: SYMPTOM_GROUPS,
      ageGroup: AGE_GROUPS,
      onset: ONSETS,
      comparedWithUsual: COMPARED_WITH_USUAL,
    };
    for (const [field, options] of Object.entries(sweeps)) {
      for (const { value } of options) {
        const extra = value === "something_unusual" ? { unusualDescription: "a strange smell on the breath" } : {};
        await assertSucceeds(setDoc(cardRef(db, `${field}-${value}`), newCard({ [field]: value, ...extra })));
      }
    }
  });

  test("every area in places.json", async () => {
    const db = dbAs(OWNER);
    for (const [index, name] of AREA_NAMES.entries()) {
      await assertSucceeds(setDoc(cardRef(db, `area-${index}`), newCard({ area: name })));
    }
  });

  test("every exposure type and every observation tick together", async () => {
    const types = EXPOSURE_TYPES.map((option) => option.value);
    const flags = Object.fromEntries(OBSERVATIONS.map((option) => [option.value, true]));
    const card = newCard({ exposure: { types, words: null }, observations: { ...flags, suppliesNote: "rehydration salts" } });
    await assertSucceeds(setDoc(cardRef(dbAs(OWNER)), card));
  });

  test("no exposure, nothing to say, and nothing notifiable", async () => {
    const card = newCard({ exposure: { types: [], words: null }, notifiableConditionMentioned: null });
    await assertSucceeds(setDoc(cardRef(dbAs(OWNER)), card));
  });

  // The app's own card builder, so its field list and the rules can't drift
  // apart. The practice result's unsure fields are answered first.
  test("the card the app builds is accepted", async () => {
    const practice = new URL("../../test-fixtures/practice-results/", import.meta.url);
    const name = readdirSync(practice).find((file) => file.startsWith("4-n04"));
    const note = JSON.parse(readFileSync(new URL(name, practice), "utf8")).result;
    const draft = { ...draftFromCard(note.cards[0]), caseCount: 3, ageGroup: "5_12", area: "Leeba View" };
    const card = toCardDoc({ draft, note, profile: PROFILES[OWNER], uid: OWNER, createdAt: serverTimestamp() });
    await assertSucceeds(setDoc(cardRef(dbAs(OWNER)), card));
  });

  test("text exactly at each limit, and 1 and 500 cases", async () => {
    const db = dbAs(OWNER);
    const atLimit = newCard({
      symptomGroup: "something_unusual",
      unusualDescription: longText(300),
      symptomsInWords: longText(300),
      exposure: { types: ["food"], words: longText(300) },
      observations: { moreSevere: false, notResponding: false, unusualSymptoms: false, shortOfSupplies: true, suppliesNote: longText(300) },
      notifiableConditionMentioned: longText(300),
    });
    await assertSucceeds(setDoc(cardRef(db, "limits"), atLimit));
    await assertSucceeds(setDoc(cardRef(db, "one"), newCard({ caseCount: 1 })));
    await assertSucceeds(setDoc(cardRef(db, "five-hundred"), newCard({ caseCount: 500 })));
  });

  test("several cards from one note, saved together", async () => {
    const db = dbAs(OWNER);
    const batch = writeBatch(db);
    for (let i = 0; i < 5; i += 1) batch.set(cardRef(db, `batch-${i}`), newCard({ caseCount: i + 1 }));
    await assertSucceeds(batch.commit());
  });

  test("the owner can read, list and delete their own cards", async () => {
    await seedCard("mine");
    const db = dbAs(OWNER);
    await assertSucceeds(getDoc(cardRef(db, "mine")));
    await assertSucceeds(getDocs(query(collection(db, "cards"), where("reporterUid", "==", OWNER))));
    await assertSucceeds(deleteDoc(cardRef(db, "mine")));
  });
});

describe("denied: wrong person", () => {
  test("someone signed out can't save, read or delete a card", async () => {
    await seedCard("mine");
    const db = dbAs(null);
    await assertFails(setDoc(cardRef(db), newCard()));
    await assertFails(getDoc(cardRef(db, "mine")));
    await assertFails(deleteDoc(cardRef(db, "mine")));
  });

  // Only the uid is wrong: the role, facility and area are the caller's own.
  test("a card can't name someone else as the reporter", async () => {
    await assertFails(setDoc(cardRef(dbAs(OWNER)), newCard({ reporterUid: OTHER })));
  });

  const mismatches = {
    "a role that isn't theirs": { reporterRole: "doctor" },
    "a facility type that isn't theirs": { reporterFacilityType: "hospital" },
    "an area that isn't theirs": { reporterArea: "Leeba View" },
  };
  for (const [label, change] of Object.entries(mismatches)) {
    test(`a card can't give ${label}`, async () => {
      await assertFails(setDoc(cardRef(dbAs(OWNER)), newCard(change)));
    });
  }

  test("someone with no profile can't save a card", async () => {
    const card = { ...newCard(), reporterUid: NO_PROFILE };
    await assertFails(setDoc(cardRef(dbAs(NO_PROFILE)), card));
  });

  test("another user can't read or delete someone's card", async () => {
    await seedCard("mine");
    const db = dbAs(OTHER);
    await assertFails(getDoc(cardRef(db, "mine")));
    await assertFails(deleteDoc(cardRef(db, "mine")));
  });

  test("cards can't be listed except your own", async () => {
    await seedCard("mine");
    const db = dbAs(OTHER);
    await assertFails(getDocs(collection(db, "cards")));
    await assertFails(getDocs(query(collection(db, "cards"), where("reporterUid", "==", OWNER))));
  });
});

describe("denied: wrong content", () => {
  const extraFields = {
    "the area as heard": { areaHeard: "Nonyana Flat" },
    "a raw transcript": { transcriptVoice: "made-up" },
    "the cleaned transcript": { transcriptClean: "Four children under five with watery diarrhoea from Thaga Park." },
    "the transcripts' disagreements": { disagreements: ["made-up"] },
    "audio": { audioBase64: "UklGRg==" },
    "a name": { patientName: "made-up" },
    "the unsure fields": { unsureFields: ["area"] },
  };
  for (const [label, extra] of Object.entries(extraFields)) {
    test(`a card can't include ${label}`, async () => {
      await assertFails(setDoc(cardRef(dbAs(OWNER)), newCard(extra)));
    });
  }

  test("a card must have every field", async () => {
    const db = dbAs(OWNER);
    for (const field of Object.keys(newCard())) {
      const card = newCard();
      delete card[field];
      await assertFails(setDoc(cardRef(db, `missing-${field}`), card));
    }
  });

  const badValues = {
    "an unknown symptom group": { symptomGroup: "measles" },
    "an unknown compared-with-usual value": { comparedWithUsual: "less" },
    "an unknown age group": { ageGroup: "teen" },
    "an area that isn't in Kganya": { area: "Not A Real Place" },
    "an area in the wrong case": { area: "thaga park" },
    "an unknown onset": { onset: "yesterday" },
    "an unknown exposure type": { exposure: { types: ["air"], words: null } },
    "the same exposure type twice": { exposure: { types: ["water", "water"], words: null } },
    "exposure types that aren't a list": { exposure: { types: "water", words: null } },
    "exposure that isn't a map": { exposure: "water" },
    "an extra key in exposure": { exposure: { types: [], words: null, source: "tap" } },
    "exposure without its words": { exposure: { types: [] } },
    "observations without a tick": { observations: { moreSevere: false, notResponding: false, unusualSymptoms: false, suppliesNote: null } },
    "an extra key in observations": { observations: { moreSevere: false, notResponding: false, unusualSymptoms: false, shortOfSupplies: false, suppliesNote: null, name: "made-up" } },
    ...Object.fromEntries(OBSERVATIONS.map(({ value }) => [`a ${value} tick that isn't true or false`, { observations: { ...newCard().observations, [value]: "yes" } }])),
    "a source other than voice": { source: "typed" },
    "0 cases": { caseCount: 0 },
    "501 cases": { caseCount: 501 },
    "a negative count": { caseCount: -1 },
    "a count that isn't whole": { caseCount: 2.5 },
    "a count as text": { caseCount: "3" },
    "empty symptoms": { symptomsInWords: "" },
    "'something unusual' with no description": { symptomGroup: "something_unusual", unusualDescription: null },
    "an empty description": { symptomGroup: "something_unusual", unusualDescription: "" },
  };
  for (const [label, bad] of Object.entries(badValues)) {
    test(`a card can't have ${label}`, async () => {
      await assertFails(setDoc(cardRef(dbAs(OWNER)), newCard(bad)));
    });
  }

  const overLimit = {
    "symptoms over 300 characters": { symptomsInWords: longText(301) },
    "a description over 300 characters": { symptomGroup: "something_unusual", unusualDescription: longText(301) },
    "exposure words over 300 characters": { exposure: { types: [], words: longText(301) } },
    "a supplies note over 300 characters": { observations: { moreSevere: false, notResponding: false, unusualSymptoms: false, shortOfSupplies: true, suppliesNote: longText(301) } },
    "a notifiable condition over 300 characters": { notifiableConditionMentioned: longText(301) },
  };
  for (const [label, bad] of Object.entries(overLimit)) {
    test(`a card can't have ${label}`, async () => {
      await assertFails(setDoc(cardRef(dbAs(OWNER)), newCard(bad)));
    });
  }

  test("createdAt must be the server's time, not the phone's", async () => {
    await assertFails(setDoc(cardRef(dbAs(OWNER)), newCard({ createdAt: Timestamp.fromDate(new Date()) })));
  });

  test("one bad card stops the whole note being saved", async () => {
    const db = dbAs(OWNER);
    const batch = writeBatch(db);
    batch.set(cardRef(db, "good"), newCard());
    batch.set(cardRef(db, "bad"), newCard({ caseCount: 0 }));
    await assertFails(batch.commit());
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const saved = await getDoc(cardRef(context.firestore(), "good"));
      if (saved.exists()) throw new Error("the good card was saved without the bad one");
    });
  });
});

describe("denied: changes and the note counter", () => {
  test("a saved card can't be changed, not even by its owner", async () => {
    await seedCard("mine");
    const db = dbAs(OWNER);
    await assertFails(updateDoc(cardRef(db, "mine"), { caseCount: 5 }));
    await assertFails(updateDoc(cardRef(db, "mine"), { caseCount: 4 }));
    await assertFails(setDoc(cardRef(db, "mine"), newCard()));
  });

  test("a signed-in user can't read or write the daily note counter", async () => {
    const db = dbAs(OWNER);
    await assertFails(getDoc(doc(db, "noteUsage", OWNER)));
    await assertFails(setDoc(doc(db, "noteUsage", OWNER), { day: "2026-10-28", count: 0 }));
  });

  test("clients cannot read, list, create, update or delete either ranking counter", async () => {
    for (const uid of [OWNER, OTHER, null]) {
      const db = dbAs(uid);
      for (const id of [`user-${OWNER}`, "app"]) {
        await testEnv.withSecurityRulesDisabled((context) => setDoc(doc(context.firestore(), "rankUsage", id), {day: "2026-10-30", count: 1}));
        const ref = doc(db, "rankUsage", id);
        await assertFails(getDoc(ref));
        await assertFails(setDoc(ref, {day: "2026-10-30", count: 0}));
        await assertFails(updateDoc(ref, {count: 0}));
        await assertFails(deleteDoc(ref));
      }
      await assertFails(setDoc(doc(db, "rankUsage", "new-counter"), {day: "2026-10-30", count: 0}));
      await assertFails(getDocs(collection(db, "rankUsage")));
    }
  });
});
