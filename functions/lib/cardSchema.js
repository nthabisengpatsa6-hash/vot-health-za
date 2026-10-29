const places = require("../data/places.json");
const {failure} = require("./metaRequest");

// Each list lives here once: the JSON schema, the guards and the prompt
// (via extractCard's placeholders) are all built from it.
const SYMPTOM_GROUPS = {
  diarrhoea_vomiting: "diarrhoea or vomiting",
  bloody_diarrhoea: "bloody diarrhoea",
  fever_rash: "fever with rash",
  cough_flu: "cough or flu-like illness",
  fever_stiff_neck_confusion: "fever with a stiff neck or confusion",
  sudden_after_eating_drinking: "sudden illness after eating or drinking",
  red_eyes_itchy_rash: "red eyes or itchy skin rash",
  something_unusual: "something unusual (describe it in unusualDescription)",
};
const AGE_GROUPS = {
  "under_5": "under 5",
  "5_12": "5 to 12",
  "13_17": "13 to 17",
  "adult": "adult (18 to 59)",
  "60_plus": "60 and older",
};
const COMPARED_WITH_USUAL = ["more", "same", "not_sure"];
const ONSETS = ["today", "last_3_days", "longer"];
const EXPOSURE_TYPES = ["water", "food", "school", "event", "other"];
const OBSERVATION_FLAGS = [
  "moreSevere", "notResponding", "unusualSymptoms", "shortOfSupplies",
];
const REQUIRED_FIELDS = [
  "symptomGroup", "caseCount", "comparedWithUsual", "ageGroup", "area",
  "onset",
];
// The fields the model may mark unsure, in the order the card shows them.
// "observations" stays only because the reply schema the model sees is built
// from this list; cleanCard never asks about it.
const CARD_FIELDS = [
  "symptomGroup", "unusualDescription", "symptomsInWords", "caseCount",
  "comparedWithUsual", "ageGroup", "area", "onset", "exposure",
  "observations",
];
const TOWN = places.town;
const AREA_NAMES = places.areas.map((area) => area.name);
// Voice Transcribe's keyword hints: the names it would otherwise mishear.
const PLACE_KEYWORDS = [TOWN, ...AREA_NAMES];

// Used when the model marks a field unsure but doesn't write a question, so
// every unsure field still gets asked.
const DEFAULT_QUESTIONS = {
  symptomGroup: "Which symptoms best describe these patients?",
  unusualDescription: "What is unusual about these patients?",
  symptomsInWords: "What symptoms do the patients have?",
  caseCount: "How many patients is this report about?",
  comparedWithUsual: "Is this more than usual, about the same, or not sure?",
  ageGroup: "Which age group are the patients in?",
  area: "Which area do the patients live in?",
  onset: "When did the symptoms start?",
  exposure: "Did the patients share any water, food, school or event?",
};
const MAX_QUESTION_LENGTH = 160;
const MAX_NOTE_LENGTH = 300;

// Structured output under strict mode: every key required, no extra keys,
// and "can be null" written as anyOf with null.
const nullable = (schema) => ({anyOf: [schema, {type: "null"}]});
const nullableEnum = (values) => nullable({type: "string", enum: values});

const CARD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "symptomGroup", "unusualDescription", "symptomsInWords", "caseCount",
    "comparedWithUsual", "ageGroup", "area", "areaHeard", "onset",
    "exposure", "observations", "unsureFields", "questions",
  ],
  properties: {
    symptomGroup: nullableEnum(Object.keys(SYMPTOM_GROUPS)),
    unusualDescription: nullable({type: "string"}),
    symptomsInWords: {type: "string"},
    caseCount: nullable({type: "integer"}),
    comparedWithUsual: nullableEnum(COMPARED_WITH_USUAL),
    ageGroup: nullableEnum(Object.keys(AGE_GROUPS)),
    area: nullableEnum(AREA_NAMES),
    areaHeard: nullable({type: "string"}),
    onset: nullableEnum(ONSETS),
    exposure: {
      type: "object",
      additionalProperties: false,
      required: ["types", "words"],
      properties: {
        types: {type: "array", items: {type: "string", enum: EXPOSURE_TYPES}},
        words: nullable({type: "string"}),
      },
    },
    observations: {
      type: "object",
      additionalProperties: false,
      required: [...OBSERVATION_FLAGS, "suppliesNote"],
      properties: {
        ...Object.fromEntries(
            OBSERVATION_FLAGS.map((flag) => [flag, {type: "boolean"}]),
        ),
        suppliesNote: nullable({type: "string"}),
      },
    },
    unsureFields: {type: "array", items: {type: "string", enum: CARD_FIELDS}},
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "question"],
        properties: {
          field: {type: "string", enum: CARD_FIELDS},
          question: {type: "string"},
        },
      },
    },
  },
};

