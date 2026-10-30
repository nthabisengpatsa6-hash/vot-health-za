// Only schema constructs used by the unchanged production schemas. Fail closed
// on unknown constructs rather than pretending to implement full JSON Schema.
export function validateSchema(value, schema) {
  const allowed = new Set(["type", "properties", "required", "additionalProperties", "items", "enum", "anyOf", "description"]);
  if (Object.keys(schema).some((key) => !allowed.has(key))) throw new Error("Unsupported schema construct.");
  if (schema.anyOf) {
    if (!schema.anyOf.some((branch) => {try { validateSchema(value, branch); return true; } catch { return false; }})) throw new Error("Schema mismatch.");
    return;
  }
  const good = {null:()=>value === null, string:()=>typeof value === "string", boolean:()=>typeof value === "boolean",
    integer:()=>Number.isInteger(value), number:()=>typeof value === "number" && Number.isFinite(value),
    array:()=>Array.isArray(value), object:()=>value !== null && typeof value === "object" && !Array.isArray(value)};
  if (schema.type && !good[schema.type]?.()) throw new Error("Schema mismatch.");
  if (schema.enum && !schema.enum.includes(value)) throw new Error("Schema mismatch.");
  if (schema.type === "object") {
    if ((schema.required || []).some((key) => !Object.hasOwn(value, key))) throw new Error("Schema mismatch.");
    for (const [key, item] of Object.entries(value)) {
      if (!schema.properties?.[key]) { if (schema.additionalProperties === false) throw new Error("Schema mismatch."); }
      else validateSchema(item, schema.properties[key]);
    }
  }
  if (schema.type === "array" && schema.items) value.forEach((item) => validateSchema(item, schema.items));
}
