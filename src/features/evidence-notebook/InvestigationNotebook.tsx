import { useState } from "react";
import { useGameStore } from "../../stores/game-store";
import { getEvidenceNotebookCount } from "./evidence-notebook-count";

type NotebookTab = "materials" | "observations" | "evidence";

interface InvestigationNotebookProps {
  onOpenContent: (contentId: string) => void;
}

const tabLabels: Record<NotebookTab, string> = {
  materials: "材料",
  observations: "观察",
  evidence: "证据"
};

export function InvestigationNotebook({
  onOpenContent
}: InvestigationNotebookProps) {
  const story = useGameStore((state) => state.story);
  const currentChapterId = useGameStore((state) => state.currentChapterId);
  const unlockedChapterIds = useGameStore((state) => state.unlockedChapterIds);
  const unlockedContentIds = useGameStore((state) => state.unlockedContentIds);
  const viewedContentIds = useGameStore((state) => state.viewedContentIds);
  const discoveredObservationIds = useGameStore(
    (state) => state.discoveredObservationIds
  );
  const collectedEvidenceIds = useGameStore((state) => state.collectedEvidenceIds);
  const [activeTab, setActiveTab] = useState<NotebookTab>("evidence");

  if (!story || !currentChapterId) {
    return null;
  }

  const chapter = story.chapters[currentChapterId];
  const evidenceCount = getEvidenceNotebookCount(
    story,
    unlockedChapterIds,
    collectedEvidenceIds
  );

  return (
    <section className="case-panel notebook">
      <div className="panel-heading">
        <p className="section-label">调查证据簿</p>
        <span>
          {evidenceCount.collectedCount}/{evidenceCount.totalCount}
        </span>
      </div>
      <div className="notebook-tabs" role="tablist" aria-label="证据簿分类">
        {(Object.keys(tabLabels) as NotebookTab[]).map((tab) => (
          <button
            className={activeTab === tab ? "is-active" : ""}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            key={tab}
            onClick={() => setActiveTab(tab)}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {activeTab === "materials" ? (
        <ul className="notebook-list">
          {unlockedContentIds
            .filter((id) => chapter.contentIds.includes(id))
            .map((id) => {
              const content = story.content[id];
              return (
                <li key={id}>
                  <button type="button" onClick={() => onOpenContent(id)}>
                    <strong>{content.title}</strong>
                    <span>
                      {viewedContentIds.includes(id) ? "已查阅" : "待查阅"} ·{" "}
                      {content.source}
                    </span>
                  </button>
                </li>
              );
            })}
        </ul>
      ) : null}

      {activeTab === "observations" ? (
        discoveredObservationIds.length ? (
          <ul className="notebook-list">
            {discoveredObservationIds.map((id) => {
              const observation = story.observations[id];
              return (
                <li key={id}>
                  <strong>{observation.title}</strong>
                  <p>{observation.description}</p>
                  <div className="source-links">
                    {observation.sourceContentIds.map((contentId) => (
                      <button
                        type="button"
                        key={contentId}
                        onClick={() => onOpenContent(contentId)}
                      >
                        来源：{story.content[contentId].title}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="empty-copy">在材料中标记细节后，观察会出现在这里。</p>
        )
      ) : null}

      {activeTab === "evidence" ? (
        evidenceCount.collectedEvidenceIds.length ? (
          <ul className="notebook-list notebook-list--evidence">
            {evidenceCount.collectedEvidenceIds.map((id) => {
              const evidence = story.evidence[id];
              return (
                <li key={id}>
                  <span className="evidence-category">{evidence.category}</span>
                  <strong>{evidence.title}</strong>
                  <p>{evidence.description}</p>
                  <div className="evidence-chain">
                    <span>
                      {evidence.observationIds
                        .map((observationId) => story.observations[observationId].title)
                        .join(" + ")}
                    </span>
                    <span aria-hidden="true">↓</span>
                    <span>正式证据</span>
                  </div>
                  <div className="source-links">
                    {evidence.sourceContentIds.map((contentId) => (
                      <button
                        type="button"
                        key={contentId}
                        onClick={() => onOpenContent(contentId)}
                      >
                        回看：{story.content[contentId].title}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="empty-copy">
            单纯打开材料不会形成证据。请先完成一次有效观察。
          </p>
        )
      ) : null}
    </section>
  );
}
