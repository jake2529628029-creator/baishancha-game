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
  }, [resolvedDialogueId]);

  if (!story || !chapter) {
    return null;
  }

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
                <p className="section-label">选择要出示的证据</p>
                <div className="evidence-options">
                  {collectedEvidenceIds.map((id) => (
                    <label key={id}>
                      <input
                        type="checkbox"
                        checked={selectedEvidenceIds.includes(id)}
                        onChange={() =>
                          setSelectedEvidenceIds((current) =>
                            current.includes(id)
                              ? current.filter((item) => item !== id)
                              : [...current, id]
                          )
                        }
                      />
                      <span>{story.evidence[id].title}</span>
                    </label>
                  ))}
                </div>
                <button
                  className="primary-button"
                  type="button"
                  disabled={
                    !selectedEvidenceIds.length ||
                    completedDialogueIds.includes(dialogue.id)
                  }
                  onClick={async () => {
                    const attempt = await presentDialogueEvidence(
                      dialogue.id,
                      selectedEvidenceIds
                    );
                    if (attempt) {
                      setResponseLines(attempt.lines);
                      setMatched(attempt.matched);
                    }
                  }}
                >
                  {completedDialogueIds.includes(dialogue.id)
                    ? "话题已完成"
                    : "出示证据"}
                </button>
                {matched !== null ? (
                  <p className={`attempt-status ${matched ? "is-match" : ""}`}>
                    {matched
                      ? "证据击中了这个话题的关键。"
                      : "这组证据与当前话题无法形成有效质询。"}
                  </p>
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
