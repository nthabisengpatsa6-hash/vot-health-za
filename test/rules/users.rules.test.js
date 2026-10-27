// Firestore rules for users/{uid}. Run with `npm run test:rules`, which
// starts a throwaway Firestore emulator under the local-only "demo-fola"
// project. The allowed values come from the app's own lists, so the copies
// in firestore.rules can't drift from them unnoticed.
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, deleteField, doc, documentId, getDoc, getDocs, query, serverTimestamp, setDoc, setLogLevel, Timestamp, updateDoc, where } from "firebase/firestore";
import { FACILITY_TYPES, ROLES } from "../../src/config/profileOptions.js";

const places = JSON.parse(readFileSync(new URL("../../functions/data/places.json", import.meta.url), "utf8"));
const AREA_NAMES = places.areas.map((area) => area.name);

const OWNER = "user-a";
const OTHER = "user-b";
const EARLIER = Timestamp.fromDate(new Date("2026-10-01T08:00:00Z"));

// Every expected denial would otherwise print a PERMISSION_DENIED warning.
setLogLevel("error");

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-fola",
    firestore: { rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8") },
  });
});

after(() => testEnv.cleanup());

beforeEach(() => testEnv.clearFirestore());

// A Firestore client signed in as uid, or signed out when uid is null.
function dbAs(uid) {
  const context = uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext();
  return context.firestore();
}

function profileOf(db, uid) {
  return doc(db, "users", uid);
}

