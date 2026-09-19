import { useSearchSession } from "./hooks/useSearchSession";
import { SearchInputForm } from "./components/search/SearchInputForm";
import { ResultsScreen } from "./components/results/ResultsScreen";
import { FrozenSummaryView } from "./components/frozen/FrozenSummaryView";
import { LoadingIndicator } from "./components/shared/LoadingIndicator";
import { ErrorBanner } from "./components/shared/ErrorBanner";

/**
 * Why this file exists: the single place that reads `state.status` and
 * decides which screen to mount. It is intentionally the only file in the
 * app that both calls useSearchSession AND imports every screen component -
 * every screen below it only ever sees the slice of state and the callbacks
 * relevant to itself, never the raw state machine. This is the seam that
 * lets any one screen be redesigned without the others knowing it happened.
 */
export default function App() {
  const session = useSearchSession();
  const { state } = session;

  return (
    <div className="min-h-screen bg-brand-cream px-4 py-10">
      <header className="mx-auto mb-8 w-full max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-moss">Flexiple</p>
      </header>

      <main>
        {state.status === "idle" && <SearchInputForm onSubmit={session.submitQuery} />}

        {state.status === "interpreting" && (
          <div className="mx-auto flex w-full max-w-2xl justify-center">
            <LoadingIndicator label="Reading your search and drafting filters..." />
          </div>
        )}

        {state.status === "running" && (
          <div className="mx-auto flex w-full max-w-2xl justify-center">
            <LoadingIndicator label="Scoring candidates against the rubric..." />
          </div>
        )}

        {(state.status === "results" || state.status === "refining") && (
          <ResultsScreen
            query={state.query}
            filters={state.filters}
            rubric={state.rubric}
            matchCount={state.matchCount}
            results={state.results}
            whatChanged={state.status === "results" ? state.whatChanged : null}
            isRefining={state.status === "refining"}
            onEditFilters={session.editFilters}
            onEditRubric={session.editRubric}
            onRerunWithEditedFilters={session.rerunWithEditedFilters}
            onSubmitFeedback={session.submitRecruiterFeedback}
            onFreeze={session.freezeSearch}
          />
        )}

        {state.status === "frozen" && (
          <FrozenSummaryView
            filters={state.filters}
            rubric={state.rubric}
            results={state.results}
            onStartNewSearch={session.startNewSearch}
          />
        )}

        {state.status === "error" && (
          <div className="mx-auto w-full max-w-2xl">
            <ErrorBanner
              stage={state.stage}
              message={state.message}
              onRetry={session.retryLastAction}
              onDismiss={session.dismissError}
            />
          </div>
        )}
      </main>
    </div>
  );
}