// singleSource isn't here: our code knows whether an ear failed, the model
// doesn't.
const REPLY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "isReport", "cards", "notifiableConditionMentioned", "adviceRequested",
    "transcriptClean", "disagreements",
  ],
  properties: {
    isReport: {type: "boolean"},
    cards: {type: "array", items: CARD_SCHEMA},
    notifiableConditionMentioned: nullable({type: "string"}),
    adviceRequested: {type: "boolean"},
    transcriptClean: {type: "string"},
    disagreements: {type: "array", items: {type: "string"}},
  },
};

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim() !== "";
const textOrNull = (value) => isText(value) ? value.trim() : null;
const asList = (value) => Array.isArray(value) ? value : [];

// Lower-case words only, so "Measles," in a transcript matches "measles".
function normalise(text) {
  return ` ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
}

// Rule 5: a notifiable condition is kept only if a transcript actually says
// it, so the model can't add a diagnosis of its own.
function conditionIfSaid(condition, transcripts) {
  if (!isText(condition)) return null;
  const wanted = normalise(condition);
  if (wanted.trim() === "") return null;
  const said = transcripts.some((text) => normalise(text).includes(wanted));
  return said ? condition.trim() : null;
}

// Never trusts the model: values outside the allowed lists become null and
// unsure, off-list areas move to areaHeard, every required gap is asked, and
// only known keys are copied, so stray text such as advice is dropped.
function cleanCard(raw) {
  if (!isObject(raw)) {
    throw failure("bad-reply", "a card in the reply isn't an object");
  }
  const unsure = new Set(
      asList(raw.unsureFields).filter((field) => CARD_FIELDS.includes(field)),
  );
  // Observations are optional and never asked: a box is ticked only when the
  // note says so, so if the model wasn't sure, every box starts unticked.
  const observationsUnsure = unsure.delete("observations");
  const allowed = (field, value, isAllowed) => {
    if (value === null || value === undefined) return null;
    if (isAllowed(value)) return value;
    unsure.add(field);
    return null;
  };
  const inList = (list) => (value) => list.includes(value);
  const exposure = isObject(raw.exposure) ? raw.exposure : {};
  const observations = isObject(raw.observations) ? raw.observations : {};

  const card = {
    symptomGroup: allowed("symptomGroup", raw.symptomGroup,
        (value) => Object.hasOwn(SYMPTOM_GROUPS, value)),
    unusualDescription: textOrNull(raw.unusualDescription),
    symptomsInWords: textOrNull(raw.symptomsInWords) || "",
    caseCount: allowed("caseCount", raw.caseCount,
        (value) => Number.isInteger(value) && value >= 1),
    comparedWithUsual: allowed("comparedWithUsual", raw.comparedWithUsual,
        inList(COMPARED_WITH_USUAL)),
    ageGroup: allowed("ageGroup", raw.ageGroup,
        (value) => Object.hasOwn(AGE_GROUPS, value)),
    area: null,
    areaHeard: textOrNull(raw.areaHeard),
    onset: allowed("onset", raw.onset, inList(ONSETS)),
    exposure: {
      types: [...new Set(asList(exposure.types))]
          .filter((type) => EXPOSURE_TYPES.includes(type)),
      words: textOrNull(exposure.words),
    },
    observations: {
      ...Object.fromEntries(
          OBSERVATION_FLAGS.map((flag) => [
            flag,
            !observationsUnsure && observations[flag] === true,
          ]),
      ),
      suppliesNote: textOrNull(observations.suppliesNote),
    },
  };

  // Only place-list areas are kept; anything else is what was heard, and
  // the clinician confirms it.
  if (isText(raw.area)) {
    const heard = raw.area.trim();
    const match = AREA_NAMES.find(
        (name) => name.toLowerCase() === heard.toLowerCase(),
    );
    if (match) {
      card.area = match;
    } else {
      card.areaHeard = card.areaHeard || heard;
      unsure.add("area");
    }
  }

  for (const field of REQUIRED_FIELDS) {
    if (card[field] === null) unsure.add(field);
  }
  if (card.symptomGroup === "something_unusual" && !card.unusualDescription) {
    unsure.add("unusualDescription");
  }
  if (card.symptomsInWords === "") unsure.add("symptomsInWords");

  // Exactly one question per unsure field: the model's wording when it wrote
  // one, otherwise a fixed default. Questions about confident fields are
  // dropped, because each one costs the clinician time.
  const written = new Map();
  for (const item of asList(raw.questions)) {
    if (isObject(item) && unsure.has(item.field) && isText(item.question) &&
        !written.has(item.field)) {
      written.set(
          item.field,
          item.question.trim().slice(0, MAX_QUESTION_LENGTH),
      );
    }
  }
  card.unsureFields = CARD_FIELDS.filter((field) => unsure.has(field));
  card.questions = card.unsureFields.map((field) => ({
    field,
    question: written.get(field) || DEFAULT_QUESTIONS[field],
  }));
  return card;
}

// Checks the reply's shape (a wrong shape is a failed reply, not a card to
// repair) and applies the card guards. `transcripts` are the texts the model
// was given, for the rule 5 check.
function cleanReply(raw, {transcripts = []} = {}) {
  if (!isObject(raw)) {
    throw failure("bad-reply", "the card reply isn't a JSON object");
  }
  const problems = [];
  if (typeof raw.isReport !== "boolean") problems.push("isReport");
  if (!Array.isArray(raw.cards)) problems.push("cards");
  if (typeof raw.adviceRequested !== "boolean") {
    problems.push("adviceRequested");
  }
  if (typeof raw.transcriptClean !== "string") {
    problems.push("transcriptClean");
  }
  if (!Array.isArray(raw.disagreements)) problems.push("disagreements");
  if (raw.notifiableConditionMentioned !== null &&
      typeof raw.notifiableConditionMentioned !== "string") {
    problems.push("notifiableConditionMentioned");
  }
  if (problems.length > 0) {
    throw failure(
        "bad-reply",
        `the card reply has the wrong shape (${problems.join(", ")})`,
    );
  }

  return {
    isReport: raw.isReport,
    // Rule 6: a note that isn't a report never makes a card.
    cards: raw.isReport ? raw.cards.map(cleanCard) : [],
    notifiableConditionMentioned: conditionIfSaid(
        raw.notifiableConditionMentioned,
        transcripts,
    ),
    adviceRequested: raw.adviceRequested,
    transcriptClean: raw.transcriptClean.trim(),
    disagreements: raw.disagreements
        .filter(isText)
        .map((note) => note.trim().slice(0, MAX_NOTE_LENGTH)),
  };
}

exports.AGE_GROUPS = AGE_GROUPS;
exports.AREA_NAMES = AREA_NAMES;
exports.CARD_FIELDS = CARD_FIELDS;
exports.COMPARED_WITH_USUAL = COMPARED_WITH_USUAL;
exports.EXPOSURE_TYPES = EXPOSURE_TYPES;
exports.OBSERVATION_FLAGS = OBSERVATION_FLAGS;
exports.ONSETS = ONSETS;
exports.PLACE_KEYWORDS = PLACE_KEYWORDS;
exports.REPLY_SCHEMA = REPLY_SCHEMA;
exports.SYMPTOM_GROUPS = SYMPTOM_GROUPS;
exports.TOWN = TOWN;
exports.cleanReply = cleanReply;
