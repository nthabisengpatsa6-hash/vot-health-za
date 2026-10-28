import { ADVICE_TEXT, HOTLINES, telLink } from "../config/hotlines";
import { TEXT_LIMITS } from "../config/cardOptions";
import { PRODUCT_NAME } from "../config/product";
import { PhoneIcon } from "./Icons";
import Message from "./Message";

// What goes under the cards: the transcript to check, and the fixed notices
// that processNote's flags switch on. Every sentence here is written in the
// app; none of it comes from the model, apart from the clinician's own words
// in the NMC reminder (set in the clinician's serif).
export default function NoteNotices({ note, transcript, onTranscriptChange, readOnly = false }) {
  return (
    <div className="note-notices">
      <Message kind="check">Check the transcript. {PRODUCT_NAME} can miss or mishear words, especially in languages other than English. Remove any names before confirming.</Message>
      <details className="transcript">
        <summary>What we heard</summary>
        <label className="sub-field">
          <span className="sub-label">{readOnly ? "Transcript" : "Transcript (you can edit it)"}</span>
          <textarea className="input textarea voice" rows={6} maxLength={TEXT_LIMITS.transcriptClean} value={transcript} readOnly={readOnly} onChange={(e) => onTranscriptChange(e.target.value)} />
        </label>
      </details>

      {note.singleSource && <Message kind="check">Only one transcription came back. Please check carefully.</Message>}

      {note.adviceRequested && (
        <Message kind="info">
          <p>{ADVICE_TEXT}</p>
          <ul className="hotlines">
            {HOTLINES.map((line) => (
              <li key={line.name}>
                {line.number ? <a className="hotline" href={telLink(line.number)}><PhoneIcon /><span>{line.name}</span><strong>{line.number}</strong></a> : <span className="hotline">{line.name}</span>}
              </li>
            ))}
          </ul>
        </Message>
      )}

      {note.notifiableConditionMentioned && (
        <Message kind="info">You mentioned <span className="voice-inline">{note.notifiableConditionMentioned}</span>. If it's a notifiable medical condition, remember to notify it through the NMC system.</Message>
      )}
    </div>
  );
}
