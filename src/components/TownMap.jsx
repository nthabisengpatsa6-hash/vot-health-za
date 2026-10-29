import { useEffect, useId, useRef, useState } from "react";
import { areaLayers, GRID, MAP_AREAS } from "../lib/townMap";
import { DensePrint, SparsePrint } from "./LevelBadge";

// The demo town as a piece of indigo cloth (docs/DESIGN.md, "The map"):
// plain shapes on the town file's grid, no tiles and no real streets. With
// onSelect, each area's name is a real button (a tap on the shape works too);
// without it, the map is one picture with a spoken description. Lines and
// dashes are drawn in screen pixels, and the prints are scaled so they stay
// 12 and 16 px whatever the map's size.
export default function TownMap({ levels = {}, selected = null, onSelect = null, yourArea = null, description }) {
  const drawing = useRef(null);
  const labels = useRef({});
  const [width, setWidth] = useState(350);
  // Pattern and clip ids must be unique on the page, and safe inside url(#…).
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    observer.observe(drawing.current);
    return () => observer.disconnect();
  }, []);

  const printScale = `scale(${GRID.width / width})`;
  const choose = (name) => onSelect(name, labels.current[name]);
  const outlined = MAP_AREAS.filter((area) => area.name === selected || area.name === yourArea);

  return (
    <div className="town-map" role={onSelect ? "group" : "img"} aria-label={description}>
      <div className="town-map-inner">
        <svg ref={drawing} className="town-map-drawing" viewBox={`0 0 ${GRID.width} ${GRID.height}`} aria-hidden="true" focusable="false">
          <defs>
            <DensePrint id={`dense${id}`} transform={printScale} />
            <SparsePrint id={`sparse${id}`} transform={printScale} />
            {MAP_AREAS.map((area, index) => <clipPath key={area.name} id={`inside${id}${index}`}><path d={area.path} /></clipPath>)}
          </defs>
          {MAP_AREAS.map((area, index) => {
            const layers = areaLayers(levels[area.name]);
            // Every layer is always drawn and only shown or hidden, so a level
            // change can fade in (docs/DESIGN.md, Motion).
            return (
              <g key={area.name} className={onSelect ? "map-shape is-choosable" : "map-shape"} onClick={onSelect ? () => choose(area.name) : undefined}>
                <path className={`map-area is-${layers.fill}`} d={area.path} />
                <path className={`map-print${layers.print === "sparse" ? " is-on" : ""}`} d={area.path} fill={`url(#sparse${id})`} />
                <path className={`map-print${layers.print === "dense" ? " is-on" : ""}`} d={area.path} fill={`url(#dense${id})`} />
                {/* Twice as wide and clipped to the shape: 3 px show just inside its edge. */}
                <path className={`map-watch${layers.watchOutline ? " is-on" : ""}`} d={area.path} clipPath={`url(#inside${id}${index})`} />
              </g>
            );
          })}
          {outlined.map((area) => <path key={area.name} className="map-outline" d={area.path} />)}
        </svg>

        {MAP_AREAS.map((area) => {
          const { word } = areaLayers(levels[area.name]);
          const [x, y] = area.label.at;
          const style = { left: `${x}%`, top: `${(y / GRID.height) * 100}%`, maxWidth: `${area.label.width}%` };
          const text = (
            <span className={word ? "map-chip" : "map-name"}>
              <span>{area.name}</span>
              {word && <span>{word}</span>}
              {area.name === yourArea && <span className="map-tag">Your area</span>}
            </span>
          );
          if (!onSelect) return <span key={area.name} className="map-label" style={style}>{text}</span>;
          return <button key={area.name} ref={(element) => { labels.current[area.name] = element; }} type="button" className="map-label" style={style} aria-expanded={area.name === selected} onClick={() => choose(area.name)}>{text}</button>;
        })}
      </div>
    </div>
  );
}
