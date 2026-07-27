import { useGameStore } from "../../stores/game-store";

interface EvidenceConnectionsProps {
  onOpenContent: (contentId: string) => void;
}

export function EvidenceConnections({
  onOpenContent
}: EvidenceConnectionsProps) {
  const story = useGameStore((state) => state.story);
  const currentChapterId = useGameStore((state) => state.currentChapterId);
  const collectedEvidenceIds = useGameStore((state) => state.collectedEvidenceIds);
  const unlockedReasoningIds = useGameStore((state) => state.unlockedReasoningIds);
  const reasoningResults = useGameStore((state) => state.reasoningResults);

  if (!story || !currentChapterId) {
    return null;
  }

  const chapter = story.chapters[currentChapterId];

  return (
    <section className="connections-panel">
      <header className="stage-heading">
        <div>
          <p className="section-label">来源可追溯 · 结论不可跳步</p>
          <h2>证据关系链</h2>
        </div>
        <span>{collectedEvidenceIds.length} 条证据链已建立</span>
      </header>
      <p className="scene-description">
        每一项推理都必须能沿着“材料—观察—证据”返回原始来源。灰色推理节点表示尚未解锁。
      </p>

      <div className="connection-legend" aria-label="关系链图例">
        <span>01 原始材料</span>
        <span>02 玩家观察</span>
        <span>03 正式证据</span>
        <span>04 推理命题</span>
      </div>

      {collectedEvidenceIds.length ? (
        <div className="connection-list">
          {collectedEvidenceIds.map((evidenceId) => {
            const evidence = story.evidence[evidenceId];
            const reasoningNodes = chapter.reasoningIds
              .map((id) => story.reasoning[id])
              .filter((node) =>
                node.solutions.some((solution) =>
                  solution.requiredEvidenceIds.includes(evidenceId)
                )
              );

            return (
              <article className="connection-row" key={evidenceId}>
                <div className="connection-node connection-node--source">
                  <span>材料</span>
                  {evidence.sourceContentIds.map((contentId) => (
                    <button
                      type="button"
                      key={contentId}
                      onClick={() => onOpenContent(contentId)}
                    >
                      {story.content[contentId].title}
                    </button>
                  ))}
                </div>
                <span className="connection-arrow" aria-hidden="true">
                  →
                </span>
                <div className="connection-node connection-node--observation">
                  <span>观察</span>
                  {evidence.observationIds.map((observationId) => (
                    <strong key={observationId}>
                      {story.observations[observationId].title}
                    </strong>
                  ))}
                </div>
                <span className="connection-arrow" aria-hidden="true">
                  →
                </span>
                <div className="connection-node connection-node--evidence">
                  <span>{evidence.category}</span>
                  <strong>{evidence.title}</strong>
                </div>
                <span className="connection-arrow" aria-hidden="true">
                  →
                </span>
                <div className="connection-node connection-node--reasoning">
                  <span>推理</span>
                  {reasoningNodes.length ? (
                    reasoningNodes.map((node) => {
                      const completed = Boolean(reasoningResults[node.id]);
                      const unlocked = unlockedReasoningIds.includes(node.id);
                      return (
                        <strong
                          className={
                            completed
                              ? "is-complete"
                              : unlocked
                                ? "is-unlocked"
                                : "is-locked"
                          }
                          key={node.id}
                        >
                          {completed ? "✓ " : ""}
                          {node.question}
                        </strong>
                      );
                    })
                  ) : (
                    <em>尚未进入推理命题</em>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="viewer-placeholder">
          <p className="section-label">关系链为空</p>
          <h3>先在材料中形成一次有效观察</h3>
          <p>正式证据生成后，它与原始来源、推理用途会自动出现在这里。</p>
        </section>
      )}
    </section>
  );
}
