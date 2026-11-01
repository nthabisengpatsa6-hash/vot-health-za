export default function PracticeLabel({ practice }) {
  return practice ? <p className="pill">Practice card: no Meta key is set, so this card is made up and not from your recording.</p> : null;
}
