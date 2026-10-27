import { AGE_GROUPS, CASE_COUNT_MAX, COMPARED_WITH_USUAL, EXPOSURE_TYPES, OBSERVATIONS, ONSETS, SYMPTOM_GROUPS, TEXT_LIMITS } from "../config/cardOptions";
import { fieldsToFix, isFilled } from "../lib/cardDraft";
import { AREA_NAMES, TOWN } from "../lib/places";

// One case card for the clinician to check. Every field can be changed.
// Fields the AI was unsure of are highlighted, with the card's question
// above them, until they're answered.
export default function CaseCardForm({ draft, number, total, onChange }) {
  const prefix = `card-${number}`;
  const unsure = new Set(draft.unsureFields);
  const toFix = new Set(fieldsToFix(draft));
  const set = (changes) => onChange({ ...draft, ...changes });
  const title = total > 1 ? `Card ${number} of ${total}` : "Case card";

  if (draft.removed) {
    return (
      <div className="card-removed">
        <p>{title} removed.</p>
        <button type="button" className="text-button" onClick={() => set({ removed: false })}>Undo</button>
      </div>
    );
  }

  // Wraps one field: its label, its question when unsure, and whether it's
  // still needed.
  const field = (name, label, control, { question } = {}) => {
    const isUnsure = unsure.has(name);
    const answered = isFilled(draft, name);
    const ask = question || draft.questions[name];
    const labelId = `${prefix}-${name}-label`;
    const questionId = `${prefix}-${name}-question`;
    let className = "card-field";
    if (isUnsure) className += answered ? " card-field-unsure is-answered" : " card-field-unsure";
    return (
      <div className={className} role="group" aria-labelledby={isUnsure ? `${labelId} ${questionId}` : labelId}>
        {isUnsure && (
          <p className="card-question" id={questionId}>
            <span className="check-tag">{answered ? "Answered" : "Please check"}</span>
            {ask}
          </p>
        )}
        <p className="field-label" id={labelId}>{label}</p>
        {control({ labelId, describedBy: isUnsure ? questionId : undefined })}
        {!isUnsure && toFix.has(name) && <p className="field-hint field-needed">This is needed.</p>}
      </div>
    );
  };

  const showDescription = draft.symptomGroup === "something_unusual" || unsure.has("unusualDescription");
  const count = draft.caseCount;
  const areaQuestion = draft.areaHeard ? `You said ‘${draft.areaHeard}’. Which area is it?` : undefined;

  return (
    <section className="panel case-card" aria-labelledby={`${prefix}-title`}>
      <h2 id={`${prefix}-title`}>{title}</h2>

      {field("symptomGroup", "Symptom group", ({ labelId, describedBy }) => (
        <select className="input" value={draft.symptomGroup} aria-labelledby={labelId} aria-describedby={describedBy} onChange={(e) => set({ symptomGroup: e.target.value })}>
          <option value="" disabled>Choose a symptom group</option>
          {SYMPTOM_GROUPS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ))}

      {showDescription && field("unusualDescription", "What is unusual?", ({ labelId, describedBy }) => (
        <textarea className="input textarea" rows={3} maxLength={TEXT_LIMITS.unusualDescription} value={draft.unusualDescription} aria-labelledby={labelId} aria-describedby={describedBy} onChange={(e) => set({ unusualDescription: e.target.value })} />
      ))}

      {field("symptomsInWords", "Symptoms, in your words", ({ labelId, describedBy }) => (
        <textarea className="input textarea" rows={2} maxLength={TEXT_LIMITS.symptomsInWords} value={draft.symptomsInWords} aria-labelledby={labelId} aria-describedby={describedBy} onChange={(e) => set({ symptomsInWords: e.target.value })} />
      ))}

      {field("caseCount", "Number of cases", ({ labelId, describedBy }) => (
        <>
          <div className="stepper">
            <button type="button" className="stepper-button" aria-label="One fewer" disabled={!count || count <= 1} onClick={() => set({ caseCount: clampCount(Math.ceil(count) - 1) })}>−</button>
            <input className="input stepper-input" type="number" inputMode="numeric" min={1} max={CASE_COUNT_MAX} step={1} value={count ?? ""} aria-labelledby={labelId} aria-describedby={describedBy} onChange={(e) => set({ caseCount: e.target.value === "" ? null : Number(e.target.value) })} />
            <button type="button" className="stepper-button" aria-label="One more" disabled={count >= CASE_COUNT_MAX} onClick={() => set({ caseCount: count ? clampCount(Math.floor(count) + 1) : 1 })}>+</button>
          </div>
          {count !== null && !isFilled(draft, "caseCount") && <p className="field-hint field-needed">A whole number from 1 to {CASE_COUNT_MAX}.</p>}
        </>
      ))}

      {field("comparedWithUsual", "Compared with usual", () => (
        <ChoiceButtons options={COMPARED_WITH_USUAL} value={draft.comparedWithUsual} onChoose={(value) => set({ comparedWithUsual: value })} />
      ))}

      {field("ageGroup", "Age group", () => (
        <ChoiceButtons options={AGE_GROUPS} value={draft.ageGroup} onChoose={(value) => set({ ageGroup: value })} />
      ))}

      {field("area", `Area in ${TOWN}`, ({ labelId, describedBy }) => (
        <select className="input" value={draft.area ?? ""} aria-labelledby={labelId} aria-describedby={describedBy} onChange={(e) => set({ area: e.target.value })}>
          <option value="" disabled>Choose the area</option>
          {AREA_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      ), { question: unsure.has("area") ? areaQuestion : undefined })}

      {field("onset", "When it started", () => (
        <ChoiceButtons options={ONSETS} value={draft.onset} onChoose={(value) => set({ onset: value })} />
      ))}

      {field("exposure", "Shared exposure", ({ labelId }) => (
        <>
          <div className="chips">
            {EXPOSURE_TYPES.map((option) => {
              const on = draft.exposure.types.includes(option.value);
              const types = on ? draft.exposure.types.filter((type) => type !== option.value) : [...draft.exposure.types, option.value];
              return <button key={option.value} type="button" className="chip" aria-pressed={on} onClick={() => set({ exposure: { ...draft.exposure, types, none: false } })}>{option.label}</button>;
            })}
            {unsure.has("exposure") && <button type="button" className="chip" aria-pressed={draft.exposure.none} onClick={() => set({ exposure: { ...draft.exposure, types: [], none: !draft.exposure.none } })}>None</button>}
          </div>
          <label className="sub-field">
            <span className="sub-label">In your words</span>
            <input className="input" type="text" maxLength={TEXT_LIMITS.exposureWords} value={draft.exposure.words} aria-describedby={labelId} onChange={(e) => set({ exposure: { ...draft.exposure, words: e.target.value } })} />
          </label>
        </>
      ))}

      {field("observations", "Observations", () => (
        <>
          <div className="choices">
            {OBSERVATIONS.map((option) => (
              <label key={option.value} className="choice">
                <input type="checkbox" checked={draft.observations[option.value]} onChange={(e) => set({ observations: { ...draft.observations, [option.value]: e.target.checked, none: false } })} />
                <span>{option.label}</span>
              </label>
            ))}
            {unsure.has("observations") && (
              <label className="choice">
                <input type="checkbox" checked={draft.observations.none} onChange={(e) => set({ observations: { ...draft.observations, ...noFlags(), none: e.target.checked } })} />
                <span>None of these</span>
              </label>
            )}
          </div>
          {draft.observations.shortOfSupplies && (
            <label className="sub-field">
              <span className="sub-label">What is running short?</span>
              <input className="input" type="text" maxLength={TEXT_LIMITS.suppliesNote} value={draft.observations.suppliesNote} onChange={(e) => set({ observations: { ...draft.observations, suppliesNote: e.target.value } })} />
            </label>
          )}
        </>
      ))}

      <button type="button" className="text-button" onClick={() => set({ removed: true })}>This card isn't right</button>
    </section>
  );
}

// The − and + buttons always land on a count the rules accept.
function clampCount(value) {
  return Math.max(1, Math.min(CASE_COUNT_MAX, value));
}

function noFlags() {
  return Object.fromEntries(OBSERVATIONS.map((option) => [option.value, false]));
}

// One-tap answers. aria-pressed marks the chosen one for screen readers, and
// the styles use it too, so the choice isn't shown by colour alone.
function ChoiceButtons({ options, value, onChoose }) {
  return (
    <div className="choice-buttons">
      {options.map((option) => (
        <button key={option.value} type="button" className="choice-button" aria-pressed={value === option.value} onClick={() => onChoose(option.value)}>{option.label}</button>
      ))}
    </div>
  );
}
