import assert from "node:assert/strict";
import { constants, readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { KEY_LIKE } from "../../scripts/lib/noteArtifacts.mjs";
import { emulatorArguments, environmentProblem, keyStatus, prepareSecrets, prerequisiteLines, SECRET_ERROR, supervise } from "../../scripts/judge.mjs";

test("launcher refuses credential or non-demo project environments", () => {
  for (const value of ["", "synthetic-path"]) assert.ok(environmentProblem({ GOOGLE_APPLICATION_CREDENTIALS: value }));
  for (const name of ["GCLOUD_PROJECT", "GOOGLE_CLOUD_PROJECT", "FIREBASE_PROJECT"]) {
    for (const value of ["", "production", "prefix-demo-test"]) assert.ok(environmentProblem({ [name]: value }));
    assert.equal(environmentProblem({ [name]: "demo-fola" }), null);
  }
  assert.equal(environmentProblem({}), null);
});

test("launcher checks Java and warns about Node versions other than 22", () => {
  assert.deepEqual(prerequisiteLines("v22.1.0", 'openjdk version "21.0.13"'), ["Node: v22.1.0", "Java: 21.0.13"]);
  assert.ok(prerequisiteLines("v24.14.0", 'java version "25"').at(-1).startsWith("Warning:"));
  for (const java of ["", 'java version "17.0.1"']) assert.throws(() => prerequisiteLines("v22.1.0", java), /Java 21/);
  assert.throws(() => prerequisiteLines("", 'java version "21"'), /Node/);
});

test("secret status contains only the approved found/missing lines", () => {
  assert.deepEqual(keyStatus("META_API_KEY=\nBASETEN_API_KEY=\n"), ["Meta key: missing (practice cards only)", "Baseten key: missing (standard draft only)"]);
  assert.deepEqual(keyStatus("META_API_KEY=synthetic\nBASETEN_API_KEY='synthetic'\n"), ["Meta key: found", "Baseten key: found"]);
  assert.deepEqual(keyStatus('META_API_KEY="  "\nBASETEN_API_KEY= # optional'), keyStatus(""));
  for (const text of ["synthetic invalid content", 'META_API_KEY="unclosed', "META_API_KEY=a\nMETA_API_KEY=b", "META_API_KEY=a b"]) {
    assert.throws(() => keyStatus(text), (error) => error.message === SECRET_ERROR);
  }
});

test("exclusive template copy never overwrites and read/parse failures are sanitized", () => {
  let copies = 0;
  const read = () => "META_API_KEY=\nBASETEN_API_KEY=\n";
  prepareSecrets({ copy: (_from, _to, flag) => { copies++; assert.equal(flag, constants.COPYFILE_EXCL); }, read });
  assert.equal(copies, 1);
  prepareSecrets({ copy: () => { throw Object.assign(Error("synthetic private detail"), { code: "EEXIST" }); }, read });
  for (const operations of [{ copy: () => { throw Error("synthetic private detail"); }, read }, { copy: () => {}, read: () => { throw Error("synthetic private detail"); } }, { copy: () => {}, read: () => "invalid synthetic content" }]) {
    assert.throws(() => prepareSecrets(operations), (error) => error.message === SECRET_ERROR);
  }
});

test("pinned local CLI uses demo-fola and a quoted cross-platform worker command", () => {
  const args = emulatorArguments("C:/Program Files/nodejs/node.exe");
  assert.ok(args[0].endsWith("node_modules\\firebase-tools\\lib\\bin\\firebase.js") || args[0].endsWith("node_modules/firebase-tools/lib/bin/firebase.js"));
  assert.deepEqual(args.slice(1, -1), ["emulators:exec", "--only", "auth,firestore,functions", "--project", "demo-fola"]);
  assert.ok(args.at(-1).startsWith('"C:/Program Files/nodejs/node.exe" "'));
  const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url)));
  assert.equal(pkg.devDependencies["firebase-tools"], "15.20.0");
  assert.equal(pkg.scripts.judge, "node scripts/judge.mjs");
  for (const name of ["emulators", "test:rules"]) {
    assert.ok(pkg.scripts[name].includes("--project demo-fola"));
    assert.ok(pkg.scripts[name].startsWith("node node_modules/firebase-tools/lib/bin/firebase.js "));
  }
});

test("supervision forwards POSIX interrupts, preserves Windows console interrupts, and propagates failures", async () => {
  for (const platform of ["win32", "darwin", "linux"]) {
    const signals = new EventEmitter(), child = new EventEmitter(), killed = [];
    child.kill = (signal) => killed.push(signal);
    const done = supervise({ platform, signals, spawnChild: () => child });
    signals.emit("SIGINT");
    assert.deepEqual(killed, platform === "win32" ? [] : ["SIGINT"]);
    child.emit("exit", 2);
    assert.equal(await done, 2);
    assert.equal(signals.listenerCount("SIGINT"), 0);
    const failed = supervise({ platform, signals, spawnChild: () => child });
    child.emit("error", Error("synthetic failure"));
    assert.equal(await failed, 1);
  }
});

test("all emulator listeners and Vite are explicitly loopback only", () => {
  const { emulators } = JSON.parse(readFileSync(new URL("../../firebase.json", import.meta.url)));
  for (const [name, config] of Object.entries(emulators)) if (typeof config === "object") assert.equal(config.host, "127.0.0.1", name);
  const launcher = readFileSync(new URL("../../scripts/judge.mjs", import.meta.url), "utf8");
  assert.match(launcher, /host: "127.0.0.1", port: 5173, strictPort: true/);
});

test("secret file is ignored, empty template is tracked-safe, and debug logs remain ignored", () => {
  const ignored = spawnSync("git", ["check-ignore", "-v", "functions/.secret.local"], { encoding: "utf8" });
  assert.equal(ignored.status, 0);
  const example = spawnSync("git", ["check-ignore", "-v", "functions/.secret.local.example"], { encoding: "utf8" });
  assert.equal(example.status, 1); assert.equal(example.stdout, "");
  const template = readFileSync(new URL("../../functions/.secret.local.example", import.meta.url), "utf8");
  assert.deepEqual(keyStatus(template), keyStatus(""));
  assert.equal(KEY_LIKE.test(template), false);
  for (const name of ["firebase-debug.log.1", "firestore-debug.log.1", "ui-debug.log.1"]) assert.ok(execFileSync("git", ["check-ignore", name], { encoding: "utf8" }).trim());
});

test("Functions deploy and logs scripts remain exactly as at starting HEAD", () => {
  const current = JSON.parse(readFileSync(new URL("../../functions/package.json", import.meta.url)));
  const previous = JSON.parse(execFileSync("git", ["show", "6022dc4cdecafa307355bb978ae7d2b5734cdc07:functions/package.json"], { encoding: "utf8" }));
  for (const name of ["deploy", "logs"]) assert.equal(current.scripts[name], previous.scripts[name]);
});
