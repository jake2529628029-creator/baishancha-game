import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../../stores/game-store";
import type {
  ChatMessage,
  ContentItem,
  DocumentParagraph,
  ImageHotspot
} from "../../types/content";

interface ContentViewerProps {
  content: ContentItem;
  onClose: () => void;
}

function ObservationAction({
  observationId,
  label
}: {
  observationId: string;
  label: string;
}) {
  const discovered = useGameStore((state) =>
    state.discoveredObservationIds.includes(observationId)
  );
  const discoverObservation = useGameStore((state) => state.discoverObservation);
  const [working, setWorking] = useState(false);

  return (
    <button
      className={`observation-action${discovered ? " is-discovered" : ""}`}
      type="button"
      disabled={discovered || working}
      onClick={async () => {
        setWorking(true);
        try {
          await discoverObservation(observationId);
        } finally {
          setWorking(false);
        }
      }}
    >
      {discovered ? "✓ 已记入观察" : `＋ ${label}`}
    </button>
  );
}

function DocumentView({
  paragraphs,
  metadata
}: {
  paragraphs: DocumentParagraph[];
  metadata: Record<string, string>;
}) {
  return (
    <div className="document-view">
      <dl className="document-meta">
        {Object.entries(metadata).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="document-body">
        {paragraphs.map((paragraph) => (
          <section
            className={paragraph.observationId ? "inspectable-copy" : ""}
            key={paragraph.id}
          >
            <p>{paragraph.text}</p>
            {paragraph.observationId ? (
              <ObservationAction
                observationId={paragraph.observationId}
                label="标记这段信息"
              />
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}

export function ImageView({
  asset,
  alt,
  display,
  hotspots
}: {
  asset: string;
  alt: string;
  display: NonNullable<ContentItem["image"]>["display"];
  hotspots: ImageHotspot[];
}) {
  const aspectRatio = display.aspectRatio.replace(":", " / ");
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const transformRef = useRef(transform);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const zoomed = transform.scale > 1;

  const updateTransform = (next: { scale: number; x: number; y: number }) => {
    transformRef.current = next;
    setTransform(next);
  };
  const resetTransform = () => updateTransform({ scale: 1, x: 0, y: 0 });
  const zoomBy = (amount: number) => {
    const current = transformRef.current;
    const scale = Math.min(3, Math.max(1, current.scale + amount));
    updateTransform({
      scale,
      x: scale === 1 ? 0 : current.x,
      y: scale === 1 ? 0 : current.y
    });
  };

  return (
    <div className="image-view">
      <div className="image-toolbar">
        <p className="viewer-hint">可双指缩放；放大后单指拖动检查细节。</p>
        <div className="image-zoom-controls" aria-label="照片缩放">
          <button
            className="secondary-button"
            type="button"
            aria-label="缩小照片"
            disabled={transform.scale <= 1}
            onClick={() => zoomBy(-0.5)}
          >
            −
          </button>
          <output>{Math.round(transform.scale * 100)}%</output>
          <button
            className="secondary-button"
            type="button"
            aria-label="放大照片"
            disabled={transform.scale >= 3}
            onClick={() => zoomBy(0.5)}
          >
            ＋
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={!zoomed}
            onClick={resetTransform}
          >
            适应屏幕
          </button>
        </div>
      </div>
      <div
        className={`image-viewport${zoomed ? " is-zoomed" : ""}`}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY
          });
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const previous = pointers.current.get(event.pointerId);
          if (!previous) return;
          const others = [...pointers.current.entries()].filter(
            ([id]) => id !== event.pointerId
          );
          const current = transformRef.current;

          if (others.length) {
            const other = others[0][1];
            const oldDistance = Math.hypot(
              previous.x - other.x,
              previous.y - other.y
            );
            const newDistance = Math.hypot(
              event.clientX - other.x,
              event.clientY - other.y
            );
            if (oldDistance > 0) {
              updateTransform({
                ...current,
                scale: Math.min(
                  3,
                  Math.max(1, current.scale * (newDistance / oldDistance))
                )
              });
            }
          } else if (current.scale > 1) {
            updateTransform({
              ...current,
              x: current.x + event.clientX - previous.x,
              y: current.y + event.clientY - previous.y
            });
          }

          pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY
          });
        }}
        onPointerUp={(event) => {
          pointers.current.delete(event.pointerId);
          event.currentTarget.releasePointerCapture?.(event.pointerId);
          if (transformRef.current.scale <= 1) resetTransform();
        }}
        onPointerCancel={(event) => pointers.current.delete(event.pointerId)}
      >
        <div
          className={`evidence-image${zoomed ? " is-zoomed" : ""}`}
          style={{
            aspectRatio,
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`
          }}
        >
          <img
            src={asset}
            alt={alt}
            style={{
              objectFit: display.fit,
              objectPosition: `${display.focalPoint.x}% ${display.focalPoint.y}%`
            }}
          />
          {hotspots.map((hotspot) => (
            <div
              className="image-hotspot"
              key={hotspot.id}
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
            >
              <ObservationAction
                observationId={hotspot.observationId}
                label={hotspot.label}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  participantNames
}: {
  message: ChatMessage;
  participantNames: Record<string, string>;
}) {
  return (
    <article className="chat-bubble">
      <header>
        <strong>{participantNames[message.senderId] ?? message.senderId}</strong>
        <time>{message.time}</time>
      </header>
      <p>{message.text}</p>
      {message.observationId ? (
        <ObservationAction
          observationId={message.observationId}
          label="标记这条记录"
        />
      ) : null}
    </article>
  );
}

function ChatView({ content }: { content: ContentItem }) {
  if (!content.chat) {
    return null;
  }

  return (
    <div className="chat-view">
      <div className="chat-participants">
        {content.chat.participantIds
          .map((id) => content.chat?.participantNames[id] ?? id)
          .join(" / ")}
      </div>
      {content.chat.messages.map((message) => (
        <ChatBubble
          key={message.id}
          message={message}
          participantNames={content.chat?.participantNames ?? {}}
        />
      ))}
    </div>
  );
}

export function ContentViewer({ content, onClose }: ContentViewerProps) {
  const viewContent = useGameStore((state) => state.viewContent);

  useEffect(() => {
    void viewContent(content.id);
  }, [content.id, viewContent]);

  return (
    <article className="content-viewer" aria-live="polite">
      <header className="content-viewer__header">
        <div>
          <p className="section-label">
            {content.type === "document"
              ? "文档档案"
              : content.type === "image"
                ? "现场照片"
                : "通讯记录"}
          </p>
          <h3>{content.title}</h3>
          <p>{content.source}</p>
        </div>
        <button className="text-button" type="button" onClick={onClose}>
          关闭材料
        </button>
      </header>

      {content.type === "document" && content.document ? (
        <DocumentView
          metadata={content.document.metadata}
          paragraphs={content.document.paragraphs}
        />
      ) : null}
      {content.type === "image" && content.image ? (
        <ImageView
          asset={content.image.asset}
          alt={content.image.alt}
          display={content.image.display}
          hotspots={content.image.hotspots}
        />
      ) : null}
      {content.type === "chat" ? <ChatView content={content} /> : null}
    </article>
  );
}
