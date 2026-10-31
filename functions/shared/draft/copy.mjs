export const SYMPTOM_LABELS = Object.freeze({diarrhoea_vomiting:"Diarrhoea or vomiting", bloody_diarrhoea:"Bloody diarrhoea", fever_rash:"Fever with rash", cough_flu:"Cough or flu-like illness", fever_stiff_neck_confusion:"Fever with a stiff neck or confusion", sudden_after_eating_drinking:"Sudden illness after eating or drinking", red_eyes_itchy_rash:"Red eyes or itchy skin rash", something_unusual:"Something unusual"});
export const CHECKS = {
  water: (name) => `Check chlorine readings and treatment records for ${name}, and take water samples in the areas it supplies.`,
  school: (name) => `Ask ${name} about shared meals, events and water points in the past week.`,
  shop: (name) => `Ask ${name} about food storage, preparation and suppliers in the past week.`,
};
export const FACTS = {
  insideAreaRaised: ({ area, name }) => `${area} is linked to ${name} and has more cases than usual.`,
  insideAreaNormal: ({ area, name }) => `${area} is also linked to ${name}, but its cases have not risen like the others.`,
  insideAreaNotRaised: ({ area, name }) => `${area} is linked to ${name}, and its cases are not clearly raised.`,
  outsideAreaRaised: ({ area, name }) => `${area} is not linked to ${name}, and has more cases than usual.`,
  outsideNearUsual: ({ name }) => `Areas not linked to ${name} have about the usual number of cases.`,
  exposureMentioned: ({ name, count, type }) => `${count} ${count === 1 ? "card" : "cards"} from areas linked to ${name} mention${count === 1 ? "s" : ""} ${type}.`,
  nameMentioned: ({ name, count }) => `${name} is mentioned by name on ${count} ${count === 1 ? "card" : "cards"}.`,
};
