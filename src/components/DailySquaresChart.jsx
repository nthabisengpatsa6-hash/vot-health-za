export default function DailySquaresChart({ chart, level }) {
  const step = 12, bottom = Math.max(4, ...chart.days.map((day) => Math.ceil(Math.max(day.cases, day.usual.cases) / chart.scale))) * step + 12;
  const width = 14 * 20, height = bottom + 28;
  const usualLine = chart.days.map((day, i) => `${i * 20 + 10},${bottom - day.usual.cases / chart.scale * step}`).join(" ");
  return (
    <section className="daily-chart" aria-label="Daily cases">
      <h2>Daily cases</h2>
      <p className="note">{chart.scale === 5 ? "One square represents 5 cases. A partial square shows the remaining cases." : "One square represents 1 case."}</p>
      <svg className={`daily-squares level-${level}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Cases over 14 days, with a dashed usual line. Exact counts and linked cards follow.">
        {chart.days.map((day, index) => Array.from({ length: Math.ceil(day.cases / chart.scale) }, (_, square) => {
          const fraction = Math.min(1, (day.cases - square * chart.scale) / chart.scale), y = bottom - (square + fraction) * step;
          return <rect key={`${day.date}-${square}`} x={index * 20 + 5} y={y} width="10" height={Math.max(1, fraction * 10)} rx="2" className={(square + 1) * chart.scale <= day.usual.cases ? "square-usual" : "square-raised"} />;
        }))}
        <polyline points={usualLine} className="usual-line" />
        <text x="4" y="14" className="usual-label">Usual</text>
        {[0, 6, 13].map((index) => <text key={index} x={index * 20 + 5} y={bottom + 22} className="chart-date" textAnchor={index === 13 ? "end" : "start"}>{index === 13 ? "Today" : chart.days[index].date.slice(5)}</text>)}
      </svg>
      <details className="chart-evidence"><summary>Daily counts and cards</summary><ul>{chart.days.map((day) => <li key={day.date}>{day.date}: {day.cases} cases; usual about {Math.round(day.usual.cases * 100) / 100}. {day.cardIds.length ? <a href={`#card-${day.cardIds[0]}`}>View {day.cards} cards</a> : "No cards recorded."}</li>)}</ul></details>
    </section>
  );
}
