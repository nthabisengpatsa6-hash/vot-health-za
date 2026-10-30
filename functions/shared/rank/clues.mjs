import {exposureLayers} from "../layers.mjs";

export function clueCounts(cards, town) {
  const names = [town.town, ...town.areas.map((area) => area.name), ...exposureLayers(town).map((source) => source.name)].map((name) => name.toLowerCase());
  const own = cards.map((record) => record.card);
  const type = (value) => own.filter((card) => card.exposure?.types.includes(value)).length;
  return {water: type("water"), food: type("food"),
    schoolEvent: own.filter((card) => card.exposure?.types.includes("school") && card.exposure.types.includes("event")).length,
    namedPlace: own.filter((card) => names.some((name) => (card.exposure?.words || "").toLowerCase().includes(name))).length};
}
