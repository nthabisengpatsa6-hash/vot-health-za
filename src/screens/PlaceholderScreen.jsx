// Stands in for a screen that hasn't been built yet and says when it arrives.
export default function PlaceholderScreen({ title, day, summary, children }) {
  return (
    <section className="screen">
      <h1>{title}</h1>
      <p className="lead">{summary}</p>
      <p className="arrives">Arrives on Day {day}</p>
      {children}
    </section>
  );
}
