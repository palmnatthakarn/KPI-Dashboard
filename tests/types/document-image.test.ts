import { describe, expect, it } from "vitest";
import { countOcrAnalyzedGroups, ocrProcessedAt, parseDocumentImage } from "@/types/document-image";

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

describe("ocrProcessedAt", () => {
  it("reads metadata.processed_at from the JSON string the API sends", () => {
    const raw = JSON.stringify({ metadata: { processed_at: "2026-09-16T09:53:28Z" }, status: "success" });
    expect(ocrProcessedAt(raw)).toBe("2026-09-16T09:53:28Z");
    expect(parseDocumentImage({ ocranalyzeai: raw }).ocrAnalyzedAt).toBe("2026-09-16T09:53:28Z");
  });

  it("returns null for missing or unreadable results", () => {
    expect(ocrProcessedAt(null)).toBeNull();
    expect(ocrProcessedAt("not json")).toBeNull();
    expect(ocrProcessedAt({ metadata: {} })).toBeNull();
  });
});
