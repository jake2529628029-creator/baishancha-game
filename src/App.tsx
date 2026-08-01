import { useEffect, useState } from "react";
import { ChapterSelect } from "./features/chapter-select/ChapterSelect";
import { InvestigationToolsPrototype } from "./features/investigation-tools/InvestigationToolsPrototype";
import { ChapterWorkspace } from "./features/chapter-workspace/ChapterWorkspace";
import { PwaInstallButton } from "./pwa/PwaInstallButton";
import { useGameStore } from "./stores/game-store";
import "./styles/global.css";

function LoadingScreen() {
  return (
    <main className="app-shell app-shell--centered">
      <p className="eyebrow">静园档案正在开启</p>
      <h1>白山茶遗嘱</h1>
      <div className="loading-line" aria-label="正在加载剧情" />
    </main>
  );
}

function ErrorScreen({ message }: { message: string }) {
  const bootstrap = useGameStore((state) => state.bootstrap);

  return (
    <main className="app-shell app-shell--centered">
      <p className="eyebrow">档案加载失败</p>
      <h1>无法进入静园</h1>
      <p className="supporting-copy">{message}</p>
      <button className="primary-button" type="button" onClick={() => bootstrap()}>
        重新加载
      </button>
    </main>
  );
}

function TitleScreen({ onOpenChapters }: { onOpenChapters: () => void }) {
  const story = useGameStore((state) => state.story);
  const hasSave = useGameStore((state) => state.hasSave);
  const startNewGame = useGameStore((state) => state.startNewGame);
  const continueGame = useGameStore((state) => state.continueGame);
  const clearSave = useGameStore((state) => state.clearSave);

  if (!story) {
    return null;
  }

  return (
    <main className="app-shell">
      <section className="title-card">
        <div>
          <p className="eyebrow">暴雪山庄 · 非线性调查</p>
          <h1>{story.manifest.title}</h1>
          <p className="subtitle">{story.manifest.subtitle}</p>
        </div>

        <div className="title-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => startNewGame()}
          >
            开始调查
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={!hasSave}
            onClick={() => continueGame()}
          >
            继续调查
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={onOpenChapters}
          >
            章节档案
          </button>
          <PwaInstallButton />
          {hasSave ? (
            <button
              className="text-button"
              type="button"
              onClick={() => clearSave()}
            >
              删除本地存档
            </button>
          ) : null}
        </div>

        <footer>
          <span>V0.4.2 调查工具原型 · 支持离线存档</span>
          <span>剧情包 {story.manifest.contentVersion}</span>
        </footer>
      </section>
    </main>
  );
}

export default function App() {
  const status = useGameStore((state) => state.status);
  const errorMessage = useGameStore((state) => state.errorMessage);
  const sessionStarted = useGameStore((state) => state.sessionStarted);
  const bootstrap = useGameStore((state) => state.bootstrap);
  const [titleView, setTitleView] = useState<"title" | "chapters">("title");

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const isPrototype =
    new URLSearchParams(window.location.search).get("ui-prototype") === "1";

  if (status === "idle" || status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "error") {
    return <ErrorScreen message={errorMessage ?? "未知错误"} />;
  }

  if (isPrototype) {
    return <InvestigationToolsPrototype />;
  }

  if (sessionStarted) {
    return <ChapterWorkspace />;
  }

  return titleView === "chapters" ? (
    <ChapterSelect onBack={() => setTitleView("title")} />
  ) : (
    <TitleScreen onOpenChapters={() => setTitleView("chapters")} />
  );
}
