// Made-up words for simulated cards, the way clinicians talk: mostly
// English, a few mixed Sesotho and English. Never a personal name, never a
// diagnosis, never a line from the test recordings' scripts (test-fixtures/;
// test/unit/sim-text.test.js checks all three). Lower case, so the only
// capitals in generated text are the town file's names. The seeded cluster
// and the background draw from the same lists, so a cluster card has no
// tell-tale wording of its own.

export const SYMPTOM_WORDS = {
  diarrhoea_vomiting: [
    "diarrhoea, very watery",
    "vomiting and diarrhoea since last night",
    "vomiting and loose stools",
    "running stomach since yesterday",
    "diarrhoea, not keeping fluids down",
    "letshollo le ho hlatsa",
    "bana ba a hlatsa, watery diarrhoea",
  ],
  bloody_diarrhoea: ["diarrhoea with blood", "bloody stools and stomach cramps", "letshollo le nang le madi"],
  fever_rash: ["fever with a red rash", "high fever and a rash on the body"],
  cough_flu: ["cough and runny nose", "flu, body aches and fever", "dry cough and sore throat", "ba a kgohlela, runny nose"],
  fever_stiff_neck_confusion: ["fever, stiff neck and headache", "fever and confused"],
  sudden_after_eating_drinking: ["vomiting soon after a meal", "stomach cramps an hour after eating", "dizzy and vomiting after drinking"],
  red_eyes_itchy_rash: ["itchy red eyes", "itchy rash on the arms and legs", "sore red eyes, sticky in the morning"],
};

// "Something unusual" needs both its words and a description.
export const SOMETHING_UNUSUAL = [
  { words: "dizziness and blurred vision", description: "dizziness and blurred vision with no clear cause" },
  { words: "tingling in the hands and feet", description: "tingling in the hands and feet in several patients" },
];

export const EXPOSURE_WORDS = {
  water: [
    "the tap water had a bad smell",
    "the water came out cloudy",
    "the tap water tastes strange",
    "mothers say the tap water looks dirty",
    "metsi a pompo a nkga",
    "ba re metsi a pompo a ditshila",
  ],
  food: ["ate leftover food", "food from a street vendor", "bought food at the spaza shop", "ate at a family function"],
  school: ["several children sick in the same class", "a few learners at the same school"],
  other: ["a sick family member at home", "the crèche has several sick children"],
};

// The red herring's words; {school} becomes the school's name.
export const EVENT_WORDS = [
  "after the sports day at {school}",
  "learners got sick after the sports day at {school}",
  "they all went to the school sports day",
];

export const SUPPLIES_NOTES = ["oral rehydration sachets", "paracetamol syrup", "gloves"];
