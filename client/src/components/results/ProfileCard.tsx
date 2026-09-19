import type { ReactNode } from "react";
import type { ScoredResult } from "../../types";
import { ThumbsDownIcon, ThumbsUpIcon } from "../shared/icons";

/**
 * Why this file exists: renders one ranked candidate and nothing else -
 * the profile, its score, the field-grounded explanation, and (optionally)
 * a thumbs control. It doesn't know it's part of a list, a refinement
 * round, or a frozen summary; ResultsScreen/FrozenSummaryView decide that
 * context and pass `position` in purely so the recruiter's free-text
 * feedback ("1 is too junior") lines up with what's on screen.
 */
export function ProfileCard({
  position,
  result,
  thumb,
  onThumbChange,
}: {
  position: number;
  result: ScoredResult;
  thumb?: "up" | "down" | null;
  onThumbChange?: (verdict: "up" | "down" | null) => void;
}) {
  const { profile, score, explanation } = result;

  return (
    <div className="rounded-xl border border-brand-mist bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-mist text-xs font-semibold text-brand-ink">
              {position}
            </span>
            <h4 className="font-semibold text-brand-ink">{profile.name}</h4>
          </div>
          <p className="mt-0.5 text-sm text-brand-moss">
            {profile.current_title} at {profile.current_company} · {profile.location}
          </p>
        </div>
        <ScorePill score={score} />
      </div>

      <p className="mt-2 text-sm text-brand-ink/80">{explanation}</p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {profile.skills.map((skill) => (
          <span key={skill} className="rounded-full bg-brand-mist/70 px-2 py-0.5 text-xs text-brand-moss">
            {skill}
          </span>
        ))}
      </div>

      {onThumbChange && (
        <div className="mt-3 flex items-center gap-2">
          <ThumbButton active={thumb === "up"} label="Good match" onClick={() => onThumbChange(thumb === "up" ? null : "up")}>
            <ThumbsUpIcon className="h-4 w-4" />
          </ThumbButton>
          <ThumbButton
            active={thumb === "down"}
            label="Not a match"
            onClick={() => onThumbChange(thumb === "down" ? null : "down")}
          >
            <ThumbsDownIcon className="h-4 w-4" />
          </ThumbButton>
        </div>
      )}
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  const tone =
    score >= 80
      ? "bg-brand-sage text-brand-forest"
      : score >= 60
        ? "bg-brand-mist text-brand-clay"
        : "bg-brand-mist text-brand-moss";
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{score}/100</span>;
}

function ThumbButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center justify-center rounded-lg border p-1.5 transition ${
        active ? "border-brand-forest bg-brand-sage text-brand-forest" : "border-brand-mist text-brand-moss hover:border-brand-clay"
      }`}
    >
      {children}
    </button>
  );
}
