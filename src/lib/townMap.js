// The demo town as a drawing: each area's shape on the town file's plain
// x/y grid, where its name sits, and what a level adds to it. Free of React
// and the browser, so the tests can check it in Node.
import places from "../../functions/data/places.json" with { type: "json" };
import { LEVELS } from "../config/levels.js";

export const TOWN_FILE = places;
export const GRID = { width: 100, height: 92 };

// Where each area's name sits and how wide it may grow, in grid units. Kept
// here rather than in the town file, which is also the card step's place
// list. test/unit/replay.test.js checks every point is inside its own area.
const LABELS = {
  "Thaga Park": { at: [16, 80], width: 28 },
  "Leeba View": { at: [47, 72], width: 32 },
  "Sefate Extension": { at: [14, 46], width: 25 },
  "Nonyana Flats": { at: [46, 44], width: 34 },
  "Mmutla Ridge": { at: [32, 15], width: 50 },
  "Kgwedi Heights": { at: [78, 73], width: 32 },
  "Lebone Gardens": { at: [81, 44], width: 30 },
};

export const pathOf = (shape) => `M${shape.map(([x, y]) => `${x} ${y}`).join("L")}Z`;

export const MAP_AREAS = places.areas.map(({ name, shape }) => ({ name, shape, path: pathOf(shape), label: LABELS[name] }));

// A level is never colour alone: Watch is a dashed outline, Signal and
// Alert their colour with the print, and every level shows its word.
export function areaLayers(level) {
  if (!level) return { fill: "quiet", print: null, watchOutline: false, word: null };
  return {
    fill: level === "watch" ? "quiet" : level,
    print: { signal: "sparse", alert: "dense" }[level] ?? null,
    watchOutline: level === "watch",
    word: LEVELS[level].label,
  };
}
