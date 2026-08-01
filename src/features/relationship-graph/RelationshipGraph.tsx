import { useMemo, useState } from "react";
import { getVisibleRelationships } from "../../engine/relationship-engine/relationship-engine";
import { useGameStore } from "../../stores/game-store";
import type {
  CharacterNode,
  RelationshipChangeRecord,
  RelationshipDefinition,
  RelationshipDimension,
  RelationshipInsightState,
  RelationshipStateMap
} from "../../types/relationship";

const dimensionLabels: Record<RelationshipDimension, string> = {
  trust: "信任",
  suspicion: "怀疑",
  understanding: "理解",
  hidden_information: "隐瞒"
};

const stateLabels: Record<RelationshipInsightState, string> = {
  unknown: "未知",
  suspected: "有所察觉",
  confirmed: "已经确认",
  questioned: "受到质疑",
  reinterpreted: "重新理解"
};

interface RelationshipGraphViewProps {
  characters: CharacterNode[];
  relationships: RelationshipDefinition[];
  states: RelationshipStateMap;
  history: RelationshipChangeRecord[];
}

function characterPosition(index: number, total: number) {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1) - Math.PI / 2;
  const radius = total <= 2 ? 28 : 37;
  return {
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius
  };
}

export function RelationshipGraphView({
  characters,
  relationships,
  states,
  history
}: RelationshipGraphViewProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    characters[0]?.id ?? ""
  );
  const [selectedRelationshipId, setSelectedRelationshipId] = useState(
    relationships[0]?.id ?? ""
  );
  const positions = useMemo(
    () =>
      Object.fromEntries(
        characters.map((character, index) => [
          character.id,
          characterPosition(index, characters.length)
        ])
      ),
    [characters]
  );
  const selectedRelationship =
    relationships.find((item) => item.id === selectedRelationshipId) ??
    relationships.find(
      (item) =>
        item.fromCharacterId === selectedCharacterId ||
        item.toCharacterId === selectedCharacterId
    );
  const selectedState = selectedRelationship
    ? states[selectedRelationship.id] ?? selectedRelationship.initialDimensions
    : {};
  const selectedHistory = selectedRelationship
    ? history.filter(
        (record) => record.relationshipId === selectedRelationship.id
      )
    : [];
  const characterName = (id: string) =>
    characters.find((character) => character.id === id)?.name ?? "未知人物";

  if (!characters.length || !relationships.length) {
    return (
      <section className="tool-empty-state">
        <span className="tool-empty-state__icon" aria-hidden="true">◎</span>
        <p className="section-label">人物关系图</p>
        <h2>关系档案尚未进入本章</h2>
        <p>
          引擎已经就绪。当前第一章剧情包未提供关系节点，因此不会用界面数据替代锁稿内容。
        </p>
      </section>
    );
  }

  return (
    <section className="relationship-tool" aria-label="人物关系图">
      <header className="investigation-tool-header">
        <div>
          <p className="section-label">Relationship Graph</p>
          <h2>人物关系图</h2>
        </div>
        <p>这里记录的是玩家对关系的理解变化，不是人物好感度。</p>
      </header>

      <div className="relationship-layout">
        <div className="relationship-canvas">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            {relationships.map((relationship) => {
              const from = positions[relationship.fromCharacterId];
              const to = positions[relationship.toCharacterId];
              return from && to ? (
                <line
                  className={
                    relationship.id === selectedRelationship?.id
                      ? "is-selected"
                      : ""
                  }
                  key={relationship.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                />
              ) : null;
            })}
          </svg>
          {characters.map((character) => {
            const position = positions[character.id];
            return (
              <button
                className={`relationship-node${selectedCharacterId === character.id ? " is-selected" : ""}`}
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
                type="button"
                key={character.id}
                onClick={() => {
                  setSelectedCharacterId(character.id);
                  const next = relationships.find(
                    (item) =>
                      item.fromCharacterId === character.id ||
                      item.toCharacterId === character.id
                  );
                  if (next) setSelectedRelationshipId(next.id);
                }}
              >
                <span>{character.name.slice(0, 1)}</span>
                <strong>{character.name}</strong>
                <small>{character.role}</small>
              </button>
            );
          })}
        </div>

        <aside className="relationship-detail">
          <p className="section-label">关系档案</p>
          <div className="relationship-tabs" role="list">
            {relationships.map((relationship) => (
              <button
                className={
                  relationship.id === selectedRelationship?.id ? "is-active" : ""
                }
                type="button"
                key={relationship.id}
                onClick={() => setSelectedRelationshipId(relationship.id)}
              >
                {characterName(relationship.fromCharacterId)}
                <span>— {relationship.label} —</span>
                {characterName(relationship.toCharacterId)}
              </button>
            ))}
          </div>

          {selectedRelationship ? (
            <>
              <h3>
                {characterName(selectedRelationship.fromCharacterId)}
                <span>{selectedRelationship.label}</span>
                {characterName(selectedRelationship.toCharacterId)}
              </h3>
              <dl className="relationship-dimensions">
                {(Object.keys(dimensionLabels) as RelationshipDimension[]).map(
                  (dimension) => {
                    const state = selectedState[dimension] ?? "unknown";
                    return (
                      <div key={dimension}>
                        <dt>{dimensionLabels[dimension]}</dt>
                        <dd data-state={state}>{stateLabels[state]}</dd>
                      </div>
                    );
                  }
                )}
              </dl>

              <div className="relationship-history">
                <p className="section-label">理解变化记录</p>
                {selectedHistory.length ? (
                  <ol>
                    {selectedHistory.map((record) => (
                      <li key={`${record.sequence}-${record.dimension}`}>
                        <span>{dimensionLabels[record.dimension]}</span>
                        <p>
                          {record.previousState
                            ? stateLabels[record.previousState]
                            : "尚无结论"}
                          {" → "}
                          <strong>{stateLabels[record.nextState]}</strong>
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted-copy">尚未发生可记录的关系重释。</p>
                )}
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

export function RelationshipGraph() {
  const story = useGameStore((state) => state.story);
  const progress = useGameStore((state) => state);

  if (!story) return null;

  return (
    <RelationshipGraphView
      characters={Object.values(story.characters)}
      relationships={getVisibleRelationships(story, progress)}
      states={progress.relationshipStates}
      history={progress.relationshipHistory}
    />
  );
}
