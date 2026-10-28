import { AttentionIcon, DoneIcon, InfoIcon } from "./Icons";

const ICONS = { info: InfoIcon, check: AttentionIcon, error: AttentionIcon, ok: DoneIcon };

// An information or error message: a wash block with an icon. Never red,
// because red means Alert. "centred" is for one-line confirmations only.
export default function Message({ kind = "info", role, centred = false, children }) {
  const Icon = ICONS[kind];
  return (
    <div className={`message message-${kind}${centred ? " is-centred" : ""}`} role={role}>
      <Icon />
      <div className="message-body">{children}</div>
    </div>
  );
}
