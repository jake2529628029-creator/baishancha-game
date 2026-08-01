import type { LoadedStory } from "../../types/story";

export interface EvidenceNotebookCount {
  collectedEvidenceIds: string[];
  collectedCount: number;
  totalCount: number;
}

export function getEvidenceNotebookCount(
  story: LoadedStory,
  unlockedChapterIds: readonly string[],
  collectedEvidenceIds: readonly string[]
): EvidenceNotebookCount {
  const unlockedChapterIdSet = new Set(unlockedChapterIds);
  const eligibleChapterIds = new Set(
    story.chapterManifest.chapters
      .filter(
        (chapter) =>
          chapter.availability === "available" &&
          unlockedChapterIdSet.has(chapter.id) &&
          Boolean(story.chapters[chapter.id])
      )
      .map((chapter) => chapter.id)
  );
  const eligibleEvidenceIds = new Set(
    Object.values(story.evidence)
      .filter((evidence) => eligibleChapterIds.has(evidence.chapterId))
      .map((evidence) => evidence.id)
  );
  const uniqueCollectedEvidenceIds = Array.from(
    new Set(collectedEvidenceIds)
  ).filter((evidenceId) => eligibleEvidenceIds.has(evidenceId));

  return {
    collectedEvidenceIds: uniqueCollectedEvidenceIds,
    collectedCount: uniqueCollectedEvidenceIds.length,
    totalCount: eligibleEvidenceIds.size
  };
}
