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
import { RelationshipGraph } from "../relationship-graph/RelationshipGraph";
import { TimelineBoard } from "../timeline-board/TimelineBoard";
import { DetectiveBoard } from "../detective-board/DetectiveBoard";
import { UnlockToasts } from "./UnlockToasts";
import {
  getChapterStageLabel,
  getContentRemainingClues,
  getSceneProgress,
  suggestNextStep
} from "./workspace-progress";

type WorkspaceMode =
  | "investigation"
  | "dialogue"
  | "reasoning"
  | "journal"
  | "connections"
  | "relationships"
  | "timeline"
  | "detective-board";

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
  const collectedEvidenceIds = useGameStore((state) => state.collectedEvidenceIds);
  const unlockedDialogueIds = useGameStore((state) => state.unlockedDialogueIds);
  const completedDialogueIds = useGameStore((state) => state.completedDialogueIds);
  const unlockedReasoningIds = useGameStore((state) => state.unlockedReasoningIds);
  const reasoningResults = useGameStore((state) => state.reasoningResults);
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

  const progressSnapshot = {
    unlockedContentIds,
    viewedContentIds,
    discoveredObservationIds,
    collectedEvidenceIds,
    unlockedDialogueIds,
    completedDialogueIds,
    unlockedReasoningIds,
    reasoningResults
  };
  const nextStep = suggestNextStep(story, progressSnapshot, chapter);

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
  const isWideTool =
    workspaceMode === "relationships" ||
    workspaceMode === "timeline" ||
    workspaceMode === "detective-board";
  const manifestEntry = story.chapterManifest.chapters.find(
    (item) => item.id === chapter.id
  );

  // 待处理数（未完成的才提醒），而不是总数——总数只是噪音
  const pendingDialogueCount = unlockedDialogueIds.filter(
    (id) => !completedDialogueIds.includes(id)
  ).length;
  const pendingReasoningCount = unlockedReasoningIds.filter(
    (id) => !reasoningResults[id]
  ).length;

  const chapterContentUnlocked = chapter.contentIds.filter((id) =>
    unlockedContentIds.includes(id)
  );
  const chapterContentViewed = chapterContentUnlocked.filter((id) =>
    viewedContentIds.includes(id)
  );
  const chapterDialogueDone = chapter.dialogueIds.filter((id) =>
    completedDialogueIds.includes(id)
  ).length;
  const chapterReasoningDone = chapter.reasoningIds.filter(
    (id) => reasoningResults[id]
  ).length;

  return (
    <main className="workspace-shell">
      <UnlockToasts
        onNavigate={(kind) => {
          if (kind === "dialogue") setWorkspaceMode("dialogue");
          else if (kind === "reasoning") setWorkspaceMode("reasoning");
          else if (kind === "evidence" || kind === "observation")
            setWorkspaceMode("journal");
          else setWorkspaceMode("investigation");
        }}
      />
      <header className="workspace-header">
        <div>
          <p className="eyebrow">
            {manifestEntry?.subtitle ?? `第${manifestEntry?.order ?? chapter.order}章`} ·{" "}
            {chapter.title}
          </p>
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
            {pendingDialogueCount ? (
              <span className="nav-badge nav-badge--pending">
                {pendingDialogueCount}
              </span>
            ) : null}
          </button>
          <button
            className={workspaceMode === "reasoning" ? "is-active" : ""}
            type="button"
            onClick={() => setWorkspaceMode("reasoning")}
          >
            推理
            {pendingReasoningCount ? (
              <span className="nav-badge nav-badge--pending">
                {pendingReasoningCount}
              </span>
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
            className={workspaceMode === "relationships" ? "is-active" : ""}
            type="button"
            onClick={() => setWorkspaceMode("relationships")}
          >
            关系
          </button>
          <button
            className={workspaceMode === "timeline" ? "is-active" : ""}
            type="button"
            onClick={() => setWorkspaceMode("timeline")}
          >
            时间线
          </button>
          <button
            className={workspaceMode === "detective-board" ? "is-active" : ""}
            type="button"
            onClick={() => setWorkspaceMode("detective-board")}
          >
            侦探墙
          </button>
        </nav>
        <div className="workspace-header__actions">
          <span className="save-indicator">● 本地自动存档</span>
          <button className="text-button" type="button" onClick={returnToTitle}>
            返回标题
          </button>
        </div>
      </header>

      <div className={`workspace-grid${isWideTool ? " workspace-grid--wide-tool" : ""}`}>
        <aside className="workspace-rail" aria-hidden={isWideTool || undefined}>
          <section className="rail-section">
            <p className="section-label">调查地点</p>
            <nav className="scene-nav" aria-label="调查地点">
              {chapter.scenes.map((scene) => {
                const sceneProgress = getSceneProgress(
                  story,
                  progressSnapshot,
                  chapter,
                  scene.id
                );
                return (
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
                    <small className="scene-progress">
                      {sceneProgress.viewed}/{sceneProgress.unlocked} 已查阅
                    </small>
                  </button>
                );
              })}
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
            {nextStep ? (
              <button
                className="next-step-card"
                type="button"
                onClick={() => {
                  if (nextStep.target === "investigation" && nextStep.contentId) {
                    openContent(nextStep.contentId);
                  } else {
                    setWorkspaceMode(nextStep.target);
                  }
                }}
              >
                <span className="section-label">下一步建议</span>
                <span>{nextStep.text}</span>
              </button>
            ) : null}
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
          ) : workspaceMode === "relationships" ? (
            <RelationshipGraph />
          ) : workspaceMode === "timeline" ? (
            <TimelineBoard />
          ) : workspaceMode === "detective-board" ? (
            <DetectiveBoard />
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
                  const clues = getContentRemainingClues(
                    story,
                    progressSnapshot,
                    content.id
                  );
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
                      <small className="material-card__status">
                        {!viewed ? (
                          <em className="status-tag status-tag--new">新</em>
                        ) : clues.remaining > 0 ? (
                          <em className="status-tag status-tag--clues">
                            还有 {clues.remaining} 处细节
                          </em>
                        ) : clues.total > 0 ? (
                          <em className="status-tag status-tag--done">已挖完</em>
                        ) : (
                          <em className="status-tag">已查阅</em>
                        )}
                      </small>
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

        <aside className="case-sidebar" aria-hidden={isWideTool || undefined}>
          <InvestigationNotebook onOpenContent={openContent} />

          <section className="case-panel">
            <p className="section-label">调查进度</p>
            <dl className="state-list">
              <div>
                <dt>当前阶段</dt>
                <dd>{getChapterStageLabel(chapterStage)}</dd>
              </div>
              <div>
                <dt>材料查阅</dt>
                <dd>
                  {chapterContentViewed.length}/{chapterContentUnlocked.length}
                </dd>
              </div>
              <div>
                <dt>观察细节</dt>
                <dd>{discoveredObservationIds.length}</dd>
              </div>
              <div>
                <dt>正式证据</dt>
                <dd>{collectedEvidenceIds.length}</dd>
              </div>
              <div>
                <dt>询问完成</dt>
                <dd>
                  {chapterDialogueDone}/{chapter.dialogueIds.length}
                </dd>
              </div>
              <div>
                <dt>推理完成</dt>
                <dd>
                  {chapterReasoningDone}/{chapter.reasoningIds.length}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </main>
  );
}
