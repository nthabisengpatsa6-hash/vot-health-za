import { PRODUCT_NAME } from "./product.js";

export const MODEL_NAMES = { "muse-spark-1.3": "Muse Spark 1.3" };
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
export const RANKING_FOOTER = "Muse Spark ranks possibilities from the evidence above. It does not confirm a cause. A person decides what happens next.";
export const FAILED = "Live ranking didn't finish. The saved ranking is still shown.";
export const CAPPED = "Today's live-ranking limit is reached. The saved ranking is still shown.";
export const NO_SAVED = "No saved ranking for this signal yet.";
export const EVIDENCE_INTRO = `${PRODUCT_NAME}'s evidence`;
export const LIVE_REPLAY_FOOTER = "The town and cards are made up. Live ranking runs on the server; its result is not saved.";
