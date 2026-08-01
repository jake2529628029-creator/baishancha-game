import chapterOne from "../../public/story/runtime/chapters/chapter-01.json";
import chapterTwo from "../../public/story/runtime/chapters/chapter-02.json";
import chapterManifest from "../../public/story/runtime/chapter-manifest.json";
import contentOne from "../../public/story/runtime/content/chapter-01.json";
import contentTwo from "../../public/story/runtime/content/chapter-02.json";
import detectiveBoardsOne from "../../public/story/runtime/framework/detective-boards.json";
import detectiveBoardsTwo from "../../public/story/runtime/framework/detective-boards-chapter-02.json";
import relationshipsOne from "../../public/story/runtime/framework/relationships.json";
import relationshipsTwo from "../../public/story/runtime/framework/relationships-chapter-02.json";
import timelines from "../../public/story/runtime/framework/timelines.json";
import dialoguesOne from "../../public/story/runtime/dialogues/shen-yishu-chapter-01.json";
import dialoguesTwo from "../../public/story/runtime/dialogues/chapter-02.json";
import evidenceOne from "../../public/story/runtime/evidence/chapter-01.json";
import evidenceTwo from "../../public/story/runtime/evidence/chapter-02.json";
import manifest from "../../public/story/runtime/manifest.json";
import observationsOne from "../../public/story/runtime/observations/chapter-01.json";
import observationsTwo from "../../public/story/runtime/observations/chapter-02.json";
import reasoningOne from "../../public/story/runtime/reasoning/chapter-01.json";

export const runtimePayloadBySuffix: Record<string, unknown> = {
  "manifest.json": manifest,
  "chapter-manifest.json": chapterManifest,
  "chapters/chapter-01.json": chapterOne,
  "chapters/chapter-02.json": chapterTwo,
  "content/chapter-01.json": contentOne,
  "content/chapter-02.json": contentTwo,
  "observations/chapter-01.json": observationsOne,
  "observations/chapter-02.json": observationsTwo,
  "evidence/chapter-01.json": evidenceOne,
  "evidence/chapter-02.json": evidenceTwo,
  "dialogues/shen-yishu-chapter-01.json": dialoguesOne,
  "dialogues/chapter-02.json": dialoguesTwo,
  "reasoning/chapter-01.json": reasoningOne,
  "framework/relationships.json": relationshipsOne,
  "framework/relationships-chapter-02.json": relationshipsTwo,
  "framework/timelines.json": timelines,
  "framework/detective-boards.json": detectiveBoardsOne,
  "framework/detective-boards-chapter-02.json": detectiveBoardsTwo
};

export function runtimePayloadForUrl(
  input: string | URL | Request
): unknown {
  const url = String(input);
  const suffix = Object.keys(runtimePayloadBySuffix)
    .sort((left, right) => right.length - left.length)
    .find((key) => url.endsWith(key));

  return suffix ? runtimePayloadBySuffix[suffix] : undefined;
}
