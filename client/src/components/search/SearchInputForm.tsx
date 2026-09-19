import { useState } from "react";

const EXAMPLE = "RDS developers with 4-7 years of experience who have worked at startups, for a role based in Bangalore";

/**
 * Why this file exists: the entire "first load" screen, and the only
 * component that owns the free-text query as local, ephemeral input state.
 * It never calls the API itself - it hands the finished string to
 * `onSubmit` and lets the smart layer (useSearchSession) decide what
 * happens next, which is what keeps it swappable/testable on its own.
 */
export function SearchInputForm({ onSubmit }: { onSubmit: (query: string) => void }) {
  const [query, setQuery] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (query.trim()) onSubmit(query.trim());
      }}
      className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 text-center"
    >
      <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">Who are you looking for?</h1>
      <p className="text-brand-moss">
        Describe the role like you'd type a search - skills, experience, location, company background.
      </p>
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={EXAMPLE}
        rows={3}
        className="w-full resize-none rounded-2xl border border-brand-mist bg-white p-4 text-base shadow-sm outline-none focus:border-brand-forest focus:ring-2 focus:ring-brand-sage"
      />
      <button
        type="submit"
        disabled={!query.trim()}
        className="rounded-xl bg-brand-forest px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Find candidates
      </button>
    </form>
  );
}
