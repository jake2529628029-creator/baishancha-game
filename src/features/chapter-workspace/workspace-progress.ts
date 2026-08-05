import type { LoadedStory, StoryChapter } from "../../types/story";

/** 计算工作台进度提示所需的最小进度切片（GameProgressState 天然满足） */
export interface ProgressSlice {
  unlockedContentIds: string[];
  viewedContentIds: string[];
  discoveredObservationIds: string[];
  collectedEvidenceIds: string[];
  unlockedDialogueIds: string[];
  completedDialogueIds: string[];
  unlockedReasoningIds: string[];
  reasoningResults: Record<string, string>;
}

/** 一份材料里还藏着多少处未标记的关键细节（借鉴 Roottrees 的 clue count 设计） */
export function getContentRemainingClues(
  story: LoadedStory,
  progress: ProgressSlice,
  contentId: string
): { total: number; remaining: number } {
  const related = Object.values(story.observations).filter((observation) =>
    observation.sourceContentIds.includes(contentId)
  );
  const remaining = related.filter(
    (observation) => !progress.discoveredObservationIds.includes(observation.id)
  ).length;

  return { total: related.length, remaining };
}

/** 单个场景的材料查阅进度 */
export function getSceneProgress(
  story: LoadedStory,
  progress: ProgressSlice,
  chapter: StoryChapter,
  sceneId: string
): { unlocked: number; viewed: number } {
  const scene = chapter.scenes.find((item) => item.id === sceneId);
  if (!scene) {
    return { unlocked: 0, viewed: 0 };
  }

  const unlocked = scene.contentIds.filter((id) =>
    progress.unlockedContentIds.includes(id)
  );
  const viewed = unlocked.filter((id) => progress.viewedContentIds.includes(id));

  return { unlocked: unlocked.length, viewed: viewed.length };
}

export interface NextStepSuggestion {
  /** 建议文案 */
  text: string;
  /** 点击后跳转的工作台模式 */
  target: "investigation" | "dialogue" | "reasoning";
  /** 关联内容（调查模式下用于直接打开材料） */
  contentId?: string;
}

/**
 * 基于当前进度计算"下一步建议"。
 * 优先级遵循游戏自身的核心循环：调查材料 → 标记细节 → 询问人物 → 提交推理。
 * 玩家卡住时永远有一个明确、可达成的下一步，而不是面对八个功能入口发呆。
 */
export function suggestNextStep(
  story: LoadedStory,
  progress: ProgressSlice,
  chapter: StoryChapter
): NextStepSuggestion | null {
  // 1. 有解锁但没翻阅的材料 → 先去看
  const unviewed = chapter.contentIds.filter(
    (id) =>
      progress.unlockedContentIds.includes(id) &&
      !progress.viewedContentIds.includes(id)
  );
  if (unviewed.length) {
    const first = story.content[unviewed[0]];
    return {
      text: `还有 ${unviewed.length} 份材料没有翻阅，先从《${first?.title ?? "新材料"}》开始。`,
      target: "investigation",
      contentId: unviewed[0]
    };
  }

  // 2. 材料都看了但有细节没标记 → 回去挖细节
  for (const contentId of chapter.contentIds) {
    if (!progress.unlockedContentIds.includes(contentId)) continue;
    const clues = getContentRemainingClues(story, progress, contentId);
    if (clues.remaining > 0) {
      const content = story.content[contentId];
      return {
        text: `《${content?.title ?? "材料"}》里还有 ${clues.remaining} 处可疑细节没有标记。`,
        target: "investigation",
        contentId
      };
    }
  }

  // 3. 有未完成的询问话题 → 去对话
  const pendingDialogue = chapter.dialogueIds.find(
    (id) =>
      progress.unlockedDialogueIds.includes(id) &&
      !progress.completedDialogueIds.includes(id)
  );
  if (pendingDialogue) {
    const dialogue = story.dialogues[pendingDialogue];
    return {
      text: `可以就「${dialogue?.topic ?? "新话题"}」询问${dialogue?.characterName ?? "相关人物"}。`,
      target: "dialogue"
    };
  }

  // 4. 有未完成的推理问题 → 去推理板
  const pendingReasoning = chapter.reasoningIds.find(
    (id) =>
      progress.unlockedReasoningIds.includes(id) &&
      !progress.reasoningResults[id]
  );
  if (pendingReasoning) {
    const reasoning = story.reasoning[pendingReasoning];
    return {
      text: `推理板上有一个等待验证的问题：「${reasoning?.question ?? "新推理"}」`,
      target: "reasoning"
    };
  }

  return null;
}

/** 章节阶段码 → 玩家可读的文案 */
export function getChapterStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    investigating: "现场调查",
    "reasoning-available": "假设验证",
    result: "章节结论",
    completed: "已完成"
  };
  return labels[stage] ?? "调查进行中";
}
