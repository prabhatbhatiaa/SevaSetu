import { useMemo, useState } from 'react';
import { Avatar, ScoreRing, cn } from '../ui';
import { RadarChart } from '../charts';
import { FactorBreakdown, toRadarValues } from '../matching/FactorBreakdown';
import { MATCH_FACTORS } from '../../lib/constants';
import { Scene } from '../three/Scene';

// Illustrative volunteers. Scores are combined with the platform's real weights.
const SAMPLE_VOLUNTEERS = [
  {
    name: 'Meera Kapoor',
    note: '1.2 km · Form filling, Hindi',
    breakdown: { skillScore: 100, distanceScore: 96, availabilityScore: 100, categoryScore: 100, ratingScore: 96 },
  },
  {
    name: 'Arjun Verma',
    note: '3.8 km · Online forms',
    breakdown: { skillScore: 67, distanceScore: 74, availabilityScore: 75, categoryScore: 75, ratingScore: 92 },
  },
  {
    name: 'Kabir Singh',
    note: '9.4 km · Tutoring',
    breakdown: { skillScore: 34, distanceScore: 38, availabilityScore: 20, categoryScore: 15, ratingScore: 88 },
  },
];

const weightedScore = (breakdown) =>
  Math.round(MATCH_FACTORS.reduce((total, factor) => total + (breakdown[factor.key] * factor.weight) / 100, 0));

function MatchDemo({ selected, onSelect }) {
  const volunteer = SAMPLE_VOLUNTEERS[selected];

  return (
    <div className="rounded-2xl sm:rounded-3xl border bg-surface p-4 sm:p-7 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.45)]">
      <p className="eyebrow">Incoming request</p>
      <h3 className="mt-2 sm:mt-3 text-lg sm:text-xl font-medium tracking-tight">Help filling pension forms</h3>
      <p className="mt-1 text-xs sm:text-sm text-muted">Document Assistance · Sector 14 · Saturday morning</p>

      <div className="mt-4 sm:mt-5 divide-y border-y" role="listbox" aria-label="Candidate volunteers">
        {SAMPLE_VOLUNTEERS.map((candidate, index) => (
          <button
            key={candidate.name}
            type="button"
            role="option"
            aria-selected={index === selected}
            onClick={() => onSelect(index)}
            className={cn(
              'flex w-full items-center gap-2.5 sm:gap-3 py-2.5 sm:py-3.5 text-left transition-opacity',
              index === selected ? 'opacity-100' : 'opacity-45 hover:opacity-80',
            )}
          >
            <Avatar name={candidate.name} size={30} className="sm:h-[34px] sm:w-[34px]" />
            <span className="flex-1 min-w-0">
              <span className="block text-xs sm:text-sm font-medium truncate">{candidate.name}</span>
              <span className="block text-[11px] sm:text-xs text-muted truncate">{candidate.note}</span>
            </span>
            <span className="font-mono text-xs sm:text-sm shrink-0">{weightedScore(candidate.breakdown)}%</span>
          </button>
        ))}
      </div>

      <div className="mt-5 sm:mt-6 grid items-center gap-5 sm:gap-6 sm:grid-cols-[auto_1fr]">
        <div className="flex items-center justify-center gap-4 sm:gap-6 sm:flex-col">
          <ScoreRing value={weightedScore(volunteer.breakdown)} size={78} label="match" className="sm:scale-110" />
          <div className="scale-90 sm:scale-100">
            <RadarChart size={150} values={toRadarValues(volunteer.breakdown)} />
          </div>
        </div>
        <FactorBreakdown breakdown={volunteer.breakdown} />
      </div>

      <p className="mt-4 sm:mt-5 text-[11px] sm:text-xs text-subtle">Illustrative example. Scores use the platform’s real weights.</p>
    </div>
  );
}

/** The five weights as one proportional strip. */
function WeightStrip() {
  return (
    <div className="mt-5 sm:mt-6">
      <div className="flex h-9 sm:h-12 gap-1 overflow-hidden rounded-lg sm:rounded-xl" role="img" aria-label="Match score weights">
        {MATCH_FACTORS.map((factor, index) => (
          <div
            key={factor.key}
            className="flex items-end rounded-md sm:rounded-lg bg-ink px-2 sm:px-3 pb-1.5 sm:pb-2 text-canvas"
            style={{ width: `${factor.weight}%`, opacity: 1 - index * 0.16 }}
          >
            <span className="font-mono text-[10px] sm:text-[11px]">{factor.weight}%</span>
          </div>
        ))}
      </div>
      <ul className="mt-2.5 sm:mt-3 flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 text-[11px] sm:text-xs text-muted">
        {MATCH_FACTORS.map((factor) => (
          <li key={factor.key}>
            {factor.label} <span className="font-mono text-subtle">{factor.weight}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The matching engine: an orbit of volunteers around a request, and a playable demo. */
export function MatchingEngine() {
  const [selected, setSelected] = useState(0);
  const orbitInput = useMemo(() => ({ selected }), [selected]);

  return (
    <section id="matching" data-act="matching" className="scroll-mt-16 py-10 sm:py-16 lg:py-20">
      <div className="container-page grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
        <div className="reveal">
          <p className="eyebrow">The matching engine</p>
          <h2 className="display mt-3 sm:mt-4 text-[30px] sm:text-5xl lg:text-6xl leading-[1.12]">
            Not a list. A ranking you can <em>read</em>.
          </h2>
          <p className="mt-3 sm:mt-5 max-w-md text-[14px] sm:text-[17px] leading-relaxed text-muted">
            Every match shows why it scored the way it did. Five weighted factors, each one visible, each one explained
            in plain language. No black box.
          </p>
          <Scene name="orbit" input={orbitInput} className="hidden lg:block mt-2 h-[300px]" />
          <WeightStrip />
        </div>

        <div className="reveal self-center" style={{ '--delay': '120ms' }}>
          <MatchDemo selected={selected} onSelect={setSelected} />
        </div>
      </div>
    </section>
  );
}
