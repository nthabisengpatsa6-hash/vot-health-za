// The choices on the Profile screen. firestore.rules keeps its own copy of
// the stored values (rules can't import files); test/rules checks that the
// two lists match.

export const ROLES = [
  { value: "nurse", label: "Nurse" },
  { value: "doctor", label: "Doctor" },
  { value: "physiotherapist", label: "Physiotherapist" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "environmental_health_practitioner", label: "Environmental health practitioner" },
  { value: "health_officer", label: "District or municipal health officer" },
];

export const FACILITY_TYPES = [
  { value: "clinic", label: "Clinic" },
  { value: "hospital", label: "Hospital" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "private_practice", label: "Private practice" },
  { value: "health_office", label: "Health office" },
];

export function labelFor(options, value) {
  const match = options.find((option) => option.value === value);
  return match ? match.label : value;
}
