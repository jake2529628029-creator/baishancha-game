import { evaluateCondition } from "../../engine/condition-evaluator/condition-evaluator";
import { useGameStore } from "../../stores/game-store";
import type { JournalEntry } from "../../types/story";

const categoryConfig: Record<
  JournalEntry["category"],
  { label: string; index: string; empty: string }
> = {
  fact: {
    label: "已确认事实",
    index: "FACT",
    empty: "尚未确认足够可靠的事实。"
  },
  hypothesis: {
    label: "当前推测",
    index: "HYPOTHESIS",
    empty: "证据尚不足以形成可检验的推测。"
  },
  question: {
    label: "未解决疑点",
    index: "OPEN QUESTION",
    empty: "继续调查，新的矛盾会被记录在这里。"
  }
};

export function DetectiveJournal() {
  const story = useGameStore((state) => state.story);
  const currentChapterId = useGameStore((state) => state.currentChapterId);
  const completedChapterIds = useGameStore((state) => state.completedChapterIds);
  const completedObjectiveIds = useGameStore((state) => state.completedObjectiveIds);
  const viewedContentIds = useGameStore((state) => state.viewedContentIds);
  const discoveredObservationIds = useGameStore(
    (state) => state.discoveredObservationIds
  );
  const collectedEvidenceIds = useGameStore((state) => state.collectedEvidenceIds);
  const completedDialogueIds = useGameStore((state) => state.completedDialogueIds);
  const reasoningResults = useGameStore((state) => state.reasoningResults);
  const flags = useGameStore((state) => state.flags);

  if (!story || !currentChapterId) {
    return null;
  }

  const chapter = story.chapters[currentChapterId];
  const conditionContext = {
    completedChapterIds,
    completedObjectiveIds,
    viewedContentIds,
    discoveredObservationIds,
    collectedEvidenceIds,
    completedDialogueIds,
    reasoningResults,
    flags
  };
  const visibleEntries = chapter.journalEntries.filter(
    (entry) =>
      evaluateCondition(entry.revealCondition, conditionContext) &&
      (!entry.retireCondition ||
        !evaluateCondition(entry.retireCondition, conditionContext))
  );

  return (
    <section className="journal-panel">
      <header className="stage-heading">
        <div>
          <p className="section-label">自动更新 · 只记录已验证信息</p>
          <h2>侦探日志</h2>
        </div>
        <span>{visibleEntries.length} 条有效记录</span>
      </header>
      <p className="scene-description">
        日志会随调查自动修订。被新证据否定的旧推测不会继续冒充“当前结论”。
      </p>

      <div className="journal-columns">
        {(Object.keys(categoryConfig) as JournalEntry["category"][]).map(
          (category) => {
            const config = categoryConfig[category];
            const entries = visibleEntries.filter(
              (entry) => entry.category === category
            );

            return (
              <section className={`journal-column journal-column--${category}`} key={category}>
                <header>
                  <span>{config.index}</span>
                  <h3>{config.label}</h3>
                  <strong>{String(entries.length).padStart(2, "0")}</strong>
                </header>
                {entries.length ? (
                  <ol>
                    {entries.map((entry) => (
                      <li key={entry.id}>
                        <span>{String(entries.indexOf(entry) + 1).padStart(2, "0")}</span>
                        <div>
                          <h4>{entry.title}</h4>
                          <p>{entry.text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="journal-empty">{config.empty}</p>
                )}
              </section>
            );
          }
        )}
      </div>
    </section>
  );
}
