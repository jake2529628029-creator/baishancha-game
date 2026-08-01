import type { DetectiveBoardDefinition } from "../../types/detective-board";
import type {
  CharacterNode,
  RelationshipChangeRecord,
  RelationshipDefinition,
  RelationshipStateMap
} from "../../types/relationship";
import type {
  TimelineEventDefinition,
  TimelinePuzzleDefinition
} from "../../types/timeline";

const always = { type: "always" as const };

export const prototypeCharacters: CharacterNode[] = [
  { id: "person-a", name: "人物甲", role: "档案关系原型" },
  { id: "person-b", name: "人物乙", role: "档案关系原型" },
  { id: "person-c", name: "人物丙", role: "档案关系原型" },
  { id: "person-d", name: "人物丁", role: "档案关系原型" }
];

export const prototypeRelationships: RelationshipDefinition[] = [
  {
    id: "relation-a-b",
    fromCharacterId: "person-a",
    toCharacterId: "person-b",
    type: "protects",
    label: "声称保护",
    initialDimensions: {
      trust: "questioned",
      suspicion: "suspected",
      understanding: "reinterpreted",
      hidden_information: "confirmed"
    },
    revealCondition: always
  },
  {
    id: "relation-b-c",
    fromCharacterId: "person-b",
    toCharacterId: "person-c",
    type: "withholds",
    label: "隐瞒信息",
    initialDimensions: {
      trust: "unknown",
      suspicion: "confirmed",
      understanding: "suspected",
      hidden_information: "confirmed"
    },
    revealCondition: always
  },
  {
    id: "relation-c-d",
    fromCharacterId: "person-c",
    toCharacterId: "person-d",
    type: "conflicts",
    label: "证词冲突",
    initialDimensions: {
      trust: "questioned",
      suspicion: "suspected",
      understanding: "unknown",
      hidden_information: "suspected"
    },
    revealCondition: always
  },
  {
    id: "relation-d-a",
    fromCharacterId: "person-d",
    toCharacterId: "person-a",
    type: "trusts",
    label: "旧日承诺",
    initialDimensions: {
      trust: "confirmed",
      suspicion: "unknown",
      understanding: "questioned",
      hidden_information: "suspected"
    },
    revealCondition: always
  }
];

export const prototypeRelationshipStates: RelationshipStateMap =
  Object.fromEntries(
    prototypeRelationships.map((relationship) => [
      relationship.id,
      relationship.initialDimensions
    ])
  );

export const prototypeRelationshipHistory: RelationshipChangeRecord[] = [
  {
    sequence: 1,
    relationshipId: "relation-a-b",
    dimension: "trust",
    previousState: "confirmed",
    nextState: "questioned"
  },
  {
    sequence: 2,
    relationshipId: "relation-a-b",
    dimension: "understanding",
    previousState: "suspected",
    nextState: "reinterpreted"
  }
];

export const prototypeTimelineEvents: TimelineEventDefinition[] = [
  {
    id: "time-1",
    chapterId: "prototype",
    title: "门厅记录出现",
    occurredAt: "21:08",
    characterIds: ["person-a"],
    locationId: "门厅",
    description: "一张先后顺序待确认的中性测试卡。",
    revealCondition: always
  },
  {
    id: "time-2",
    chapterId: "prototype",
    title: "书房灯光熄灭",
    occurredAt: "21:14",
    characterIds: ["person-b"],
    locationId: "书房",
    description: "用于验证触控拖动与错误顺序反馈。",
    revealCondition: always
  },
  {
    id: "time-3",
    chapterId: "prototype",
    title: "走廊脚步经过",
    occurredAt: "21:19",
    characterIds: ["person-c"],
    locationId: "东侧走廊",
    description: "卡片顺序可以通过拖柄或上下按钮调整。",
    revealCondition: always
  },
  {
    id: "time-4",
    chapterId: "prototype",
    title: "值班电话接通",
    occurredAt: "21:27",
    characterIds: ["person-d"],
    locationId: "值班室",
    description: "全部按时间排列后将通过原型验证。",
    revealCondition: always
  }
];

export const prototypeTimelinePuzzle: TimelinePuzzleDefinition = {
  id: "prototype-timeline",
  chapterId: "prototype",
  title: "测试档案：四个时间节点",
  eventIds: ["time-2", "time-4", "time-1", "time-3"],
  entryCondition: always,
  solutions: [
    {
      id: "prototype-solution",
      orderedEventIds: ["time-1", "time-2", "time-3", "time-4"],
      onSolvedEvents: []
    }
  ],
  incorrectFeedback: "顺序仍有矛盾：至少一个时间节点前后倒置。"
};

export const prototypeDetectiveBoard: DetectiveBoardDefinition = {
  id: "prototype-board",
  chapterId: "prototype",
  title: "测试档案：调查关系草图",
  cards: [
    {
      id: "card-person",
      type: "character",
      referenceId: "person-a",
      title: "人物甲",
      revealCondition: always
    },
    {
      id: "card-evidence",
      type: "evidence",
      referenceId: "evidence-a",
      title: "证据样本",
      revealCondition: always
    },
    {
      id: "card-time",
      type: "timeline",
      referenceId: "time-2",
      title: "21:14 时间卡",
      revealCondition: always
    },
    {
      id: "card-proposition",
      type: "proposition",
      referenceId: "proposition-a",
      title: "证词与时间冲突",
      revealCondition: always
    }
  ],
  initialConnections: [],
  propositions: [
    {
      id: "prototype-proposition",
      title: "时间是否反驳证词？",
      prompt: "用“矛盾”连接证据样本与 21:14 时间卡。",
      entryCondition: always,
      solutions: [
        {
          id: "prototype-board-solution",
          requiredConnections: [
            {
              fromCardId: "card-evidence",
              toCardId: "card-time",
              relationType: "contradicts"
            }
          ],
          onSolvedEvents: []
        }
      ],
      incorrectFeedback: "当前连线还不足以支持这项命题。"
    }
  ]
};
