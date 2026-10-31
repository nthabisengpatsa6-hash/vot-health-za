import { useEffect, useMemo, useRef, useState } from "react";
import { buildDraftInput, draftRankingFor } from "../../functions/shared/draft/input.mjs";
import { DRAFT_FOOTER, fallbackLabel, notificationText, standardDraft } from "../../functions/shared/draft/standard.mjs";
import { validateDraft } from "../../functions/shared/draft/validate.mjs";
import Waveform from "./Waveform";
import Message from "./Message";

export function DraftEditor({ draft, label, loading = false, capped = false, edited = false, sent = false, notice = "", onDraft, onEdit, onCopy, onSent }) {
  return (
    <section className="notification-draft" aria-labelledby="draft-title" aria-busy={loading}>
      <h2 id="draft-title">Drafted notification</h2>
      <p className="note draft-label">{label}</p>
      {onDraft && <button type="button" className="button button-primary" disabled={loading || capped} onClick={onDraft}>Draft with Muse Spark Open</button>}
      {loading && <div className="ranking-progress" role="status"><Waveform /><p>Drafting the notification. Please keep this screen open.</p></div>}
      <p>To: District environmental health</p>
      {edited && <p className="note">Edited by you.</p>}
      <label className="draft-field">Subject<input type="text" value={draft.subject} maxLength={100} onChange={(event) => onEdit("subject", event.target.value)} /></label>
      <label className="draft-field">Body<textarea value={draft.body} maxLength={1200} rows={12} onChange={(event) => onEdit("body", event.target.value)} /></label>
      <p className="note draft-footer">{DRAFT_FOOTER}</p>
      <div className="draft-actions"><button type="button" className="button button-secondary" onClick={onCopy}>Copy</button><button type="button" className="button button-secondary" onClick={onSent}>Mark as sent</button></div>
      {notice && <p role="status">{notice}</p>}
      {sent && <Message kind="info" role="status">Marked as sent. This is a simulation, so nothing was saved or sent.</Message>}
    </section>
  );
}

export default function DraftedNotification({ signal, day, area, town, entry, onDraft, publicDemo = true }) {
  const ranking = useMemo(() => draftRankingFor(signal, entry, day), [signal, entry, day]);
  const input = useMemo(() => buildDraftInput(signal, { day, town, ranking }), [signal, day, town, ranking]);
  const [draft, setDraft] = useState(() => standardDraft(input));
  const [result, setResult] = useState(null), [loading, setLoading] = useState(false), [edited, setEdited] = useState(false), [sent, setSent] = useState(false), [notice, setNotice] = useState("");
  const active = useRef(false), busy = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const run = async () => {
    if (!onDraft || busy.current) return;
    busy.current = true; setLoading(true); setNotice("");
    try {
      const reply = await onDraft({ day, symptomGroup: signal.symptomGroup, area, ...(ranking ? { ranking } : {}) });
      if (!active.current) return;
      const checked = reply?.outcome === "model" ? validateDraft(reply.draft, input, town) : null;
      if (checked?.ok && Number.isFinite(reply.ms) && reply.ms >= 0) { setDraft(checked.draft); setResult({ outcome: "model", ms: reply.ms }); }
      else { setDraft(standardDraft(input)); setResult({ outcome: "fallback", reason: reply?.outcome === "fallback" ? reply.reason : "invalid" }); }
      setEdited(false); setSent(false);
    } catch { if (active.current) { setDraft(standardDraft(input)); setResult({ outcome: "fallback", reason: "unavailable" }); setEdited(false); setSent(false); } }
    finally { busy.current = false; if (active.current) setLoading(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(notificationText(draft)); if (active.current) setNotice("Copied subject and body, including the reminder."); } catch { if (active.current) setNotice("Copy didn't finish. Select the subject and body to copy them."); } };
  const label = !onDraft ? (publicDemo ? "Standard draft. Sign in to draft with Muse Spark Open." : "Standard draft. Live drafting is available at Signal or Alert in the seeded replay.") : result?.outcome === "model" ? `Drafted by Muse Spark Open on Baseten just now, in ${(result.ms / 1000).toFixed(1)} s.` : result ? fallbackLabel(result.reason) : "Standard draft.";
  return <><p className="note">{ranking ? "Drafting uses eligible sources from this day's ranking." : "Drafting uses the current candidate order, without confidence words."}</p><DraftEditor draft={draft} label={label} loading={loading} capped={["account-cap", "app-cap"].includes(result?.reason)} edited={edited} sent={sent} notice={notice} onDraft={onDraft ? run : undefined} onEdit={(field, value) => { setDraft((current) => ({ ...current, [field]: value })); setEdited(true); setSent(false); }} onCopy={copy} onSent={() => setSent(true)} /></>;
}
