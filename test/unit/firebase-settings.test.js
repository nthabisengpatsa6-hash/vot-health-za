import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { emulatorConfig, installLocalNetworkPolicy, LIVE_HOSTS, shouldUseEmulators } from "../../src/lib/firebaseSettings.js";

const start = "6022dc4cdecafa307355bb978ae7d2b5734cdc07";
const source = readFileSync(new URL("../../src/lib/firebase.js", import.meta.url), "utf8");
const original = execFileSync("git", ["show", `${start}:src/lib/firebase.js`], { encoding: "utf8" });
const configOf = (text) => JSON.parse(JSON.stringify(runInNewContext(`(${text.match(/export const firebaseConfig = (\{[\s\S]*?\n\});/)[1]})`)));

test("live settings deep-equal starting HEAD without exposing values", () => {
  assert.ok(isDeepStrictEqual(configOf(source), configOf(original)), "Live settings changed.");
});

test("production live hosts install no request policy and leave the document head untouched", () => {
  // Execute the actual setup, replacing only module syntax and SDK services.
  // The real selector and policy installer remain in use; no network is involved.
  const setup = source.replace(/^import .*;\r?$/gm, "")
    .replace(/^export \{.*;\r?$/gm, "").replace(/^export const /gm, "const ")
    .replaceAll("import.meta.env.DEV", "false") + "\n;onLocalEmulators;";
  for (const hostname of [...LIVE_HOSTS, "LEMOHA.CO.ZA", "lemoha.co.za."]) {
    const existingNode = {}, head = [existingNode];
    let created = 0, connections = 0;
    const service = () => ({}), connect = () => { connections++; };
    let local;
    try {
      local = runInNewContext(setup, {
        window:{location:{hostname}},
        document:{head:{append(node) { head.push(node); }}, createElement() { created++; return {}; }},
        emulatorConfig, shouldUseEmulators, installLocalNetworkPolicy, FUNCTION_REGION:"test-region",
        initializeApp:service, getAuth:service, getFirestore:service, getFunctions:service,
        connectAuthEmulator:connect, connectFirestoreEmulator:connect, connectFunctionsEmulator:connect,
      });
    } catch { assert.fail("Production client setup could not be evaluated."); }
    assert.equal(local, false, hostname);
    assert.equal(created, 0, hostname);
    assert.deepEqual(head, [existingNode], hostname);
    assert.equal(connections, 0, hostname);
  }
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
