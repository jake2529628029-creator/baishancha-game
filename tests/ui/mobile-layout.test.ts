import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  new URL("../../src/styles/global.css", import.meta.url),
  "utf8"
);

describe("mobile investigation layout contract", () => {
  it("keeps touch targets and portrait tool layouts mobile-safe", () => {
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toMatch(/button,\s*select,\s*input\s*\{[\s\S]*?min-height:\s*44px/);
    expect(css).toMatch(/\.workspace-mode-nav\s*\{[\s\S]*?overflow-x:\s*auto/);
    expect(css).toMatch(/\.detective-canvas\s*\{[\s\S]*?touch-action:\s*none/);
    expect(css).toMatch(/\.timeline-drag-handle[\s\S]*?touch-action:\s*none/);
    expect(css).toMatch(/\.image-viewport\s*\{[\s\S]*?touch-action:\s*none/);
    expect(css).toMatch(
      /@media \(max-width: 980px\)[\s\S]*?\.relationship-layout,[\s\S]*?grid-template-columns:\s*1fr/
    );
  });
});
