import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function projectFile(path: string): URL {
  return new URL(`../../${path}`, import.meta.url);
}

function readPngSize(path: string): { width: number; height: number } {
  const data = readFileSync(projectFile(path));

  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20)
  };
}

describe("PWA assets", () => {
  it("defines an installable standalone manifest", () => {
    const manifest = JSON.parse(
      readFileSync(projectFile("public/manifest.webmanifest"), "utf8")
    ) as {
      name: string;
      display: string;
      start_url: string;
      icons: Array<Record<string, string>>;
    };

    expect(manifest.name).toBe("白山茶遗嘱");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" })
      ])
    );
  });

  it("ships icons at their declared dimensions", () => {
    expect(readPngSize("public/icons/app-icon-192.png")).toEqual({
      width: 192,
      height: 192
    });
    expect(readPngSize("public/icons/app-icon-512.png")).toEqual({
      width: 512,
      height: 512
    });
  });

  it("precaches the game shell and all available chapter runtime", () => {
    const serviceWorker = readFileSync(
      projectFile("public/sw.js"),
      "utf8"
    );

    expect(serviceWorker).toContain("/index.html");
    expect(serviceWorker).toContain(
      'CACHE_VERSION = "white-camellia-v0.4.2-pwa-3"'
    );
    expect(serviceWorker).toContain("/story/runtime/manifest.json");
    expect(serviceWorker).toContain("/story/runtime/chapter-manifest.json");
    expect(serviceWorker).toContain("/story/runtime/chapters/chapter-01.json");
    expect(serviceWorker).toContain("/story/runtime/chapters/chapter-02.json");
    expect(serviceWorker).toContain("/story/runtime/content/chapter-02.json");
    expect(serviceWorker).toContain(
      "/story/runtime/observations/chapter-02.json"
    );
    expect(serviceWorker).toContain("/story/runtime/evidence/chapter-02.json");
    expect(serviceWorker).toContain("/story/runtime/dialogues/chapter-02.json");
    expect(serviceWorker).toContain(
      "/story/runtime/framework/relationships.json"
    );
    expect(serviceWorker).toContain(
      "/story/runtime/framework/relationships-chapter-02.json"
    );
    expect(serviceWorker).toContain(
      "/story/runtime/framework/timelines.json"
    );
    expect(serviceWorker).toContain(
      "/story/runtime/framework/detective-boards.json"
    );
    expect(serviceWorker).toContain(
      "/story/runtime/framework/detective-boards-chapter-02.json"
    );
    expect(serviceWorker).toContain(
      "/story/runtime/assets/chapter-02/qihu-photo-front.png"
    );
    expect(serviceWorker).toContain(
      "/story/runtime/assets/chapter-02/qihu-photo-back.png"
    );
    expect(serviceWorker).toContain(
      "/story/runtime/assets/chapter-02/inventory-1829.png"
    );
    expect(serviceWorker).toContain(
      "/story/runtime/assets/chapter-02/inventory-1838.png"
    );
    expect(serviceWorker).toContain("matchAll");
    expect(serviceWorker).toContain("/assets/");
  });
});
