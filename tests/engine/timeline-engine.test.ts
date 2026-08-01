import { describe, expect, it } from "vitest";
import {
  getVisibleTimelineEvents,
  submitTimelineOrder
} from "../../src/engine/timeline-engine/timeline-engine";
import { createEmptyProgress } from "../../src/types/progress";
import { createFrameworkStory } from "../fixtures/framework-story";

describe("timeline engine", () => {
  it("shows revealed events with people and locations", () => {
    const story = createFrameworkStory();
    const events = getVisibleTimelineEvents(story, createEmptyProgress());

    expect(events.map((event) => event.id)).toEqual([
      "timeline-a",
      "timeline-b"
    ]);
    expect(events[0].characterIds).toEqual(["character-a"]);
    expect(events[0].locationId).toBe("location-room");
  });

  it("records wrong orders and completes exact orders", () => {
    const story = createFrameworkStory();
    const wrong = submitTimelineOrder(
      story,
      createEmptyProgress(),
      "timeline-puzzle",
      ["timeline-b", "timeline-a"]
    );

    expect(wrong.matched).toBe(false);
    expect(wrong.state.timelineAttempts).toHaveLength(1);
    expect(wrong.state.completedTimelinePuzzleIds).toEqual([]);

    const correct = submitTimelineOrder(
      story,
      wrong.state,
      "timeline-puzzle",
      ["timeline-a", "timeline-b"]
    );

    expect(correct.matched).toBe(true);
    expect(correct.state.completedTimelinePuzzleIds).toEqual([
      "timeline-puzzle"
    ]);
    expect(
      correct.state.relationshipStates["relationship-a-b"].understanding
    ).toBe("confirmed");
  });
});
