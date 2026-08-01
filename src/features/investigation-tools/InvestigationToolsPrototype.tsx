import { useState } from "react";
import type {
  DetectiveBoardConnection,
  DetectiveBoardState
} from "../../types/detective-board";
import { DetectiveBoardView } from "../detective-board/DetectiveBoard";
import { ImageView } from "../content-viewer/ContentViewer";
import { RelationshipGraphView } from "../relationship-graph/RelationshipGraph";
import { TimelineBoardView } from "../timeline-board/TimelineBoard";
import {
  prototypeCharacters,
  prototypeDetectiveBoard,
  prototypeRelationshipHistory,
  prototypeRelationships,
  prototypeRelationshipStates,
  prototypeTimelineEvents,
  prototypeTimelinePuzzle
} from "./prototype-data";

type PrototypeMode = "relationships" | "timeline" | "board" | "image";

export function InvestigationToolsPrototype() {
  const [mode, setMode] = useState<PrototypeMode>("relationships");
  const [boardState, setBoardState] = useState<DetectiveBoardState>({
    placements: [],
    connections: [],
    solvedPropositionIds: []
  });

  const connect = (connection: DetectiveBoardConnection) => {
    setBoardState((current) => ({
      ...current,
      connections: [
        ...current.connections.filter((item) => item.id !== connection.id),
        connection
      ]
    }));
  };

  return (
    <main className="workspace-shell prototype-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">V0.4.2 · 非剧情 UI Fixture</p>
          <h1>调查工具交互原型</h1>
        </div>
        <nav className="workspace-mode-nav" aria-label="原型功能">
          <button
            className={mode === "relationships" ? "is-active" : ""}
            type="button"
            onClick={() => setMode("relationships")}
          >
            关系
          </button>
          <button
            className={mode === "timeline" ? "is-active" : ""}
            type="button"
            onClick={() => setMode("timeline")}
          >
            时间线
          </button>
          <button
            className={mode === "board" ? "is-active" : ""}
            type="button"
            onClick={() => setMode("board")}
          >
            侦探墙
          </button>
          <button
            className={mode === "image" ? "is-active" : ""}
            type="button"
            onClick={() => setMode("image")}
          >
            照片
          </button>
        </nav>
        <p className="prototype-badge">仅用于交互验收，不写入剧情包</p>
      </header>
      <section className="prototype-stage">
        {mode === "relationships" ? (
          <RelationshipGraphView
            characters={prototypeCharacters}
            relationships={prototypeRelationships}
            states={prototypeRelationshipStates}
            history={prototypeRelationshipHistory}
          />
        ) : mode === "timeline" ? (
          <TimelineBoardView
            events={prototypeTimelineEvents}
            puzzle={prototypeTimelinePuzzle}
            onSubmit={async (order) => {
              const matched =
                order.join("|") ===
                prototypeTimelinePuzzle.solutions[0].orderedEventIds.join("|");
              return {
                matched,
                feedback: matched
                  ? "时间顺序成立。测试事件已触发。"
                  : prototypeTimelinePuzzle.incorrectFeedback
              };
            }}
          />
        ) : mode === "board" ? (
          <DetectiveBoardView
            definition={prototypeDetectiveBoard}
            state={boardState}
            onPlace={(cardId, x, y) =>
              setBoardState((current) => ({
                ...current,
                placements: [
                  ...current.placements.filter(
                    (placement) => placement.cardId !== cardId
                  ),
                  { cardId, x, y }
                ]
              }))
            }
            onConnect={connect}
            onDisconnect={(connectionId) =>
              setBoardState((current) => ({
                ...current,
                connections: current.connections.filter(
                  (connection) => connection.id !== connectionId
                )
              }))
            }
            onSubmitProposition={async () => {
              const matched = boardState.connections.some(
                (connection) =>
                  connection.fromCardId === "card-evidence" &&
                  connection.toCardId === "card-time" &&
                  connection.relationType === "contradicts"
              );
              return {
                matched,
                feedback: matched
                  ? "命题成立。"
                  : "当前连线还不足以支持这项命题。"
              };
            }}
          />
        ) : (
          <section className="prototype-image">
            <header className="investigation-tool-header">
              <div>
                <p className="section-label">Mobile Image Inspection</p>
                <h2>照片查看手势验收</h2>
              </div>
              <p>复用第一章现有图片资产，仅验证缩放与拖动，不产生剧情状态。</p>
            </header>
            <ImageView
              asset="/story/runtime/assets/chapter-01/teacup-scene.png"
              alt="第一章现有茶杯场景测试图"
              display={{
                aspectRatio: "16:9",
                fit: "cover",
                focalPoint: { x: 50, y: 50 }
              }}
              hotspots={[]}
            />
          </section>
        )}
      </section>
    </main>
  );
}
