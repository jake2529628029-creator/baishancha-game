import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import content from "../../public/story/runtime/content/chapter-02.json";

interface PngInfo {
  width: number;
  height: number;
  hash: string;
}

const expectedAssets = {
  "/story/runtime/assets/chapter-02/qihu-photo-front.png": {
    size: [1800, 1200],
    aspectRatio: "3:2"
  },
  "/story/runtime/assets/chapter-02/qihu-photo-back.png": {
    size: [1800, 1200],
    aspectRatio: "3:2"
  },
  "/story/runtime/assets/chapter-02/inventory-1829.png": {
    size: [1920, 1080],
    aspectRatio: "16:9"
  },
  "/story/runtime/assets/chapter-02/inventory-1838.png": {
    size: [1920, 1080],
    aspectRatio: "16:9"
  }
} as const;

function publicFile(assetPath: string): string {
  return join(process.cwd(), "public", assetPath.replace(/^\//, ""));
}

function decodePng(filePath: string): PngInfo {
  const bytes = readFileSync(filePath);
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
  ]);

  expect(bytes.subarray(0, 8)).toEqual(signature);

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = -1;
  let sawEnd = false;
  const idatChunks: Buffer[] = [];

  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    expect(dataEnd + 4).toBeLessThanOrEqual(bytes.length);

    if (type === "IHDR") {
      width = bytes.readUInt32BE(dataStart);
      height = bytes.readUInt32BE(dataStart + 4);
      bitDepth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
      interlace = bytes[dataStart + 12];
    } else if (type === "IDAT") {
      idatChunks.push(bytes.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      sawEnd = true;
      break;
    }

    offset = dataEnd + 4;
  }

  expect(sawEnd).toBe(true);
  expect(idatChunks.length).toBeGreaterThan(0);
  expect(bitDepth).toBe(8);
  expect(colorType).toBe(2);
  expect(interlace).toBe(0);

  const decoded = inflateSync(Buffer.concat(idatChunks));
  expect(decoded.length).toBe(height * (1 + width * 3));
  const samples: number[] = [];
  for (let index = 0; index < decoded.length; index += 997) {
    samples.push(decoded[index]);
  }
  expect(new Set(samples).size).toBeGreaterThan(32);

  return {
    width,
    height,
    hash: createHash("sha256").update(bytes).digest("hex")
  };
}

describe("chapter two image assets", () => {
  it("maps all declared image paths to decodable RGB PNG files", () => {
    const images = content.filter((item) => item.type === "image");

    expect(images).toHaveLength(4);
    expect(images.map((item) => item.image?.asset).sort()).toEqual(
      Object.keys(expectedAssets).sort()
    );

    const hashes = new Set<string>();

    for (const item of images) {
      const asset = item.image?.asset;
      expect(asset).toBeDefined();
      const expected = expectedAssets[asset as keyof typeof expectedAssets];
      expect(expected).toBeDefined();
      expect(item.image?.display.aspectRatio).toBe(expected.aspectRatio);

      const filePath = publicFile(asset ?? "");
      expect(statSync(filePath).size).toBeGreaterThan(100_000);

      const info = decodePng(filePath);
      expect([info.width, info.height]).toEqual(expected.size);
      hashes.add(info.hash);
    }

    expect(hashes.size).toBe(4);
  });

  it("keeps the two inventory photographs distinct", () => {
    const earlier = decodePng(
      publicFile("/story/runtime/assets/chapter-02/inventory-1829.png")
    );
    const later = decodePng(
      publicFile("/story/runtime/assets/chapter-02/inventory-1838.png")
    );

    expect(earlier.hash).not.toBe(later.hash);
  });
});
