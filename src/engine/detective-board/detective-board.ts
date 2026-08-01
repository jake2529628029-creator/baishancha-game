import { evaluateCondition } from "../condition-evaluator/condition-evaluator";
import { runEvents } from "../event-runner/event-runner";
import type {
  DetectiveBoardAttempt,
  DetectiveBoardConnection,
  DetectiveBoardState
} from "../../types/detective-board";
import type { GameProgressState } from "../../types/progress";
import type { LoadedStory } from "../../types/story";

export class DetectiveBoardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DetectiveBoardError";
  }
}

function createBoardState(
  story: LoadedStory,
  boardId: string,
  current?: DetectiveBoardState
): DetectiveBoardState {
  if (current) {
    return current;
  }

  const board = story.detectiveBoards[boardId];

  if (!board) {
    throw new DetectiveBoardError(`侦探墙不存在：${boardId}`);
  }

  return {
    placements: [],
    connections: [...board.initialConnections],
    solvedPropositionIds: []
  };
}

function patchBoard(
  state: GameProgressState,
  boardId: string,
  board: DetectiveBoardState
): GameProgressState {
  return {
    ...state,
    detectiveBoardStates: {
      ...state.detectiveBoardStates,
      [boardId]: board
    }
  };
}

export function initializeDetectiveBoards(
  story: LoadedStory,
  state: GameProgressState
): GameProgressState {
  let next = state;

  for (const boardId of Object.keys(story.detectiveBoards)) {
    if (next.detectiveBoardStates[boardId]) {
      continue;
    }

    next = patchBoard(next, boardId, createBoardState(story, boardId));
  }

  return next;
}

export function placeDetectiveCard(
  story: LoadedStory,
  state: GameProgressState,
  boardId: string,
  cardId: string,
  x: number,
  y: number
): GameProgressState {
  const definition = story.detectiveBoards[boardId];
  const card = definition?.cards.find((candidate) => candidate.id === cardId);

  if (!definition || !card) {
    throw new DetectiveBoardError(`侦探墙卡片不存在：${boardId}/${cardId}`);
  }

  if (!evaluateCondition(card.revealCondition, state)) {
    throw new DetectiveBoardError(`侦探墙卡片尚未解锁：${cardId}`);
  }

  const board = createBoardState(
    story,
    boardId,
    state.detectiveBoardStates[boardId]
  );
  const placements = board.placements.filter(
    (placement) => placement.cardId !== cardId
  );

  return patchBoard(state, boardId, {
    ...board,
    placements: [...placements, { cardId, x, y }]
  });
}

export function connectDetectiveCards(
  story: LoadedStory,
  state: GameProgressState,
  boardId: string,
  connection: DetectiveBoardConnection
): GameProgressState {
  const definition = story.detectiveBoards[boardId];

  if (!definition) {
    throw new DetectiveBoardError(`侦探墙不存在：${boardId}`);
  }

  const cardIds = new Set(definition.cards.map((card) => card.id));
  const fromCard = definition.cards.find(
    (card) => card.id === connection.fromCardId
  );
  const toCard = definition.cards.find(
    (card) => card.id === connection.toCardId
  );

  if (
    !cardIds.has(connection.fromCardId) ||
    !cardIds.has(connection.toCardId)
  ) {
    throw new DetectiveBoardError("侦探墙连接引用了不存在的卡片");
  }

  if (
    !fromCard ||
    !toCard ||
    !evaluateCondition(fromCard.revealCondition, state) ||
    !evaluateCondition(toCard.revealCondition, state)
  ) {
    throw new DetectiveBoardError("侦探墙连接包含尚未解锁的卡片");
  }

  const board = createBoardState(
    story,
    boardId,
    state.detectiveBoardStates[boardId]
  );
  const connections = board.connections.filter(
    (candidate) => candidate.id !== connection.id
  );

  return patchBoard(state, boardId, {
    ...board,
    connections: [...connections, connection]
  });
}

export function disconnectDetectiveCards(
  story: LoadedStory,
  state: GameProgressState,
  boardId: string,
  connectionId: string
): GameProgressState {
  const board = createBoardState(
    story,
    boardId,
    state.detectiveBoardStates[boardId]
  );
  const connections = board.connections.filter(
    (connection) => connection.id !== connectionId
  );

  return connections.length === board.connections.length
    ? state
    : patchBoard(state, boardId, {
        ...board,
        connections
      });
}

function connectionMatches(
  connection: DetectiveBoardConnection,
  requirement: {
    fromCardId: string;
    toCardId: string;
    relationType: string;
  }
): boolean {
  return (
    connection.fromCardId === requirement.fromCardId &&
    connection.toCardId === requirement.toCardId &&
    connection.relationType === requirement.relationType
  );
}

export function submitDetectiveProposition(
  story: LoadedStory,
  state: GameProgressState,
  boardId: string,
  propositionId: string
): DetectiveBoardAttempt & {
  state: GameProgressState;
  feedback: string;
} {
  const definition = story.detectiveBoards[boardId];
  const proposition = definition?.propositions.find(
    (candidate) => candidate.id === propositionId
  );

  if (!definition || !proposition) {
    throw new DetectiveBoardError(
      `侦探墙命题不存在：${boardId}/${propositionId}`
    );
  }

  if (!evaluateCondition(proposition.entryCondition, state)) {
    throw new DetectiveBoardError(`侦探墙命题尚未解锁：${propositionId}`);
  }

  const board = createBoardState(
    story,
    boardId,
    state.detectiveBoardStates[boardId]
  );
  const solution = proposition.solutions.find((candidate) =>
    candidate.requiredConnections.every((requirement) =>
      board.connections.some((connection) =>
        connectionMatches(connection, requirement)
      )
    )
  );
  const attempt: DetectiveBoardAttempt = {
    boardId,
    propositionId,
    matched: Boolean(solution),
    solutionId: solution?.id ?? null
  };

  if (!solution) {
    return {
      ...attempt,
      state,
      feedback: proposition.incorrectFeedback
    };
  }

  return {
    ...attempt,
    state: runEvents(state, [
      {
        type: "completeDetectiveProposition",
        boardId,
        propositionId
      },
      ...solution.onSolvedEvents
    ]),
    feedback: "命题成立。"
  };
}
