import { useRef } from 'react';

interface Quest {
  id: string;
  label: string;
  done: boolean;
}

/** Nothing theme: one LED bar per daily goal. Breathes red while owed, lights white once done. */
export function GlyphStrip({ quests }: { quests: Quest[] }) {
  const done = quests.filter((q) => q.done).length;
  // only flash bars that turn on while you watch, not everything that was already lit on mount;
  // a flashed bar keeps its class (the animation runs once) until the goal is undone
  const lit = useRef<Set<string> | null>(null);
  const flashed = useRef(new Set<string>());
  for (const q of quests) {
    if (!q.done) flashed.current.delete(q.id);
    else if (lit.current && !lit.current.has(q.id)) flashed.current.add(q.id);
  }
  lit.current = new Set(quests.filter((q) => q.done).map((q) => q.id));

  return (
    <section className="glyph" aria-label={`${done} of ${quests.length} daily goals done`}>
      <div className="glyph-head">
        <span>Glyph</span>
        <span className="glyph-count">
          {done}/{quests.length}
        </span>
      </div>
      <div className="glyph-bars" style={{ ['--n' as string]: quests.length }}>
        {quests.map((q) => {
          const flash = flashed.current.has(q.id);
          return (
            <div key={q.id} className={`glyph-bar${q.done ? ' lit' : ''}${flash ? ' flash' : ''}`}>
              <i />
              <span>{q.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
