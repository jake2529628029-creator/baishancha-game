import { useEffect, useState } from "react";
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

function ImageView({
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
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className="image-view">
      <div className="image-toolbar">
        <p className="viewer-hint">可双指缩放，或使用放大模式检查细节。</p>
        <button
          className="secondary-button"
          type="button"
          aria-pressed={zoomed}
          onClick={() => setZoomed((current) => !current)}
        >
          {zoomed ? "适应屏幕" : "放大照片"}
        </button>
      </div>
      <div className="image-viewport">
        <div
          className={`evidence-image${zoomed ? " is-zoomed" : ""}`}
          style={{ aspectRatio }}
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
