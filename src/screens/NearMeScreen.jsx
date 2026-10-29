import { Link } from "react-router";
import { LevelKey } from "../components/LevelBadge";
import Message from "../components/Message";
import TownMap from "../components/TownMap";
import { PRODUCT_NAME } from "../config/product";
import { nearMeMap, nearMeNote } from "../lib/replayText";
import { TOWN_FILE } from "../lib/townMap";

// Real cards aren't checked for signals until the server-side job (Day 6),
// so this screen claims no check (decision T3): it shows the town with the
// clinician's own area marked, and points to the replay. No Firestore reads.
export default function NearMeScreen({ area }) {
  const [notYet, howItWorks] = nearMeNote(PRODUCT_NAME);
  return (
    <section className="screen">
      <h1>Near me</h1>
      <TownMap yourArea={area} description={nearMeMap({ town: TOWN_FILE.town, area })} />
      <p>Your area: <strong>{area}</strong>. You can change it on the Profile screen.</p>
      <Message kind="info">
        <p>{notYet}</p>
        <p>{howItWorks}</p>
        <Link to="/demo" className="button button-secondary">Watch the replay</Link>
      </Message>
      <h2>What the levels will mean</h2>
      <LevelKey />
    </section>
  );
}
