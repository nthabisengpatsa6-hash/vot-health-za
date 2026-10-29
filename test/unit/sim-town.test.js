import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FACILITY_TYPES, ROLES } from "../../src/config/profileOptions.js";
import { areasServedBy, REPORTERS, reportersFor } from "../../src/sim/reporters.js";

// The town file, functions/data/places.json, is also the card step's place
// list, so it grew on Day 3 without changing a name or a works (test/rules
// checks the names against firestore.rules). Every name in it is built from
// an area name and a generic word, so no new place name is invented.
const places = JSON.parse(readFileSync(new URL("../../functions/data/places.json", import.meta.url), "utf8"));
const AREA_NAMES = places.areas.map((area) => area.name);
const areaNamed = (name) => places.areas.find((area) => area.name === name);
const values = (options) => options.map((option) => option.value);
const worksOf = (name) => areaNamed(name).works;
const crossesZones = (names) => new Set(names.map(worksOf)).size > 1;

// Ray casting: whether a point lies inside a polygon.
function inside([x, y], shape) {
  let result = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i, i += 1) {
    const [xi, yi] = shape[i];
    const [xj, yj] = shape[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) result = !result;
  }
  return result;
}

const edgeKeys = (shape) => shape.map((point, index) => [point, shape[(index + 1) % shape.length]].map((p) => p.join(",")).sort().join(" "));
const sharesEdge = (a, b) => edgeKeys(a.shape).some((edge) => edgeKeys(b.shape).includes(edge));

const assertAreas = (names, what) => {
  assert.ok(names.length > 0, `${what} lists no areas`);
  for (const name of names) assert.ok(AREA_NAMES.includes(name), `${what}: "${name}" isn't an area`);
  assert.equal(new Set(names).size, names.length, `${what} lists an area twice`);
};

test("each area has its works, a round population, neighbours and a shape on the plain grid", () => {
  assert.equal(new Set(AREA_NAMES).size, 7);
  for (const area of places.areas) {
    assert.deepEqual(Object.keys(area), ["name", "works", "population", "neighbours", "shape"], area.name);
    assert.ok(Number.isInteger(area.population) && area.population > 0 && area.population % 1000 === 0, area.name);
    assert.ok(area.shape.length >= 3, area.name);
    for (const point of area.shape) assert.ok(point.length === 2 && point.every((n) => Number.isInteger(n) && n >= 0 && n <= 100), `${area.name} ${point}`);
  }
});

test("works A feeds five areas and works B two, with enough people in B for a fair rate comparison", () => {
  assert.deepEqual(places.waterWorks, [{ id: "A", name: "Works A" }, { id: "B", name: "Works B" }]);
  const zone = (works) => places.areas.filter((area) => area.works === works);
  assert.equal(zone("A").length, 5);
  assert.equal(zone("B").length, 2);
  assert.ok(zone("B").reduce((sum, area) => sum + area.population, 0) >= 20000);
});

test("neighbours are listed both ways, and are exactly the areas whose shapes share an edge", () => {
  for (const area of places.areas) {
    assertAreas(area.neighbours, `${area.name}'s neighbours`);
    assert.ok(!area.neighbours.includes(area.name));
    for (const other of places.areas.filter((candidate) => candidate !== area)) {
      const listed = area.neighbours.includes(other.name);
      assert.equal(other.neighbours.includes(area.name), listed, `${area.name} and ${other.name}`);
      assert.equal(sharesEdge(area, other), listed, `${area.name} and ${other.name} share an edge only if they're neighbours`);
    }
  }
});

test("facilities are clinics and one hospital, named after their area, and every area has a clinic and the hospital", () => {
  for (const facility of places.facilities) {
    assert.ok(values(FACILITY_TYPES).includes(facility.type), facility.name);
    assert.equal(facility.name, `${facility.area} ${facility.type === "hospital" ? "Hospital" : "Clinic"}`);
    assertAreas(facility.serves, facility.name);
  }
  const hospitals = places.facilities.filter((facility) => facility.type === "hospital");
  assert.equal(hospitals.length, 1);
  assert.deepEqual([...hospitals[0].serves].sort(), [...AREA_NAMES].sort());
  for (const name of AREA_NAMES) assert.ok(places.facilities.some((facility) => facility.type === "clinic" && facility.serves.includes(name)), name);
});

test("two schools, and both catchments cross the two water zones", () => {
  assert.equal(places.schools.length, 2);
  for (const school of places.schools) {
    assert.equal(school.name, `${school.area} Primary School`);
    assertAreas(school.catchment, school.name);
    assert.ok(crossesZones(school.catchment), `${school.name}'s catchment stays in one zone`);
  }
});

test("shops are generic spaza shops named after their area", () => {
  assert.ok(places.shops.length >= 2);
  for (const shop of places.shops) {
    assert.equal(shop.name, `${shop.area} spaza shop`);
    assert.match(shop.description, new RegExp(`^a spaza shop .+ in ${shop.area}$`));
    assertAreas(shop.serves, shop.name);
  }
});

test("every facility, school and shop sits inside its own area and serves it", () => {
  for (const place of [...places.facilities, ...places.schools, ...places.shops]) {
    assert.ok(inside(place.at, areaNamed(place.area).shape), `${place.name} at ${place.at}`);
    assert.ok((place.serves || place.catchment).includes(place.area), place.name);
  }
});

test("the made-up reporters hold a real profile's values, and every area has at least three", () => {
  assert.equal(new Set(REPORTERS.map((reporter) => reporter.uid)).size, REPORTERS.length);
  for (const reporter of REPORTERS) {
    assert.match(reporter.uid, /^sim-reporter-\d{2}$/);
    assert.ok(values(ROLES).includes(reporter.role), reporter.uid);
    assert.ok(values(FACILITY_TYPES).includes(reporter.facilityType), reporter.uid);
    assert.ok(AREA_NAMES.includes(reporter.area), reporter.uid);
    if (reporter.facility) {
      const facility = places.facilities.find((candidate) => candidate.name === reporter.facility);
      assert.ok(facility && facility.type === reporter.facilityType && facility.area === reporter.area, reporter.uid);
    }
    assertAreas(areasServedBy(reporter), reporter.uid);
    assert.ok(areasServedBy(reporter).includes(reporter.area), reporter.uid);
  }
  for (const name of AREA_NAMES) {
    const reporters = reportersFor(name);
    assert.ok(reporters.length >= 3, name);
    assert.ok(new Set(reporters.map((reporter) => reporter.facilityType)).size >= 2, name);
  }
});
