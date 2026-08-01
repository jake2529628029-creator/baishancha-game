import { afterEach, describe, expect, it, vi } from "vitest";
import { loadStory } from "../../src/engine/story-loader/story-loader";
import {
  runtimePayloadBySuffix,
  runtimePayloadForUrl
} from "../fixtures/runtime-payloads";

describe("story loader", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the manifest and its referenced chapters", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const payload = runtimePayloadForUrl(input);

      return new Response(JSON.stringify(payload), {
        status: payload ? 200 : 404,
        headers: {
          "Content-Type": "application/json"
        }
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    const story = await loadStory("/story/runtime/");

    expect(story.manifest.startChapterId).toBe("chapter-01");
    expect(story.chapterManifest.chapters).toHaveLength(6);
    expect(story.chapters["chapter-01"].title).toBe("茶杯上的指纹");
    expect(story.chapters["chapter-02"].title).toBe("不存在的女儿");
    expect(Object.keys(story.content)).toHaveLength(21);
    expect(Object.keys(story.observations)).toHaveLength(35);
    expect(Object.keys(story.evidence)).toHaveLength(12);
    expect(Object.keys(story.dialogues)).toHaveLength(6);
    expect(Object.keys(story.reasoning)).toHaveLength(3);
    expect(Object.keys(story.characters)).toHaveLength(5);
    expect(Object.keys(story.relationships)).toHaveLength(8);
    expect(Object.keys(story.detectiveBoards)).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(
      Object.keys(runtimePayloadBySuffix).length
    );
  });
});
