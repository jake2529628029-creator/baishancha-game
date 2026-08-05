import { useEffect } from "react";
import { useGameStore, type UnlockNotification } from "../../stores/game-store";

const kindIcons: Record<UnlockNotification["kind"], string> = {
  content: "📄",
  dialogue: "💬",
  reasoning: "🧩",
  evidence: "🔖",
  observation: "👁"
};

interface UnlockToastsProps {
  onNavigate: (kind: UnlockNotification["kind"]) => void;
}

function ToastCard({
  notification,
  onNavigate
}: {
  notification: UnlockNotification;
  onNavigate: (kind: UnlockNotification["kind"]) => void;
}) {
  const dismissNotification = useGameStore((state) => state.dismissNotification);

  useEffect(() => {
    const timer = window.setTimeout(
      () => dismissNotification(notification.id),
      9000
    );
    return () => window.clearTimeout(timer);
  }, [notification.id, dismissNotification]);

  return (
    <div className="unlock-toast" role="status">
      <button
        className="unlock-toast__body"
        type="button"
        onClick={() => {
          onNavigate(notification.kind);
          dismissNotification(notification.id);
        }}
      >
        <span className="unlock-toast__icon" aria-hidden="true">
          {kindIcons[notification.kind]}
        </span>
        <span>
          <strong>{notification.title}</strong>
          <span>{notification.detail}</span>
        </span>
      </button>
      <button
        className="unlock-toast__close"
        type="button"
        aria-label="关闭通知"
        onClick={() => dismissNotification(notification.id)}
      >
        ×
      </button>
    </div>
  );
}

/** 右上角浮动通知：新解锁内容即时可见，点击直接跳转到对应功能 */
export function UnlockToasts({ onNavigate }: UnlockToastsProps) {
  const notifications = useGameStore((state) => state.notifications);

  if (!notifications.length) {
    return null;
  }

  return (
    <div className="unlock-toasts" aria-live="polite">
      {notifications.map((notification) => (
        <ToastCard
          key={notification.id}
          notification={notification}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
