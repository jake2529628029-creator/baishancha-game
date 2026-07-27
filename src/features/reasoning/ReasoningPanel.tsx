import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../../stores/game-store";

export function ReasoningPanel() {
  const story = useGameStore((state) => state.story);
  const currentChapterId = useGameStore((state) => state.currentChapterId);
  const unlockedReasoningIds = useGameStore((state) => state.unlockedReasoningIds);
  const reasoningResults = useGameStore((state) => state.reasoningResults);
  const collectedEvidenceIds = useGameStore((state) => state.collectedEvidenceIds);
  const submitReasoning = useGameStore((state) => state.submitReasoning);
  const [activeReasoningId, setActiveReasoningId] = useState<string | null>(null);
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [matched, setMatched] = useState<boolean | null>(null);

  const chapter =
    story && currentChapterId ? story.chapters[currentChapterId] : null;
  const availableIds = useMemo(
    () =>
      chapter?.reasoningIds.filter((id) => unlockedReasoningIds.includes(id)) ??
      [],
    [chapter, unlockedReasoningIds]
  );
  const resolvedReasoningId =
    activeReasoningId && availableIds.includes(activeReasoningId)
      ? activeReasoningId
      : availableIds[0] ?? null;
  const node =
    story && resolvedReasoningId ? story.reasoning[resolvedReasoningId] : null;

  useEffect(() => {
    setSlotValues({});
    setFeedback(null);
    setMatched(null);
  }, [resolvedReasoningId]);

  if (!story || !chapter) {
    return null;
  }

  return (
    <section className="reasoning-panel">
      <header className="stage-heading">
        <div>
          <p className="section-label">案情推演</p>
          <h2>推理板</h2>
        </div>
        <span>{availableIds.length} 个问题可处理</span>
      </header>
      <p className="scene-description">
        把证据放入对应槽位。合理方向不等于最终答案，系统只反馈当前论证是否闭合。
      </p>

      {availableIds.length && node ? (
        <div className="reasoning-layout">
          <nav className="topic-list" aria-label="推理问题">
            {availableIds.map((id) => (
              <button
                className={resolvedReasoningId === id ? "is-active" : ""}
                type="button"
                key={id}
                onClick={() => setActiveReasoningId(id)}
              >
                <span>{reasoningResults[id] ? "已完成" : "待推理"}</span>
                {story.reasoning[id].question}
              </button>
            ))}
          </nav>

          <div className="reasoning-board">
            <h3>{node.question}</h3>
            <div className="reasoning-slots">
              {node.slots.map((slot, index) => (
                <label key={slot.id}>
                  <span>
                    {String(index + 1).padStart(2, "0")} · {slot.label}
                  </span>
                  <select
                    value={slotValues[slot.id] ?? ""}
                    onChange={(event) =>
                      setSlotValues((current) => ({
                        ...current,
                        [slot.id]: event.target.value
                      }))
                    }
                  >
                    <option value="">选择证据</option>
                    {collectedEvidenceIds.map((id) => {
                      const usedElsewhere = Object.entries(slotValues).some(
                        ([slotId, value]) => slotId !== slot.id && value === id
                      );
                      return (
                        <option value={id} disabled={usedElsewhere} key={id}>
                          {story.evidence[id].title}
                        </option>
                      );
                    })}
                  </select>
                </label>
              ))}
            </div>
            <button
              className="primary-button"
              type="button"
              disabled={
                node.slots.some((slot) => !slotValues[slot.id]) ||
                Boolean(reasoningResults[node.id])
              }
              onClick={async () => {
                const attempt = await submitReasoning(
                  node.id,
                  node.slots.map((slot) => slotValues[slot.id])
                );
                if (attempt) {
                  setFeedback(attempt.feedback);
                  setMatched(attempt.matched);
                }
              }}
            >
              {reasoningResults[node.id] ? "推理已记录" : "提交推理"}
            </button>

            {feedback ? (
              <div className={`reasoning-feedback${matched ? " is-match" : ""}`}>
                <p className="section-label">
                  {matched ? "阶段性结论" : "论证缺口"}
                </p>
                <p>{feedback}</p>
                {matched &&
                node.id === "reasoning-first-hypothesis" ? (
                  <strong>新材料已解锁：毒检定量附件。请返回调查台复核。</strong>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <section className="viewer-placeholder">
          <p className="section-label">暂无可提交推理</p>
          <h3>证据还没有构成可检验的问题</h3>
          <p>调查材料并询问沈意舒，新的推理节点会逐步出现。</p>
        </section>
      )}
    </section>
  );
}
