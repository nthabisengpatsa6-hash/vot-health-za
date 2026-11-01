import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { emulatorConfig, LIVE_HOSTS, shouldUseEmulators } from "../../src/lib/firebaseSettings.js";

const start = "6022dc4cdecafa307355bb978ae7d2b5734cdc07";
const source = readFileSync(new URL("../../src/lib/firebase.js", import.meta.url), "utf8");
const original = execFileSync("git", ["show", `${start}:src/lib/firebase.js`], { encoding: "utf8" });
const configOf = (text) => JSON.parse(JSON.stringify(runInNewContext(`(${text.match(/export const firebaseConfig = (\{[\s\S]*?\n\});/)[1]})`)));

test("live settings deep-equal starting HEAD without exposing values", () => {
  assert.ok(isDeepStrictEqual(configOf(source), configOf(original)), "Live settings changed.");
});

for (const dev of [false, true]) {
  for (const hostname of [...LIVE_HOSTS, "LEMOHA.CO.ZA", "lemoha.co.za.", "localhost", "127.0.0.1", "::1", "[::1]", "192.168.1.12", "unknown.invalid", "lemoha.co.za..", "lemoha.co.za.evil.invalid"]) {
    test(`${dev ? "dev" : "production"} settings for ${hostname}`, () => {
      const live = [...LIVE_HOSTS, "LEMOHA.CO.ZA", "lemoha.co.za."].includes(hostname);
      assert.equal(shouldUseEmulators(hostname, dev), dev || !live);
    });
  }
}

test("demo fields are independent and all clients connect to loopback before use", () => {
  const live = configOf(original);
  assert.equal(emulatorConfig.projectId, "demo-fola");
  for (const [field, value] of Object.entries(emulatorConfig)) assert.ok(value !== live[field], `Demo field ${field} must be independent.`);
  assert.match(source, /initializeApp\(onLocalEmulators \? emulatorConfig : firebaseConfig\)/);
  assert.match(source, /shouldUseEmulators\(window.location.hostname, import.meta.env.DEV\)/);
  assert.match(source, /if \(onLocalEmulators\) installLocalNetworkPolicy\(document\)/);
  for (const fragment of ['connectAuthEmulator(auth, "http://127.0.0.1:9099"', 'connectFirestoreEmulator(db, "127.0.0.1", 8080)', 'connectFunctionsEmulator(functions, "127.0.0.1", 5001)']) assert.ok(source.includes(fragment));
  const services = [...source.matchAll(/from "(firebase\/[^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(services, ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/functions"]);
});
