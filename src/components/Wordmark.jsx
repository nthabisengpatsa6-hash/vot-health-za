import { PRODUCT_NAME } from "../config/product";

// The wordmark (docs/DESIGN.md, Logo): the name in lowercase, with its "o"
// drawn as the ring from the mark. The letters come from PRODUCT_NAME, split
// at its first "o". Screen readers get the name once, as one image.
// colour is "indigo" (the default) or "white", for indigo backgrounds.
export default function Wordmark({ colour = "indigo", size = "header" }) {
  const name = PRODUCT_NAME.toLowerCase();
  const ring = name.indexOf("o");
  let className = "wordmark";
  if (size === "large") className += " is-large";
  if (colour === "white") className += " is-white";

  if (ring === -1) return <span className={className}>{name}</span>;

  return (
    <span className={className} role="img" aria-label={PRODUCT_NAME}>
      {name.slice(0, ring)}
      <svg className="wordmark-o" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <path d="M 66.5 21.5 A 33 33 0 1 1 44.3 17.5 A 37 37 0 0 1 84.5 30.5" fill="none" stroke="currentColor" strokeWidth="17" strokeLinecap="round" />
        <circle cx="50" cy="51" r="11" fill="currentColor" />
      </svg>
      {name.slice(ring + 1)}
    </span>
  );
}
