const STAGE_COPY: Record<string, string> = {
  interpret: "understanding your search",
  run: "running the search",
  refine: "applying your feedback",
};

/**
 * Why this file exists: the one designed error state every failure in the
 * loop (timeout, rate limit, malformed LLM output, network failure) funnels
 * through, so a recruiter is never left looking at a blank screen or a raw
 * stack trace. Takes plain strings, not an Error object - it never needs to
 * know what threw, only what happened and how to recover, which keeps it
 * fully decoupled from the state machine and API layer.
 */
export function ErrorBanner({
  stage,
  message,
  onRetry,
  onDismiss,
}: {
  stage: "interpret" | "run" | "refine";
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-xl border border-brand-clay/40 bg-brand-clay/10 p-5">
      <p className="text-sm font-semibold text-brand-clay">
        Something went wrong while {STAGE_COPY[stage] ?? "talking to the model"}.
      </p>
      <p className="mt-1 text-sm text-brand-ink/70">{message}</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onRetry}
          className="rounded-lg bg-brand-clay px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          Try again
        </button>
        <button
          onClick={onDismiss}
          className="rounded-lg border border-brand-clay/40 px-3 py-1.5 text-sm font-medium text-brand-clay hover:bg-brand-clay/10"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
