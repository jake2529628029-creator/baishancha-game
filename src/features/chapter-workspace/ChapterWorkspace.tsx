import { useMemo, useState } from "react";
import { useGameStore } from "../../stores/game-store";
import type { InvestigationScene } from "../../types/story";
import { ContentViewer } from "../content-viewer/ContentViewer";
import { InvestigationNotebook } from "../evidence-notebook/InvestigationNotebook";
import { DialoguePanel } from "../dialogue/DialoguePanel";
import { ReasoningPanel } from "../reasoning/ReasoningPanel";
import { ChapterResult } from "../chapter-result/ChapterResult";
import { DetectiveJournal } from "../detective-journal/DetectiveJournal";
import { EvidenceConnections } from "../evidence-connections/EvidenceConnections";

type WorkspaceMode =
  | "investigation"
  | "dialogue"
  | "reasoning"
  | "journal"
  | "connections";

function ProgressMark({ complete }: { complete: boolean }) {
  return (
    <span className={`progress-mark${complete ? " progress-mark--complete" : ""}`}>
      {complete ? "✓" : ""}
    </span>
  );
}

export function ChapterWorkspace() {
  const story = useGameStore((state) => state.story);
  const currentChapterId = useGameStore((state) => state.currentChapterId);
  const completedObjectiveIds = useGameStore((state) => state.completedObjectiveIds);
  const unlockedContentIds = useGameStore((state) => state.unlockedContentIds);
  const viewedContentIds = useGameStore((state) => state.viewedContentIds);
  const discoveredObservationIds = useGameStore(
    (state) => state.discoveredObservationIds
  );
  const unlockedDialogueIds = useGameStore((state) => state.unlockedDialogueIds);
  const unlockedReasoningIds = useGameStore((state) => state.unlockedReasoningIds);
  const chapterStage = useGameStore((state) => state.chapterStage);
  const returnToTitle = useGameStore((state) => state.returnToTitle);

  const chapter = story && currentChapterId ? story.chapters[currentChapterId] : null;
  const [activeSceneId, setActiveSceneId] = useState<string | null>(
    chapter?.scenes[0]?.id ?? null
  );
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] =
    useState<WorkspaceMode>("investigation");

  const activeScene = useMemo<InvestigationScene | undefined>(
    () => chapter?.scenes.find((scene) => scene.id === activeSceneId),
    [activeSceneId, chapter]
  );

  if (!story || !chapter) {
    return null;
  }

  const materials = (activeScene?.contentIds ?? [])
    .filter((contentId) => unlockedContentIds.includes(contentId))
    .map((contentId) => story.content[contentId]);
  const selectedContent = selectedContentId
    ? story.content[selectedContentId]
    : undefined;
  const openContent = (contentId: string) => {
    const scene = chapter.scenes.find((item) => item.contentIds.includes(contentId));

    if (scene) {
      setActiveSceneId(scene.id);
    }
    setSelectedContentId(contentId);
    setWorkspaceMode("investigation");
  };

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">第一章 · {chapter.title}</p>
          <h1>静园调查工作台</h1>
        </div>
        <nav className="workspace-mode-nav" aria-label="游戏功能">
          <button
            className={workspaceMode === "investigation" ? "is-active" : ""}
            type="button"
            onClick={() => setWorkspaceMode("investigation")}
          >
            调查
          </button>
          <button
            className={workspaceMode === "dialogue" ? "is-active" : ""}
            type="button"
            onClick={() => setWorkspaceMode("dialogue")}
          >
            询问
            {unlockedDialogueIds.length ? (
              <span>{unlockedDialogueIds.length}</span>
            ) : null}
          </button>
          <button
            className={workspaceMode === "journal" ? "is-active" : ""}
            type="button"
            onClick={() => setWorkspaceMode("journal")}
          >
            日志
          </button>
          <button
            className={workspaceMode === "connections" ? "is-active" : ""}
            type="button"
            onClick={() => setWorkspaceMode("connections")}
          >
            线索链
          </button>
          <button
            className={workspaceMode === "reasoning" ? "is-active" : ""}
            type="button"
            onClick={() => setWorkspaceMode("reasoning")}
          >
            推理
            {unlockedReasoningIds.length ? (
              <span>{unlockedReasoningIds.length}</span>
            ) : null}
          </button>
        </nav>
        <div className="workspace-header__actions">
          <span className="save-indicator">● 本地自动存档</span>
          <button className="text-button" type="button" onClick={returnToTitle}>
            返回标题
          </button>
        </div>
      </header>

      <div className="workspace-grid">
        <aside className="workspace-rail">
          <section className="rail-section">
            <p className="section-label">调查地点</p>
            <nav className="scene-nav" aria-label="调查地点">
              {chapter.scenes.map((scene) => (
                <button
                  className={scene.id === activeSceneId ? "is-active" : ""}
                  type="button"
                  key={scene.id}
                  onClick={() => {
                    setActiveSceneId(scene.id);
                    setSelectedContentId(null);
                    setWorkspaceMode("investigation");
                  }}
                >
                  <span>{scene.eyebrow}</span>
                  {scene.name}
                </button>
              ))}
            </nav>
          </section>

          <section className="rail-section rail-section--objectives">
            <p className="section-label">当前目标</p>
            <ol className="objective-list">
              {chapter.objectives.map((objective) => {
                const complete = completedObjectiveIds.includes(objective.id);
                return (
                  <li className={complete ? "is-complete" : ""} key={objective.id}>
                    <ProgressMark complete={complete} />
                    <span>{objective.text}</span>
                  </li>
                );
              })}
            </ol>
          </section>
        </aside>

        <section className="investigation-stage">
          {chapterStage === "result" || chapterStage === "completed" ? (
            <ChapterResult chapter={chapter} />
          ) : workspaceMode === "dialogue" ? (
            <DialoguePanel />
          ) : workspaceMode === "reasoning" ? (
            <ReasoningPanel />
          ) : workspaceMode === "journal" ? (
            <DetectiveJournal />
          ) : workspaceMode === "connections" ? (
            <EvidenceConnections onOpenContent={openContent} />
          ) : (
            <>
              <div className="stage-heading">
                <div>
                  <p className="section-label">{activeScene?.eyebrow}</p>
                  <h2>{activeScene?.name}</h2>
                </div>
                <span>{materials.length} 份材料可查</span>
              </div>
              <p className="scene-description">{activeScene?.description}</p>

              <div className="material-grid">
                {materials.map((content) => {
                  const viewed = viewedContentIds.includes(content.id);
                  return (
                    <button
                      className={`material-card${selectedContentId === content.id ? " is-active" : ""}`}
                      type="button"
                      key={content.id}
                      onClick={() => openContent(content.id)}
                    >
                      <span className="material-card__type">
                        {content.type === "document"
                          ? "文档"
                          : content.type === "image"
                            ? "照片"
                            : "记录"}
                      </span>
                      <strong>{content.title}</strong>
                      <span>{content.summary}</span>
                      <small>{viewed ? "已查阅" : "未查阅"}</small>
                    </button>
                  );
                })}
              </div>

              {selectedContent ? (
                <ContentViewer
                  content={selectedContent}
                  onClose={() => setSelectedContentId(null)}
                />
              ) : (
                <section className="viewer-placeholder">
                  <p className="section-label">调查台</p>
                  <h3>选择一份材料开始调查</h3>
                  <p>细节不会自动进入证据簿。你需要在材料中亲自标记可疑之处。</p>
                </section>
              )}
            </>
          )}
        </section>

        <aside className="case-sidebar">
          <InvestigationNotebook onOpenContent={openContent} />

          <section className="case-panel">
            <p className="section-label">游戏状态</p>
            <dl className="state-list">
              <div>
                <dt>章节阶段</dt>
                <dd>{chapterStage}</dd>
              </div>
              <div>
                <dt>观察</dt>
                <dd>{discoveredObservationIds.length}</dd>
              </div>
              <div>
                <dt>对话话题</dt>
                <dd>{unlockedDialogueIds.length}</dd>
              </div>
              <div>
                <dt>推理节点</dt>
                <dd>{unlockedReasoningIds.length}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </main>
  );
}
