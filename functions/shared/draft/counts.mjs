// Presentation only: never feed these rounded counts back into signal maths.
export function usualCasesText(cases) {
  const rounded = Math.round(cases);
  return rounded === 0 ? "fewer than 1 case usually" : `about ${rounded} ${rounded === 1 ? "case" : "cases"} usually`;
}
