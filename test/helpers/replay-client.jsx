import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { MemoryRouter, Route, Routes } from "react-router";
import DemoScreen from "../../src/screens/DemoScreen";
import ReplayScreen from "../../src/screens/ReplayScreen";
import TodayScreen from "../../src/screens/TodayScreen";
import { createSignalDetailLoader } from "../../src/lib/loadSignalDetail.js";

let root;
const calls = { fetch: 0, xhr: 0, localStorage: 0, sessionStorage: 0, service: 0 };
window.fetch = () => { calls.fetch++; throw Error("Unexpected fetch"); };
window.XMLHttpRequest = class { constructor() { calls.xhr++; throw Error("Unexpected XMLHttpRequest"); } };
for (const name of ["localStorage", "sessionStorage"]) Object.defineProperty(window, name, { configurable: true, value: { getItem() { return null; }, setItem() { calls[name]++; }, removeItem() { calls[name]++; }, clear() { calls[name]++; } } });
window.__serviceCall = () => { calls.service++; throw Error("Unexpected profile or Firestore call"); };
window.__detailState = null;
window.__importAttempts = 0;
window.__runningTimers = new Set();
const originalInterval = window.setInterval.bind(window), originalClear = window.clearInterval.bind(window);
window.setInterval = (...args) => { const id = originalInterval(...args); window.__runningTimers.add(id); return id; };
window.clearInterval = (id) => { window.__runningTimers.delete(id); originalClear(id); };
const profile = Object.freeze({ area: "Outside the demo town" });
const tick = () => new Promise((resolve) => setTimeout(resolve, 30));
const wait = async (predicate) => { for (let i = 0; i < 150; i++) { if (predicate()) return; await tick(); } throw Error("The expected replay view did not appear"); };
export function Detail({ signal, day, area, onBack }) {
  useEffect(() => { window.__detailState = { signal: JSON.parse(JSON.stringify(signal)), day, area }; }, [signal, day, area]);
  return <section data-test-detail><p>Signal detail</p><button type="button" onClick={onBack}>Back to replay</button></section>;
}
function mount(element) {
  if (root) flushSync(() => root.unmount());
  document.body.innerHTML = '<div id="test-root"></div>';
  root = createRoot(document.getElementById("test-root"));
  flushSync(() => root.render(element));
}
const setInput = (element, value) => {
  const prototype = element.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, String(value));
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};
const clickText = (text, selector = "button") => {
  const element = [...document.querySelectorAll(selector)].find((item) => item.textContent === text);
  if (!element) throw Error(`Missing action: ${text}`);
  element.click();
};
window.task20 = {
  calls, profile, tick, wait, clickText,
  async mountDemo({ embedded = false, area = "Thaga Park", failures = 0, today = true } = {}) {
    window.__importAttempts = 0;
    const loadDetail = createSignalDetailLoader(async () => { window.__importAttempts++; if (window.__importAttempts <= failures) throw Error("Simulated screen download failure"); return { default: Detail }; });
    mount(embedded && failures === 0 ? <MemoryRouter initialEntries={[{ pathname: "/app/replay", state: { today } }]}><ReplayScreen profileArea={area} /></MemoryRouter> : <MemoryRouter><DemoScreen embedded={embedded} profileArea={area} initialToday={today} loadDetail={loadDetail} /></MemoryRouter>);
    await wait(() => document.querySelector('input[aria-label="Replay day"]:not(:disabled)'));
    await tick();
  },
  async day(value) { setInput(document.querySelector('input[aria-label="Replay day"]'), value); await wait(() => document.querySelector('.replay-day strong')?.textContent === `Day ${value}`); await tick(); },
  async area(value) { setInput(document.querySelector('.replay-today select'), value); await wait(() => document.querySelector('.replay-today select')?.value === value); await tick(); },
  async view(value) { clickText(value); await wait(() => value === "Today" ? document.querySelector('.replay-today') : document.querySelector('.town-map')); },
  async openToday() { document.querySelector('.replay-today .area-row').click(); await tick(); },
  async openSheet(area) { [...document.querySelectorAll('.area-list .area-row')].find((item) => item.textContent.includes(area)).click(); await wait(() => document.querySelector('.sheet')); clickText("Open signal", ".sheet button"); await tick(); },
  async detail() { await wait(() => document.querySelector('[data-test-detail]')); return window.__detailState; },
  async back(label = "Back to replay") { clickText(label); await wait(() => document.querySelector('input[aria-label="Replay day"]')); await tick(); },
  async routeToday() {
    mount(<MemoryRouter initialEntries={["/today"]}><Routes><Route path="/today" element={<TodayScreen area="Leeba View" />} /><Route path="/app/replay" element={<ReplayScreen profileArea="Leeba View" />} /></Routes></MemoryRouter>);
    await tick(); clickText("Watch the replay", "a");
    await wait(() => document.querySelector('.replay-today select'));
  },
  snapshot() { return { day: document.querySelector('input[aria-label="Replay day"]')?.value, area: document.querySelector('.replay-today select')?.value || document.querySelector('.sheet h2')?.textContent, today: Boolean(document.querySelector('.replay-today')), paused: [...document.querySelectorAll('button')].some((item) => item.textContent === "Play"), profile: { ...profile }, calls: { ...calls }, attempts: window.__importAttempts }; },
  resetCalls() { for (const key of Object.keys(calls)) calls[key] = 0; },
};
