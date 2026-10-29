// The demo town, Kganya, read from its one data file. functions/data/
// places.json is also the card step's place list, so the simulation uses
// exactly the names real cards use. The import attribute lets Node load the
// JSON too (scripts and tests), not just Vite.
import places from "../../functions/data/places.json" with { type: "json" };

export const AREAS = places.areas;
export const AREA_NAMES = AREAS.map((area) => area.name);
export const FACILITIES = places.facilities;
export const SCHOOLS = places.schools;

export const areasOnWorks = (works) => AREAS.filter((area) => area.works === works).map((area) => area.name);
export const worksOf = (areaName) => AREAS.find((area) => area.name === areaName).works;
