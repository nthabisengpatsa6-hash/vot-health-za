import { Link } from "react-router";
import Message from "../components/Message";
import { PRODUCT_NAME } from "../config/product";
import { nearMeNote } from "../lib/replayText";

export default function TodayScreen({ area }) {
  const [notYet, howItWorks] = nearMeNote(PRODUCT_NAME);
  return <section className="screen"><h1>Today</h1><p>Your area: <strong>{area}</strong>. You can change it on the Profile screen.</p><Message kind="info"><p>{notYet}</p><p>{howItWorks}</p><Link to="/app/replay" state={{ today: true }} className="button button-secondary">Watch the replay</Link></Message></section>;
}
