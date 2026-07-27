import { afterEach, describe, expect, it, vi } from "vitest";
import chapter from "../../public/story/runtime/chapters/chapter-01.json";
import content from "../../public/story/runtime/content/chapter-01.json";
import dialogues from "../../public/story/runtime/dialogues/shen-yishu-chapter-01.json";
import evidence from "../../public/story/runtime/evidence/chapter-01.json";
import manifest from "../../public/story/runtime/manifest.json";
import observations from "../../public/story/runtime/observations/chapter-01.json";
import reasoning from "../../public/story/runtime/reasoning/chapter-01.json";
import { loadStory } from "../../src/engine/story-loader/story-loader";

describe("story loader", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the manifest and its referenced chapters", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const payloadBySuffix: Record<string, unknown> = {
        "manifest.json": manifest,
        "chapters/chapter-01.json": chapter,
        "content/chapter-01.json": content,
        "observations/chapter-01.json": observations,
        "evidence/chapter-01.json": evidence,
        "dialogues/shen-yishu-chapter-01.json": dialogues,
        "reasoning/chapter-01.json": reasoning
      };
      const suffix = Object.keys(payloadBySuffix).find((key) =>
        url.endsWith(key)
      );
      const payload = suffix ? payloadBySuffix[suffix] : undefined;

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
    expect(story.chapters["chapter-01"].title).toBe("茶杯上的指纹");
    expect(Object.keys(story.content)).toHaveLength(7);
    expect(Object.keys(story.evidence)).toHaveLength(6);
    expect(Object.keys(story.dialogues)).toHaveLength(4);
    expect(Object.keys(story.reasoning)).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(7);
  });
});