function newProfile(overrides = {}) {
  return {
    role: "nurse",
    facilityType: "clinic",
    area: "Thaga Park",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

// An existing profile, written past the rules as if saved earlier.
function seedProfile(uid) {
  return testEnv.withSecurityRulesDisabled((context) =>
    setDoc(profileOf(context.firestore(), uid), newProfile({ createdAt: EARLIER, updatedAt: EARLIER })),
  );
}

describe("allowed", () => {
  // Each value gets its own user, because a second create on the same
  // document would be an update.
  test("the owner can create a profile with every role", async () => {
    for (const { value } of ROLES) {
      const uid = `role-${value}`;
      await assertSucceeds(setDoc(profileOf(dbAs(uid), uid), newProfile({ role: value })));
    }
  });

  test("the owner can create a profile with every facility type", async () => {
    for (const { value } of FACILITY_TYPES) {
      const uid = `facility-${value}`;
      await assertSucceeds(setDoc(profileOf(dbAs(uid), uid), newProfile({ facilityType: value })));
    }
  });

  test("the owner can create a profile with every area in places.json", async () => {
    for (const [index, name] of AREA_NAMES.entries()) {
      const uid = `area-${index}`;
      await assertSucceeds(setDoc(profileOf(dbAs(uid), uid), newProfile({ area: name })));
    }
  });

  test("the owner can read their own profile", async () => {
    await seedProfile(OWNER);
    await assertSucceeds(getDoc(profileOf(dbAs(OWNER), OWNER)));
  });

  test("the owner can change role, facility type and area", async () => {
    await seedProfile(OWNER);
    const changes = { role: "doctor", facilityType: "hospital", area: "Lebone Gardens", updatedAt: serverTimestamp() };
    await assertSucceeds(updateDoc(profileOf(dbAs(OWNER), OWNER), changes));
  });

  test("the owner can delete their own profile", async () => {
    await seedProfile(OWNER);
    await assertSucceeds(deleteDoc(profileOf(dbAs(OWNER), OWNER)));
  });
});

describe("denied: wrong person", () => {
  test("someone signed out can't read, create or delete a profile", async () => {
    await seedProfile(OWNER);
    const db = dbAs(null);
    await assertFails(getDoc(profileOf(db, OWNER)));
    await assertFails(setDoc(profileOf(db, OTHER), newProfile()));
    await assertFails(deleteDoc(profileOf(db, OWNER)));
  });

  test("another signed-in user can't read someone else's profile", async () => {
    await seedProfile(OWNER);
    await assertFails(getDoc(profileOf(dbAs(OTHER), OWNER)));
  });

  test("another signed-in user can't create a profile for someone else", async () => {
    await assertFails(setDoc(profileOf(dbAs(OTHER), OWNER), newProfile()));
  });

  test("another signed-in user can't update someone else's profile", async () => {
    await seedProfile(OWNER);
    await assertFails(updateDoc(profileOf(dbAs(OTHER), OWNER), { area: "Leeba View", updatedAt: serverTimestamp() }));
  });

  test("another signed-in user can't delete someone else's profile", async () => {
    await seedProfile(OWNER);
    await assertFails(deleteDoc(profileOf(dbAs(OTHER), OWNER)));
  });

  test("profiles can't be listed, not even your own", async () => {
    await seedProfile(OWNER);
    const db = dbAs(OWNER);
    await assertFails(getDocs(collection(db, "users")));
    await assertFails(getDocs(query(collection(db, "users"), where(documentId(), "==", OWNER))));
  });
});

describe("denied: wrong content", () => {
  const extraFields = {
    "a name": { name: "made-up" },
    "a phone number": { phoneNumber: "0000000000" },
    "an ID number": { idNumber: "0000000000000" },
    "an email": { email: "someone@example.com" },
  };
  for (const [label, extra] of Object.entries(extraFields)) {
    test(`a new profile can't include ${label}`, async () => {
      await assertFails(setDoc(profileOf(dbAs(OWNER), OWNER), newProfile(extra)));
    });
  }

  test("a new profile must have every field", async () => {
    const { area: _area, ...withoutArea } = newProfile();
    await assertFails(setDoc(profileOf(dbAs(OWNER), OWNER), withoutArea));
  });

  const badValues = {
    "an unknown role": { role: "receptionist" },
    "an unknown facility type": { facilityType: "school" },
    "an area that isn't in Kganya": { area: "Not A Real Place" },
    "an area in the wrong case": { area: "thaga park" },
    "a number instead of text": { role: 7 },
  };
  for (const [label, bad] of Object.entries(badValues)) {
    test(`a new profile can't have ${label}`, async () => {
      await assertFails(setDoc(profileOf(dbAs(OWNER), OWNER), newProfile(bad)));
    });
  }

  test("createdAt and updatedAt must be the server's time, not the phone's", async () => {
    const phoneClock = Timestamp.fromDate(new Date());
    await assertFails(setDoc(profileOf(dbAs(OWNER), OWNER), newProfile({ createdAt: phoneClock })));
    await assertFails(setDoc(profileOf(dbAs(OWNER), OWNER), newProfile({ updatedAt: phoneClock })));
  });

  test("an update can't change createdAt", async () => {
    await seedProfile(OWNER);
    const changes = { createdAt: Timestamp.fromDate(new Date("2026-10-20T08:00:00Z")), updatedAt: serverTimestamp() };
    await assertFails(updateDoc(profileOf(dbAs(OWNER), OWNER), changes));
  });

  test("an update must set updatedAt to the server's time", async () => {
    await seedProfile(OWNER);
    const db = dbAs(OWNER);
    await assertFails(updateDoc(profileOf(db, OWNER), { role: "doctor" }));
    await assertFails(updateDoc(profileOf(db, OWNER), { role: "doctor", updatedAt: Timestamp.fromDate(new Date()) }));
  });

  test("an update can't add an extra field or remove one", async () => {
    await seedProfile(OWNER);
    const db = dbAs(OWNER);
    await assertFails(updateDoc(profileOf(db, OWNER), { name: "made-up", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(profileOf(db, OWNER), { area: deleteField(), updatedAt: serverTimestamp() }));
  });
});

describe("denied: everything else", () => {
  test("a signed-in user can't read or write another collection", async () => {
    const db = dbAs(OWNER);
    await assertFails(setDoc(doc(db, "cards", "x"), { count: 1 }));
    await assertFails(getDoc(doc(db, "cards", "x")));
  });

  test("a signed-in user can't use a subcollection under their own profile", async () => {
    await seedProfile(OWNER);
    const db = dbAs(OWNER);
    await assertFails(setDoc(doc(db, "users", OWNER, "notes", "x"), { text: "made-up" }));
    await assertFails(getDoc(doc(db, "users", OWNER, "notes", "x")));
  });
});
