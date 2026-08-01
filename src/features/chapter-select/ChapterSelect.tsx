import { useGameStore } from "../../stores/game-store";

interface ChapterSelectProps {
  onBack: () => void;
}

function statusLabel(
  availability: "available" | "planned",
  unlocked: boolean,
  completed: boolean
) {
  if (completed) return "调查完成";
  if (availability === "planned") return unlocked ? "档案待开放" : "尚未解锁";
  return unlocked ? "可以调查" : "尚未解锁";
}

export function ChapterSelect({ onBack }: ChapterSelectProps) {
  const story = useGameStore((state) => state.story);
  const unlockedChapterIds = useGameStore((state) => state.unlockedChapterIds);
  const completedChapterIds = useGameStore((state) => state.completedChapterIds);
  const chapterProgressById = useGameStore((state) => state.chapterProgressById);
  const openChapter = useGameStore((state) => state.openChapter);

  if (!story) return null;

  const chapters = [...story.chapterManifest.chapters].sort(
    (left, right) => left.order - right.order
  );

  return (
    <main className="chapter-select-shell">
      <header className="chapter-select-header">
        <div>
          <p className="eyebrow">静园调查档案</p>
          <h1>选择章节</h1>
          <p>章节状态与调查完成度均来自 chapter-manifest 和本地存档。</p>
        </div>
        <button className="secondary-button" type="button" onClick={onBack}>
          返回标题
        </button>
      </header>

      <ol className="chapter-select-list">
        {chapters.map((chapter) => {
          const unlocked = unlockedChapterIds.includes(chapter.id);
          const completed = completedChapterIds.includes(chapter.id);
          const progress = chapterProgressById[chapter.id]?.progressPercent ?? 0;
          const canEnter =
            chapter.availability === "available" &&
            unlocked &&
            Boolean(story.chapters[chapter.id]);

          return (
            <li
              className={`chapter-select-card${unlocked ? " is-unlocked" : " is-locked"}${completed ? " is-completed" : ""}`}
              key={chapter.id}
            >
              <div className="chapter-select-card__index">
                {String(chapter.order).padStart(2, "0")}
              </div>
              <div className="chapter-select-card__body">
                <div className="chapter-select-card__meta">
                  <span>{chapter.subtitle ?? `第${chapter.order}章`}</span>
                  <span>{statusLabel(chapter.availability, unlocked, completed)}</span>
                </div>
                <h2>{chapter.title}</h2>
                <div
                  className="chapter-progress"
                  role="progressbar"
                  aria-label={`${chapter.title}调查完成度`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <span style={{ width: `${progress}%` }} />
                </div>
                <p>调查完成度 {progress}%</p>
              </div>
              <button
                className={canEnter ? "primary-button" : "secondary-button"}
                type="button"
                disabled={!canEnter}
                onClick={() => void openChapter(chapter.id)}
              >
                {completed ? "重新查看" : canEnter ? "进入调查" : "封存"}
              </button>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
