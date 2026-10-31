import {PRODUCT_NAME} from "../product.mjs";

export const DRAFT_FOOTER = `Raised by ${PRODUCT_NAME} from clinicians' reports. ${PRODUCT_NAME} points to where to look; it does not confirm a cause. A person decided to send this. Notifiable medical conditions are still notified through the NMC system.`;
export function standardDraft(input) {
  const first = input.sources[0];
  const describe = (count) => `${count} ${count === 1 ? "card describes" : "cards describe"}`;
  return {subject:`${input.level[0].toUpperCase() + input.level.slice(1)} signal: ${input.symptomGroup}`,
    body:`A ${input.level} signal for ${input.symptomGroup.toLowerCase()} covers ${input.areas.join(", ")}.\n\n${input.cases} cases were reported on ${input.cards} cards in ${input.windowDays} days, against usually about ${input.usualCases}, from ${input.placesOfCare} places of care.\n\n${describe(input.observations.moreSevere)} patients as sicker than usual; ${describe(input.observations.notResponding)} patients not improving as usual.\n\n${first ? `Please review ${first.name} first as a possible source, alongside the other evidence. This does not confirm a cause.` : "Please review the linked evidence and possible shared exposures. No candidate source was identified."}`};
}
export function notificationText(draft) { return `${draft.subject}\n\n${draft.body}\n\n${DRAFT_FOOTER}`; }
export function fallbackLabel(reason, product = PRODUCT_NAME) {
  const reasons = {"no-key":"Muse Spark Open isn't configured here.", "account-cap":"Today's account drafting limit is reached.", "app-cap":"Today's app drafting limit is reached.", "counter-failed":"The drafting limit couldn't be checked.", timeout:"Muse Spark Open didn't finish in time.", unavailable:"Muse Spark Open isn't available right now.", invalid:`Muse Spark Open's draft didn't pass ${product}'s checks.`};
  return `Standard draft. ${reasons[reason] || reasons.unavailable}`;
}
