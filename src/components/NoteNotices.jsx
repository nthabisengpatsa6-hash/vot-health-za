import { ADVICE_TEXT, HOTLINES, telLink } from "../config/hotlines";
import { PRODUCT_NAME } from "../config/product";
import { PhoneIcon } from "./Icons";
import Message from "./Message";

// What goes under the cards: the transcript to check, and the fixed notices
// that processNote's flags switch on. Every sentence here is written in the
// app; none of it comes from the model, apart from the clinician's own words
// (the transcript and the NMC reminder, set in the clinician's serif).
export default function NoteNotices({ note }) {
  const transcript = (note.transcriptClean || "").trim();
  return (
    <div className="note-notices">
      {/* Read only: the transcript is shown for checking and never saved, so
          corrections go into the card. */}
      {transcript && (
        <>
          <Message kind="check">Check the transcript. {PRODUCT_NAME} can miss or mishear words, especially in languages other than English. Remove any names before confirming.</Message>
          <details className="transcript">
            <summary>What we heard</summary>
            <blockquote className="transcript-words voice">“{transcript}”</blockquote>
            {note.isReport && <p className="note">Not saved. Fix anything wrong in the card above.</p>}
          </details>
        </>
      )}

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
