import { useGameStore } from "../../stores/game-store";
import { createEmptyProgress } from "../../types/progress";
import type { StoryChapter } from "../../types/story";
import { createChapterReport } from "./chapter-report";

export function ChapterResult({ chapter }: { chapter: StoryChapter }) {
  const chapterStage = useGameStore((state) => state.chapterStage);
  const story = useGameStore((state) => state.story);
  const completedObjectiveIds = useGameStore(
    (state) => state.completedObjectiveIds
  );
  const discoveredObservationIds = useGameStore(
    (state) => state.discoveredObservationIds
  );
  const reasoningResults = useGameStore((state) => state.reasoningResults);
  const reasoningAttempts = useGameStore((state) => state.reasoningAttempts);
  const completeCurrentChapter = useGameStore(
    (state) => state.completeCurrentChapter
  );
  const completed = chapterStage === "completed";

  if (!story) {
    return null;
  }

  const report = createChapterReport(story, chapter, {
    ...createEmptyProgress(),
    currentChapterId: chapter.id,
    chapterStage,
    completedChapterIds: [],
    completedObjectiveIds,
    unlockedContentIds: [],
    viewedContentIds: [],
    discoveredObservationIds,
    collectedEvidenceIds: [],
    unlockedDialogueIds: [],
    completedDialogueIds: [],
    unlockedReasoningIds: [],
    reasoningResults,
    reasoningAttempts
  });

  return (
    <section className="chapter-result">
      <p className="eyebrow">{chapter.result.eyebrow}</p>
      <h2>{chapter.result.title}</h2>
      <p className="result-summary">{chapter.result.summary}</p>
      <div className="result-columns">
        <section>
          <p className="section-label">已经确认</p>
          <ul>
            {chapter.result.confirmedFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </section>
        <section>
          <p className="section-label">尚未解释</p>
          <ul>
            {chapter.result.unresolvedQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>
      </div>
      <blockquote>{chapter.result.closingLine}</blockquote>
      <section className="settlement-report">
        <header>
          <div>
            <p className="section-label">Chapter 01 · Settlement</p>
            <h3>调查结算报告</h3>
          </div>
          <div className="report-score">
            <strong>{report.score}</strong>
            <span>/ 100</span>
          </div>
        </header>

        <div className="report-metrics">
          <article>
            <span>调查完成度</span>
            <strong>{report.investigationPercent}%</strong>
            <div>
              <i style={{ width: `${report.investigationPercent}%` }} />
            </div>
          </article>
          <article>
            <span>已发现线索</span>
            <strong>
              {report.discoveredClueIds.length}/
              {
                Object.values(story.observations).filter(
                  (item) => item.chapterId === chapter.id
                ).length
              }
            </strong>
            <div>
              <i style={{ width: `${report.cluePercent}%` }} />
            </div>
          </article>
          <article>
            <span>错误推理</span>
            <strong>{report.wrongAttempts.length}</strong>
            <small>次可撤回尝试</small>
          </article>
        </div>

        <div className="report-details">
          <section>
            <p className="section-label">已发现线索</p>
            <ul className="report-clue-list">
              {report.discoveredClueIds.map((id) => (
                <li key={id}>✓ {story.observations[id].title}</li>
              ))}
            </ul>
          </section>
          <section>
            <p className="section-label">错误推理记录</p>
            {report.wrongAttempts.length ? (
              <ol className="wrong-attempt-list">
                {report.wrongAttempts.map((attempt, index) => (
                  <li key={`${attempt.reasoningId}-${index}`}>
                    <strong>{story.reasoning[attempt.reasoningId].question}</strong>
                    <span>
                      {attempt.evidenceIds
                        .map((id) => story.evidence[id].title)
                        .join(" ＋ ")}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-copy">没有留下错误推理记录。</p>
            )}
          </section>
        </div>

        <article className="player-evaluation">
          <span>玩家评价</span>
          <div>
            <h4>{report.evaluation.title}</h4>
            <p>{report.evaluation.description}</p>
          </div>
        </article>
      </section>
      <button
        className="primary-button"
        type="button"
        disabled={completed}
        onClick={() => completeCurrentChapter()}
      >
        {completed ? "第一章已完成" : "封存第一章调查记录"}
      </button>
    </section>
  );
}
