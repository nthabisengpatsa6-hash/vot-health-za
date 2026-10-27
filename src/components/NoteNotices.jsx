import { ADVICE_TEXT, HOTLINES, telLink } from "../config/hotlines";
import { TEXT_LIMITS } from "../config/cardOptions";
import { PRODUCT_NAME } from "../config/product";

// What goes under the cards: the transcript to check, and the fixed notices
// that processNote's flags switch on. Every sentence here is written in the
// app; none of it comes from the model, apart from the clinician's own words
// in the NMC reminder.
export default function NoteNotices({ note, transcript, onTranscriptChange, readOnly = false }) {
  return (
    <div className="note-notices">
      <p className="message message-check">Check the transcript. {PRODUCT_NAME} can miss or mishear words, especially in languages other than English. Remove any names before confirming.</p>
      <details className="transcript">
        <summary>What we heard</summary>
        <label className="sub-field">
          <span className="sub-label">{readOnly ? "Transcript" : "Transcript (you can edit it)"}</span>
          <textarea className="input textarea" rows={6} maxLength={TEXT_LIMITS.transcriptClean} value={transcript} readOnly={readOnly} onChange={(e) => onTranscriptChange(e.target.value)} />
        </label>
      </details>

      {note.singleSource && <p className="message message-check">Only one transcription came back. Please check carefully.</p>}

      {note.adviceRequested && (
        <div className="message message-info">
          <p>{ADVICE_TEXT}</p>
          <ul className="hotlines">
            {HOTLINES.map((line) => (
              <li key={line.name}>
                {line.number ? <a className="hotline" href={telLink(line.number)}><span>{line.name}</span><strong>{line.number}</strong></a> : <span className="hotline">{line.name}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {note.notifiableConditionMentioned && (
        <p className="message message-info">You mentioned {note.notifiableConditionMentioned}. If it's a notifiable medical condition, remember to notify it through the NMC system.</p>
      )}
    </div>
  );
}
