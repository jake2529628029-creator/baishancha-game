import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const updateStandalone = () =>
      setIsStandalone(
        standaloneQuery.matches ||
          ("standalone" in navigator &&
            Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
      );
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    updateStandalone();
    standaloneQuery.addEventListener("change", updateStandalone);
    window.addEventListener("beforeinstallprompt", capturePrompt);

    return () => {
      standaloneQuery.removeEventListener("change", updateStandalone);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
    };
  }, []);

  if (isStandalone) {
    return <span className="pwa-installed-label">已作为 App 运行</span>;
  }

  if (!installPrompt) {
    return null;
  }

  return (
    <button
      className="secondary-button"
      type="button"
      onClick={async () => {
        await installPrompt.prompt();
        await installPrompt.userChoice;
        setInstallPrompt(null);
      }}
    >
      添加到手机桌面
    </button>
  );
}
