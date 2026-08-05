import { useEffect, useState } from "react";
import { useGameStore } from "../../stores/game-store";
import type { DialogueLine, DialogueNode } from "../../types/dialogue";

type DialoguePanelDisplaySource =
  | Partial<Pick<DialogueNode, "characterName" | "topic">>
  | null
  | undefined;

export function getDialoguePanelDisplay(
  dialogue: DialoguePanelDisplaySource
) {
  return {
    characterName: dialogue?.characterName?.trim() || "待确认人物",
    topic: dialogue?.topic?.trim() || "未命名话题"
  };
}

export function DialoguePanel() {
  const story = useGameStore((state) => state.story);
  const currentChapterId = useGameStore((state) => state.currentChapterId);
  const unlockedDialogueIds = useGameStore((state) => state.unlockedDialogueIds);
  const completedDialogueIds = useGameStore(
    (state) => state.completedDialogueIds
  );
  const collectedEvidenceIds = useGameStore((state) => state.collectedEvidenceIds);
  const presentDialogueEvidence = useGameStore(
    (state) => state.presentDialogueEvidence
  );
  const [activeDialogueId, setActiveDialogueId] = useState<string | null>(null);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [responseLines, setResponseLines] = useState<DialogueLine[]>([]);
  const [matched, setMatched] = useState<boolean | null>(null);
  const [relevantCount, setRelevantCount] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [revealedHints, setRevealedHints] = useState(0);

  const chapter =
    story && currentChapterId ? story.chapters[currentChapterId] : null;
  const availableIds =
    chapter?.dialogueIds.filter((id) => unlockedDialogueIds.includes(id)) ?? [];
  const resolvedDialogueId =
    activeDialogueId && availableIds.includes(activeDialogueId)
      ? activeDialogueId
      : availableIds[0] ?? null;
  const dialogue =
    story && resolvedDialogueId ? story.dialogues[resolvedDialogueId] : null;
  const dialogueDisplay = getDialoguePanelDisplay(dialogue);

  useEffect(() => {
    setSelectedEvidenceIds([]);
    setResponseLines([]);
    setMatched(null);
    setRelevantCount(0);
    setFailedAttempts(0);
    setRevealedHints(0);
  }, [resolvedDialogueId]);

  if (!story || !chapter) {
    return null;
  }

  const toggleEvidence = (evidenceId: string) => {
    setSelectedEvidenceIds((current) =>
      current.includes(evidenceId)
        ? current.filter((item) => item !== evidenceId)
        : [...current, evidenceId]
    );
    setMatched(null);
  };

  const hints = dialogue?.hints ?? [];
  const dialogueCompleted = dialogue
    ? completedDialogueIds.includes(dialogue.id)
    : false;
  const hintButtonHot = failedAttempts >= 2 && revealedHints < hints.length;

  return (
    <section className="dialogue-panel">
      <header className="stage-heading">
        <div>
          <p className="section-label">人物询问</p>
          <h2>{dialogueDisplay.characterName}</h2>
        </div>
        <span>{availableIds.length} 个话题已解锁</span>
      </header>
      <p className="scene-description">
        {dialogue
          ? `当前话题：${dialogueDisplay.topic}`
          : "选择已解锁的话题，再决定要出示哪些证据。"}
      </p>

      {availableIds.length ? (
        <div className="dialogue-layout">
          <nav className="topic-list" aria-label="询问话题">
            {availableIds.map((id) => (
              <button
                className={resolvedDialogueId === id ? "is-active" : ""}
                type="button"
                key={id}
                onClick={() => setActiveDialogueId(id)}
              >
                <span>
                  {completedDialogueIds.includes(id) ? "已询问" : "新话题"}
                </span>
                {getDialoguePanelDisplay(story.dialogues[id]).topic}
              </button>
            ))}
          </nav>

          {dialogue ? (
            <div className="interview-room">
              <div className="dialogue-lines">
                {dialogue.openingLines.map((line, index) => (
                  <blockquote key={`${line.speakerId}-${index}`}>
                    <span>
                      {line.speakerId === dialogue.characterId
                        ? dialogueDisplay.characterName
                        : "调查者"}
                    </span>
                    {line.text}
                  </blockquote>
                ))}
                {responseLines.map((line, index) => (
                  <blockquote
                    className={matched ? "is-match" : "is-mismatch"}
                    key={`response-${line.speakerId}-${index}`}
                  >
                    <span>
                      {line.speakerId === dialogue.characterId
                        ? dialogueDisplay.characterName
                        : "调查者"}
                    </span>
                    {line.text}
                  </blockquote>
                ))}
              </div>

              <div className="present-evidence">
                <p className="section-label">点选要出示的证据（可组合）</p>
                <div className="evidence-pool" aria-label="可出示的证据">
                  {collectedEvidenceIds.map((id) => {
                    const evidence = story.evidence[id];
                    const selected = selectedEvidenceIds.includes(id);
                    return (
                      <button
                        className={`evidence-chip${selected ? " evidence-chip--filled" : ""}`}
                        type="button"
                        key={id}
                        disabled={dialogueCompleted}
                        aria-pressed={selected}
                        title={evidence.description}
                        onClick={() => toggleEvidence(id)}
                      >
                        <small>{evidence.category}</small>
                        {evidence.title}
                      </button>
                    );
                  })}
                </div>
                <div className="reasoning-actions">
                  <button
                    className="primary-button"
                    type="button"
                    disabled={!selectedEvidenceIds.length || dialogueCompleted}
                    onClick={async () => {
                      const attempt = await presentDialogueEvidence(
                        dialogue.id,
                        selectedEvidenceIds
                      );
                      if (attempt) {
                        setResponseLines(attempt.lines);
                        setMatched(attempt.matched);
                        if (!attempt.matched) {
                          setRelevantCount(attempt.relevantCount ?? 0);
                          setFailedAttempts((count) => count + 1);
                        }
                      }
                    }}
                  >
                    {dialogueCompleted ? "话题已完成" : "出示证据"}
                  </button>
                  {hints.length && !dialogueCompleted ? (
                    <button
                      className={`hint-button${hintButtonHot ? " hint-button--hot" : ""}`}
                      type="button"
                      onClick={() =>
                        setRevealedHints((current) =>
                          Math.min(current + 1, hints.length)
                        )
                      }
                    >
                      {revealedHints >= hints.length
                        ? "提示已全部展开"
                        : revealedHints > 0
                          ? "再提示一点"
                          : "需要提示？"}
                    </button>
                  ) : null}
                </div>

                {revealedHints > 0 ? (
                  <ol className="hint-list">
                    {hints.slice(0, revealedHints).map((hint, index) => (
                      <li key={index}>
                        <span className="section-label">提示 {index + 1}</span>
                        {hint}
                      </li>
                    ))}
                  </ol>
                ) : null}

                {matched !== null ? (
                  <div className={`attempt-status ${matched ? "is-match" : ""}`}>
                    {matched ? (
                      <p>证据击中了这个话题的关键。新解锁的内容会在右上角提示。</p>
                    ) : (
                      <>
                        <p>这组证据与当前话题无法形成有效质询。</p>
                        {relevantCount > 0 ? (
                          <p className="closeness-note">
                            不过其中有 {relevantCount} 份证据确实和她在这个话题上
                            关心的事有关——换掉其余的再试试。
                          </p>
                        ) : null}
                        {failedAttempts >= 2 && hints.length ? (
                          <p className="closeness-note">
                            连续几次没命中？点上面的「需要提示」换个思路。
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <section className="viewer-placeholder">
          <p className="section-label">暂无话题</p>
          <h3>先从调查材料中建立可质询的事实</h3>
          <p>新的观察与证据会解锁对应人物的话题。</p>
        </section>
      )}
    </section>
  );
}
