import type { GameProgressState } from "../../types/progress";
import type { LoadedStory, StoryChapter } from "../../types/story";

export interface ChapterReportData {
  investigationPercent: number;
  cluePercent: number;
  discoveredClueIds: string[];
  wrongAttempts: GameProgressState["reasoningAttempts"];
  score: number;
  evaluation: StoryChapter["result"]["evaluationTiers"][number];
}

export function createChapterReport(
  story: LoadedStory,
  chapter: StoryChapter,
  progress: GameProgressState
): ChapterReportData {
  const chapterObservationIds = Object.values(story.observations)
    .filter((observation) => observation.chapterId === chapter.id)
    .map((observation) => observation.id);
  const discoveredClueIds = chapterObservationIds.filter((id) =>
    progress.discoveredObservationIds.includes(id)
  );
  const wrongAttempts = progress.reasoningAttempts.filter(
    (attempt) => !attempt.matched
  );
  const completedReasoningCount = chapter.reasoningIds.filter((id) =>
    Boolean(progress.reasoningResults[id])
  ).length;
  const reasoningAttemptCount = completedReasoningCount + wrongAttempts.length;
  const reasoningAccuracy = reasoningAttemptCount
    ? completedReasoningCount / reasoningAttemptCount
    : 0;
  const investigationPercent = Math.round(
    (progress.completedObjectiveIds.length / chapter.objectives.length) * 100
  );
  const cluePercent = Math.round(
    (discoveredClueIds.length / chapterObservationIds.length) * 100
  );
  const score = Math.round(
    investigationPercent * 0.45 +
      cluePercent * 0.35 +
      reasoningAccuracy * 100 * 0.2
  );
  const evaluation =
    [...chapter.result.evaluationTiers]
      .sort((left, right) => right.minimumScore - left.minimumScore)
      .find((tier) => score >= tier.minimumScore) ??
    chapter.result.evaluationTiers[chapter.result.evaluationTiers.length - 1];

  return {
    investigationPercent,
    cluePercent,
    discoveredClueIds,
    wrongAttempts,
    score,
    evaluation
  };
}
