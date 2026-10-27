import { PRODUCT_NAME } from "./product";

// Shown when a voice note asks about treatment. Fixed text, never model text:
// the app gives no medical advice (hard rule 6).
export const ADVICE_TEXT = `${PRODUCT_NAME} can't advise on treatment. Use your facility's protocols or official clinical guidelines.`;

// Numbers confirmed on each organisation's own pages on 27 Oct 2026 (see
// HANDOVER.md). A number that can't be confirmed is left null, and the name
// is shown on its own.
export const HOTLINES = [
  {
    // nicd.ac.za, situational update on Bundibugyo virus (29 June 2026):
    // "NICD Hotline at 0800 212 552 (a 24-hour service for healthcare
    // professionals only)".
    name: "NICD hotline for health professionals",
    number: "0800 212 552",
  },
  {
    // health.uct.ac.za Poisons information centre page, and
    // westerncape.gov.za "Know who you can call in an emergency":
    // Poisons Information Helpline 0861 555 777.
    name: "Poisons Information Centre helpline",
    number: "0861 555 777",
  },
];

// "0800 212 552" becomes "tel:0800212552".
export function telLink(number) {
  return `tel:${number.replace(/\s+/g, "")}`;
}
