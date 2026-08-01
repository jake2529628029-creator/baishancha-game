import { useEffect, useMemo, useRef, useState } from "react";
import { evaluateCondition } from "../../engine/condition-evaluator/condition-evaluator";
import { getVisibleTimelineEvents } from "../../engine/timeline-engine/timeline-engine";
import { useGameStore } from "../../stores/game-store";
import type {
  TimelineEventDefinition,
  TimelinePuzzleDefinition
} from "../../types/timeline";

export interface TimelineSubmitResult {
  matched: boolean;
  feedback: string;
}

interface TimelineBoardViewProps {
  events: TimelineEventDefinition[];
  puzzle: TimelinePuzzleDefinition;
  initialOrder?: string[];
  onSubmit: (orderedEventIds: string[]) => Promise<TimelineSubmitResult | null>;
}

export function reorderTimeline(
  order: string[],
  movingId: string,
  targetId: string
) {
  if (movingId === targetId) return order;
  const withoutMoving = order.filter((id) => id !== movingId);
  const targetIndex = withoutMoving.indexOf(targetId);
  if (targetIndex < 0) return order;
  withoutMoving.splice(targetIndex, 0, movingId);
  return withoutMoving;
}

export function TimelineBoardView({
  events,
  puzzle,
  initialOrder,
  onSubmit
}: TimelineBoardViewProps) {
  const eventById = useMemo(
    () => Object.fromEntries(events.map((event) => [event.id, event])),
    [events]
  );
  const [order, setOrder] = useState(
    initialOrder?.length ? initialOrder : puzzle.eventIds
  );
  const [feedback, setFeedback] = useState<TimelineSubmitResult | null>(null);
  const draggingId = useRef<string | null>(null);

  useEffect(() => {
    setOrder(initialOrder?.length ? initialOrder : puzzle.eventIds);
    setFeedback(null);
  }, [initialOrder, puzzle.id, puzzle.eventIds]);

  const move = (id: string, direction: -1 | 1) => {
    setFeedback(null);
    setOrder((current) => {
      const index = current.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const moveDraggedOver = (targetId: string) => {
    if (!draggingId.current) return;
    setFeedback(null);
    setOrder((current) =>
      reorderTimeline(current, draggingId.current ?? "", targetId)
    );
  };

  return (
    <section className="timeline-tool" aria-label="时间线排序板">
      <header className="investigation-tool-header">
        <div>
          <p className="section-label">Timeline Reconstruction</p>
          <h2>{puzzle.title}</h2>
        </div>
        <p>拖动卡片重建顺序。手机端可按住拖柄移动，也可使用上下按钮。</p>
      </header>

      <ol className="timeline-card-list">
        {order.map((eventId, index) => {
          const event = eventById[eventId];
          if (!event) return null;

          return (
            <li
              className="timeline-card"
              data-timeline-event-id={event.id}
              draggable
              key={event.id}
              onDragStart={() => {
                draggingId.current = event.id;
                setFeedback(null);
              }}
              onDragOver={(dragEvent) => {
                dragEvent.preventDefault();
                moveDraggedOver(event.id);
              }}
              onDragEnd={() => {
                draggingId.current = null;
              }}
            >
              <span className="timeline-card__index">{index + 1}</span>
              <button
                className="timeline-drag-handle"
                type="button"
                aria-label={`拖动${event.title}`}
                onPointerDown={(pointerEvent) => {
                  draggingId.current = event.id;
                  pointerEvent.currentTarget.setPointerCapture?.(
                    pointerEvent.pointerId
                  );
                  setFeedback(null);
                }}
                onPointerMove={(pointerEvent) => {
                  if (!draggingId.current) return;
                  const target = document
                    .elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)
                    ?.closest<HTMLElement>("[data-timeline-event-id]");
                  const targetId = target?.dataset.timelineEventId;
                  if (targetId) moveDraggedOver(targetId);
                }}
                onPointerUp={(pointerEvent) => {
                  pointerEvent.currentTarget.releasePointerCapture?.(
                    pointerEvent.pointerId
                  );
                  draggingId.current = null;
                }}
              >
                <span aria-hidden="true">⠿</span>
              </button>
              <div className="timeline-card__body">
                <span>{event.occurredAt}</span>
                <h3>{event.title}</h3>
                <p>{event.description}</p>
                <small>{event.locationId}</small>
              </div>
              <div className="timeline-card__controls">
                <button
                  type="button"
                  aria-label={`${event.title}上移`}
                  disabled={index === 0}
                  onClick={() => move(event.id, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`${event.title}下移`}
                  disabled={index === order.length - 1}
                  onClick={() => move(event.id, 1)}
                >
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <footer className="timeline-submit">
        <div
          className={`timeline-feedback${feedback ? feedback.matched ? " is-correct" : " is-wrong" : ""}`}
          role="status"
          aria-live="polite"
        >
          {feedback?.feedback ?? "顺序尚未验证。错误提交不会中断调查。"}
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={async () => {
            const result = await onSubmit(order);
            if (result) setFeedback(result);
          }}
        >
          验证时间顺序
        </button>
      </footer>
    </section>
  );
}

export function TimelineBoard() {
  const story = useGameStore((state) => state.story);
  const currentChapterId = useGameStore((state) => state.currentChapterId);
  const progress = useGameStore((state) => state);
  const submitTimelineOrder = useGameStore(
    (state) => state.submitTimelineOrder
  );

  if (!story || !currentChapterId) return null;

  const puzzle = Object.values(story.timelinePuzzles).find(
    (item) =>
      item.chapterId === currentChapterId &&
      evaluateCondition(item.entryCondition, progress)
  );

  if (!puzzle) {
    return (
      <section className="tool-empty-state">
        <span className="tool-empty-state__icon" aria-hidden="true">◷</span>
        <p className="section-label">时间线</p>
        <h2>本章尚无待还原时间线</h2>
        <p>时间线引擎已经启用；当前锁稿数据没有向第一章开放排序谜题。</p>
      </section>
    );
  }

  const visibleIds = new Set(
    getVisibleTimelineEvents(story, progress).map((event) => event.id)
  );
  const events = puzzle.eventIds
    .filter((id) => visibleIds.has(id))
    .map((id) => story.timelineEvents[id])
    .filter((event): event is TimelineEventDefinition => Boolean(event));

  if (events.length !== puzzle.eventIds.length) {
    return (
      <section className="tool-empty-state">
        <span className="tool-empty-state__icon" aria-hidden="true">◷</span>
        <p className="section-label">时间线</p>
        <h2>事件尚未收集完整</h2>
        <p>继续调查以解锁全部时间节点。</p>
      </section>
    );
  }

  return (
    <TimelineBoardView
      events={events}
      puzzle={puzzle}
      initialOrder={progress.timelineOrders[puzzle.id]}
      onSubmit={(order) => submitTimelineOrder(puzzle.id, order)}
    />
  );
}
