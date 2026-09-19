import { useState } from "react";
import type { RefineFeedback, ThumbFeedback } from "../../types";

/**
 * Why this file exists: the free-text half of the refinement loop ("1 is
 * too junior, 2 and 4 are right"), kept separate from the per-card thumbs
 * buttons in ProfileCard since they're different interaction patterns that
 * happen to feed the same feedback object. This component owns only the
 * chat draft's local state; it bundles that with whatever thumbs
 * ResultsScreen has collected and hands the combined RefineFeedback
 * upward, so ResultsScreen never has to know how the draft text box works.
 */
export function ChatComposer({
  thumbs,
  disabled,
  onSubmit,
}: {
  thumbs: ThumbFeedback[];
  disabled?: boolean;
  onSubmit: (feedback: RefineFeedback) => void;
}) {
  const [message, setMessage] = useState("");
  const canSubmit = !disabled && (thumbs.length > 0 || message.trim().length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ thumbs, chat_message: message.trim() || undefined });
    setMessage("");
  };

  return (
    <div className="rounded-xl border border-brand-mist bg-white p-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-brand-moss">
          Tell it what's right or wrong (e.g. "1 is too junior, 2 and 4 are right")
        </span>
        <textarea
          value={message}
          disabled={disabled}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-lg border border-brand-mist px-3 py-1.5 text-sm outline-none focus:border-brand-forest focus:ring-2 focus:ring-brand-sage disabled:bg-brand-cream"
        />
      </label>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-brand-moss">
          {thumbs.length > 0 ? `${thumbs.length} candidate${thumbs.length > 1 ? "s" : ""} marked` : "Mark candidates or type feedback"}
        </span>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="rounded-lg bg-brand-forest px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Refine search
        </button>
      </div>
    </div>
  );
}
