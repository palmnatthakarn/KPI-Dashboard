import { describe, expect, it } from "vitest";
import { countOcrAnalyzedGroups, parseDocumentImage } from "@/types/document-image";

describe("ocranalyzeai", () => {
  it("marks an image analyzed only when ocranalyzeai has content", () => {
    expect(parseDocumentImage({ ocranalyzeai: { total: 100 } }).ocrAnalyzed).toBe(true);
    expect(parseDocumentImage({ ocranalyzeai: "result" }).ocrAnalyzed).toBe(true);
    expect(parseDocumentImage({ ocranalyzeai: null }).ocrAnalyzed).toBe(false);
    expect(parseDocumentImage({ ocranalyzeai: {} }).ocrAnalyzed).toBe(false);
    expect(parseDocumentImage({ ocranalyzeai: "  " }).ocrAnalyzed).toBe(false);
    expect(parseDocumentImage({}).ocrAnalyzed).toBe(false);
  });

  it("counts each analyzed image set once", () => {
    const img = (id: string, groupId: string | null, analyzed: boolean) => ({
      ...parseDocumentImage({ documentimageguid: id }),
      ocrAnalyzed: analyzed,
      groupId,
    });
    expect(
      countOcrAnalyzedGroups([img("a", "g1", true), img("b", "g1", true), img("c", "g2", false), img("d", null, true)])
    ).toBe(2);
  });
});
