// The place list has one source of truth, functions/data/places.json. Vite's
// root is the repo root, so the web app can import it directly and the build
// copies it into the bundle; functions/ still deploys on its own.
import places from "../../functions/data/places.json";

export const TOWN = places.town;
export const AREA_NAMES = places.areas.map((area) => area.name);
