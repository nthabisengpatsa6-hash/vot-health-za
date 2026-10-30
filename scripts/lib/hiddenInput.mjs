import {emitKeypressEvents} from "node:readline";
import {createInterface} from "node:readline/promises";

export async function confirmRun(count, input = process.stdin, output = process.stdout) {
  const terminal = createInterface({input, output});
  try { return (await terminal.question(`Run ${count} calls? (y/n) `)).trim().toLowerCase() === "y"; }
  finally { terminal.close(); }
}

// No echo, stars, command-line arguments, environment variable or terminal history.
export function readHiddenKey(input = process.stdin, output = process.stdout) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function") throw new Error("Use an interactive VS Code terminal for hidden key entry.");
  return new Promise((resolve, reject) => {
    let value = "";
    const wasRaw = input.isRaw === true;
    emitKeypressEvents(input);
    output.write("Meta key (hidden; Enter to submit): ");
    input.setRawMode(true);
    input.resume();
    const finish = (cancelled = false) => {
      input.removeListener("keypress", onKey);
      input.setRawMode(wasRaw);
      input.pause();
      output.write("\n");
      const result = value;
      value = "";
      if (cancelled) reject(new Error("Key entry cancelled."));
      else if (!result.trim()) reject(new Error("No key entered."));
      else resolve(result.trim());
    };
    function onKey(text, key = {}) {
      if (key.ctrl && key.name === "c") return finish(true);
      if (key.name === "return" || key.name === "enter") return finish();
      if (key.name === "backspace") value = value.slice(0, -1);
      else if (text && !key.ctrl && !key.meta && [...text].every((char) => char.charCodeAt(0) > 31 && char.charCodeAt(0) !== 127)) value += text;
    }
    input.on("keypress", onKey);
  });
}
