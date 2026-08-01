import { evaluateCondition } from "../condition-evaluator/condition-evaluator";
import { runEvents } from "../event-runner/event-runner";
import type { GameProgressState } from "../../types/progress";
import type {
  TimelineAttempt,
  TimelineEventDefinition
} from "../../types/timeline";
import type { LoadedStory } from "../../types/story";

export class TimelineEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimelineEngineError";
  }
}

function hasSameMembers(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  if (new Set(left).size !== left.length) {
    return false;
  }

  const expected = new Set(right);
  return left.every((item) => expected.has(item));
}

export function getVisibleTimelineEvents(
  story: LoadedStory,
  state: GameProgressState
): TimelineEventDefinition[] {
  return Object.values(story.timelineEvents)
    .filter((event) => evaluateCondition(event.revealCondition, state));
}

export function submitTimelineOrder(
  story: LoadedStory,
  state: GameProgressState,
  puzzleId: string,
  orderedEventIds: string[]
): TimelineAttempt & { state: GameProgressState; feedback: string } {
  const puzzle = story.timelinePuzzles[puzzleId];

  if (!puzzle) {
    throw new TimelineEngineError(`时间线谜题不存在：${puzzleId}`);
  }

  if (!evaluateCondition(puzzle.entryCondition, state)) {
    throw new TimelineEngineError(`时间线谜题尚未解锁：${puzzleId}`);
  }

  if (!hasSameMembers(orderedEventIds, puzzle.eventIds)) {
    throw new TimelineEngineError(
      `时间线提交必须且只能包含谜题事件：${puzzleId}`
    );
  }

  const solution = puzzle.solutions.find(
    (candidate) =>
      candidate.orderedEventIds.length === orderedEventIds.length &&
      candidate.orderedEventIds.every(
        (eventId, index) => eventId === orderedEventIds[index]
      )
  );
  const attempt: TimelineAttempt = {
    puzzleId,
    orderedEventIds: [...orderedEventIds],
    matched: Boolean(solution),
    solutionId: solution?.id ?? null
  };
  const events = [
    {
      type: "recordTimelineOrder" as const,
      ...attempt
    },
    ...(solution
      ? [
          {
            type: "completeTimelinePuzzle" as const,
            puzzleId
          },
          ...solution.onSolvedEvents
        ]
      : [])
  ];

  return {
    ...attempt,
    state: runEvents(state, events),
    feedback: solution ? "时间顺序成立。" : puzzle.incorrectFeedback
  };
}
