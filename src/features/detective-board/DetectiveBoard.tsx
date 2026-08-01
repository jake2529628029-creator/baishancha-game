import { useEffect, useMemo, useRef, useState } from "react";
import { evaluateCondition } from "../../engine/condition-evaluator/condition-evaluator";
import { useGameStore } from "../../stores/game-store";
import type {
  DetectiveBoardConnection,
  DetectiveBoardDefinition,
  DetectiveBoardState
} from "../../types/detective-board";

const cardTypeLabels = {
  character: "人物",
  evidence: "证据",
  timeline: "时间",
  proposition: "命题"
} as const;

const relationOptions = [
  { value: "supports", label: "支持" },
  { value: "contradicts", label: "矛盾" },
  { value: "present-at", label: "在场" },
  { value: "protects", label: "保护" },
  { value: "causes", label: "导致" }
];

interface DetectiveBoardViewProps {
  definition: DetectiveBoardDefinition;
  state: DetectiveBoardState;
  onPlace: (cardId: string, x: number, y: number) => void | Promise<void>;
  onConnect: (connection: DetectiveBoardConnection) => void | Promise<void>;
  onDisconnect: (connectionId: string) => void | Promise<void>;
  onSubmitProposition: (
    propositionId: string
  ) => Promise<{ matched: boolean; feedback: string } | null>;
}

