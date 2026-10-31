import { PRODUCT_NAME } from "../config/product.js";

// Only the new app cap is handled here. Existing failures keep their copy.
export function appNoteLimitMessage(error) {
  if (error?.code !== "functions/resource-exhausted" || error?.details?.reason !== "app-note-limit") return null;
  return `${PRODUCT_NAME} has reached today's limit for live notes. Try again after midnight, or explore the replay.`;
}
