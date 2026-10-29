// The exposure layers the statistics can test, read from the town file:
// things the people of several areas share. Clinics and the hospital
// aren't layers: they show where patients are seen, not what made them
// ill. `clues` are the card exposure types that point at each kind.
const CLUES = {water: ["water"], school: ["school", "event"], shop: ["food"]};

export function exposureLayers(town) {
  const onWorks = (id) => town.areas
      .filter((area) => area.works === id)
      .map((area) => area.name);
  return [
    ...town.waterWorks.map((works) => ({
      id: `water:${works.id}`,
      kind: "water",
      name: works.name,
      areas: onWorks(works.id),
    })),
    ...town.schools.map((school) => ({
      id: `school:${school.name}`,
      kind: "school",
      name: school.name,
      areas: school.catchment,
    })),
    ...town.shops.map((shop) => ({
      id: `shop:${shop.name}`,
      kind: "shop",
      name: shop.name,
      areas: shop.serves,
    })),
  ].map((layer) => ({...layer, clues: CLUES[layer.kind]}));
}