function initialPlacement(index: number) {
  return {
    x: 6 + (index % 3) * 31,
    y: 8 + Math.floor(index / 3) * 28
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function DetectiveBoardView({
  definition,
  state,
  onPlace,
  onConnect,
  onDisconnect,
  onSubmitProposition
}: DetectiveBoardViewProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    cardId: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const storedPlacements = useMemo(
    () =>
      Object.fromEntries(
        definition.cards.map((card, index) => {
          const saved = state.placements.find(
            (placement) => placement.cardId === card.id
          );
          return [card.id, saved ?? { cardId: card.id, ...initialPlacement(index) }];
        })
      ),
    [definition.cards, state.placements]
  );
  const [placements, setPlacements] = useState(storedPlacements);
  const placementsRef = useRef(storedPlacements);
  const [fromCardId, setFromCardId] = useState("");
  const [toCardId, setToCardId] = useState("");
  const [relationType, setRelationType] = useState(relationOptions[0].value);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    placementsRef.current = storedPlacements;
    setPlacements(storedPlacements);
  }, [storedPlacements]);

  const cardById = useMemo(
    () => Object.fromEntries(definition.cards.map((card) => [card.id, card])),
    [definition.cards]
  );

  const beginDrag = (
    cardId: string,
    pointerId: number,
    clientX: number,
    clientY: number
  ) => {
    const rect = boardRef.current?.getBoundingClientRect();
    const placement = placementsRef.current[cardId];
    if (!rect || !placement) return;
    dragRef.current = {
      cardId,
      pointerId,
      offsetX: clientX - rect.left - (placement.x / 100) * rect.width,
      offsetY: clientY - rect.top - (placement.y / 100) * rect.height
    };
  };

  const updateDrag = (clientX: number, clientY: number) => {
    const drag = dragRef.current;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    const x = clamp(
      ((clientX - rect.left - drag.offsetX) / rect.width) * 100,
      1,
      79
    );
    const y = clamp(
      ((clientY - rect.top - drag.offsetY) / rect.height) * 100,
      1,
      82
    );
    const next = {
      ...placementsRef.current,
      [drag.cardId]: { cardId: drag.cardId, x, y }
    };
    placementsRef.current = next;
    setPlacements(next);
  };

  const finishDrag = () => {
    const drag = dragRef.current;
    if (!drag) return;
    const placement = placementsRef.current[drag.cardId];
    dragRef.current = null;
    if (placement) void onPlace(drag.cardId, placement.x, placement.y);
  };

  return (
    <section className="detective-tool" aria-label="侦探墙">
      <header className="investigation-tool-header">
        <div>
          <p className="section-label">Detective Board</p>
          <h2>{definition.title}</h2>
        </div>
        <p>拖动卡片组织思路，选择两张卡建立证据关系。布局与连线自动存档。</p>
      </header>

      <div className="detective-layout">
        <div
          className="detective-canvas"
          ref={boardRef}
          onPointerMove={(event) => updateDrag(event.clientX, event.clientY)}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {state.connections.map((connection) => {
              const from = placements[connection.fromCardId];
              const to = placements[connection.toCardId];
              if (!from || !to) return null;
              return (
                <line
                  key={connection.id}
                  x1={from.x + 10}
                  y1={from.y + 8}
                  x2={to.x + 10}
                  y2={to.y + 8}
                />
              );
            })}
          </svg>
          {definition.cards.map((card) => {
            const placement = placements[card.id];
            return (
              <article
                className={`detective-card detective-card--${card.type}${fromCardId === card.id ? " is-source" : ""}${toCardId === card.id ? " is-target" : ""}`}
                data-board-card-id={card.id}
                key={card.id}
                style={{ left: `${placement.x}%`, top: `${placement.y}%` }}
              >
                <button
                  className="detective-card__drag"
                  type="button"
                  aria-label={`拖动${card.title}`}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                    beginDrag(
                      card.id,
                      event.pointerId,
                      event.clientX,
                      event.clientY
                    );
                  }}
                  onPointerUp={(event) => {
                    event.currentTarget.releasePointerCapture?.(event.pointerId);
                    finishDrag();
                  }}
                >
                  ⠿
                </button>
                <span>{cardTypeLabels[card.type]}</span>
                <h3>{card.title}</h3>
                <button
                  className="detective-card__link"
                  type="button"
                  onClick={() => {
                    if (!fromCardId || toCardId) {
                      setFromCardId(card.id);
                      setToCardId("");
                    } else if (fromCardId !== card.id) {
                      setToCardId(card.id);
                    }
                  }}
                >
                  {fromCardId === card.id
                    ? "已选起点"
                    : toCardId === card.id
                      ? "已选终点"
                      : "用于连线"}
                </button>
              </article>
            );
          })}
        </div>

        <aside className="detective-controls">
          <section>
            <p className="section-label">建立连接</p>
            <dl className="connection-draft">
              <div>
                <dt>起点</dt>
                <dd>{cardById[fromCardId]?.title ?? "请选择卡片"}</dd>
              </div>
              <div>
                <dt>终点</dt>
                <dd>{cardById[toCardId]?.title ?? "请选择卡片"}</dd>
              </div>
            </dl>
            <label className="field-label">
              关系
              <select
                value={relationType}
                onChange={(event) => setRelationType(event.target.value)}
              >
                {relationOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary-button"
              type="button"
              disabled={!fromCardId || !toCardId}
              onClick={() => {
                if (!fromCardId || !toCardId) return;
                const id =
                  globalThis.crypto?.randomUUID?.() ??
                  `connection-${Date.now()}`;
                void onConnect({
                  id,
                  fromCardId,
                  toCardId,
                  relationType,
                  label:
                    relationOptions.find((item) => item.value === relationType)
                      ?.label ?? relationType
                });
                setFromCardId("");
                setToCardId("");
              }}
            >
              连接卡片
            </button>
          </section>

          <section className="saved-connections">
            <p className="section-label">已保存连线</p>
            {state.connections.length ? (
              <ul>
                {state.connections.map((connection) => (
                  <li key={connection.id}>
                    <p>
                      {cardById[connection.fromCardId]?.title}
                      <span>{connection.label ?? connection.relationType}</span>
                      {cardById[connection.toCardId]?.title}
                    </p>
                    <button
                      type="button"
                      aria-label={`删除${connection.label ?? connection.relationType}连接`}
                      onClick={() => void onDisconnect(connection.id)}
                    >
                      删除
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-copy">尚未建立连接。</p>
            )}
          </section>

          {definition.propositions.map((proposition) => (
            <section className="detective-proposition" key={proposition.id}>
              <p className="section-label">推理命题</p>
              <h3>{proposition.title}</h3>
              <p>{proposition.prompt}</p>
              <button
                className="primary-button"
                type="button"
                onClick={async () => {
                  const result = await onSubmitProposition(proposition.id);
                  if (result) setFeedback(result.feedback);
                }}
              >
                验证命题
              </button>
            </section>
          ))}
          <p className="detective-feedback" role="status" aria-live="polite">
            {feedback}
          </p>
        </aside>
      </div>
    </section>
  );
}

export function DetectiveBoard() {
  const story = useGameStore((state) => state.story);
  const currentChapterId = useGameStore((state) => state.currentChapterId);
  const progress = useGameStore((state) => state);
  const placeCard = useGameStore((state) => state.placeDetectiveCard);
  const connectCards = useGameStore((state) => state.connectDetectiveCards);
  const disconnectCards = useGameStore(
    (state) => state.disconnectDetectiveCards
  );
  const submitProposition = useGameStore(
    (state) => state.submitDetectiveProposition
  );

  if (!story || !currentChapterId) return null;

  const rawDefinition = Object.values(story.detectiveBoards).find(
    (board) => board.chapterId === currentChapterId
  );

  if (!rawDefinition) {
    return (
      <section className="tool-empty-state">
        <span className="tool-empty-state__icon" aria-hidden="true">◇</span>
        <p className="section-label">侦探墙</p>
        <h2>本章尚无可固定的推理卡</h2>
        <p>自由布局、连线和存档能力已经就绪；当前第一章锁稿未提供卡片定义。</p>
      </section>
    );
  }

  const definition: DetectiveBoardDefinition = {
    ...rawDefinition,
    cards: rawDefinition.cards.filter((card) =>
      evaluateCondition(card.revealCondition, progress)
    ),
    propositions: rawDefinition.propositions.filter((proposition) =>
      evaluateCondition(proposition.entryCondition, progress)
    )
  };
  const state = progress.detectiveBoardStates[definition.id] ?? {
    placements: [],
    connections: definition.initialConnections,
    solvedPropositionIds: []
  };

  return (
    <DetectiveBoardView
      definition={definition}
      state={state}
      onPlace={(cardId, x, y) => placeCard(definition.id, cardId, x, y)}
      onConnect={(connection) => connectCards(definition.id, connection)}
      onDisconnect={(connectionId) =>
        disconnectCards(definition.id, connectionId)
      }
      onSubmitProposition={(propositionId) =>
        submitProposition(definition.id, propositionId)
      }
    />
  );
}
