import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../../stores/game-store";
import type { ReasoningCloseness } from "../../types/reasoning";

export function ReasoningPanel() {
  const story = useGameStore((state) => state.story);
  const currentChapterId = useGameStore((state) => state.currentChapterId);
  const unlockedReasoningIds = useGameStore((state) => state.unlockedReasoningIds);
  const reasoningResults = useGameStore((state) => state.reasoningResults);
  const reasoningAttempts = useGameStore((state) => state.reasoningAttempts);
  const collectedEvidenceIds = useGameStore((state) => state.collectedEvidenceIds);
  const submitReasoning = useGameStore((state) => state.submitReasoning);
  const [activeReasoningId, setActiveReasoningId] = useState<string | null>(null);
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [matched, setMatched] = useState<boolean | null>(null);
  const [closeness, setCloseness] = useState<ReasoningCloseness | null>(null);
  const [revealedHints, setRevealedHints] = useState(0);

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
    setCloseness(null);
    setRevealedHints(0);
  }, [resolvedReasoningId]);

  if (!story || !chapter) {
    return null;
  }

  const failedAttempts = node
    ? reasoningAttempts.filter(
        (attempt) => attempt.reasoningId === node.id && !attempt.matched
      ).length
    : 0;

  const usedEvidenceIds = new Set(Object.values(slotValues).filter(Boolean));
  const firstEmptySlotId = node?.slots.find((slot) => !slotValues[slot.id])?.id;

  const assignEvidence = (evidenceId: string) => {
    if (!firstEmptySlotId || usedEvidenceIds.has(evidenceId)) return;
    setSlotValues((current) => ({ ...current, [firstEmptySlotId]: evidenceId }));
    setMatched(null);
    setFeedback(null);
  };
  const clearSlot = (slotId: string) => {
    setSlotValues((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
    setMatched(null);
    setFeedback(null);
  };

  const hints = node?.hints ?? [];
  // 失败 2 次以后主动把提示按钮推到玩家眼前；也可以随时主动点
  const hintButtonHot = failedAttempts >= 2 && revealedHints < hints.length;

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
        点击下方证据填入槽位，再提交验证。组合不对不会受罚——反馈会告诉你离闭合还差多远。
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

            <div className="reasoning-slots reasoning-slots--chips">
              {node.slots.map((slot, index) => {
                const filledId = slotValues[slot.id];
                const filled = filledId ? story.evidence[filledId] : null;
                return (
                  <div className="reasoning-slot" key={slot.id}>
                    <span className="reasoning-slot__label">
                      {String(index + 1).padStart(2, "0")} · {slot.label}
                    </span>
                    {filled ? (
                      <button
                        className="evidence-chip evidence-chip--filled"
                        type="button"
                        title="点击移除"
                        onClick={() => clearSlot(slot.id)}
                      >
                        {filled.title}
                        <span aria-hidden="true"> ×</span>
                      </button>
                    ) : (
                      <span className="reasoning-slot__empty">
                        从下方选择一份证据
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="evidence-pool" aria-label="可用证据">
              {collectedEvidenceIds.map((id) => {
                const evidence = story.evidence[id];
                const used = usedEvidenceIds.has(id);
                return (
                  <button
                    className={`evidence-chip${used ? " is-used" : ""}`}
                    type="button"
                    key={id}
                    disabled={used || Boolean(reasoningResults[node.id])}
                    title={evidence.description}
                    onClick={() => assignEvidence(id)}
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
                    setCloseness(attempt.closeness ?? null);
                  }
                }}
              >
                {reasoningResults[node.id] ? "推理已锁定" : "提交推理"}
              </button>
              {hints.length && !reasoningResults[node.id] ? (
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
              {failedAttempts > 0 && !reasoningResults[node.id] ? (
                <span className="attempt-count">
                  已尝试 {failedAttempts} 次 · 试错没有代价
                </span>
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

            {feedback ? (
              <div className={`reasoning-feedback${matched ? " is-match" : ""}`}>
                <p className="section-label">
                  {matched ? "推理锁定" : "论证缺口"}
                </p>
                <p>{feedback}</p>
                {!matched && closeness && closeness.supporting > 0 ? (
                  <p className="closeness-note">
                    方向并非全错：这组证据里有 {closeness.supporting}/
                    {node.slots.length} 份确实支撑这个问题——但具体是哪几份，
                    还得你自己判断。
                  </p>
                ) : null}
                {matched ? (
                  <strong>
                    结论已记入日志。如有新材料或新话题解锁，右上角会有提示。
                  </strong>
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
