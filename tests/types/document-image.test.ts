import { describe, expect, it } from "vitest";
import { countOcrAnalyzedGroups, countOcrAnalyzedGroupsUploadedBy, parseDocumentImage } from "@/types/document-image";

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

describe("countOcrAnalyzedGroupsUploadedBy", () => {
  it("credits an analyzed set only to the person who uploaded its images", () => {
    const img = (groupId: string, uploadedby: string, analyzed: boolean) => ({
      ...parseDocumentImage({ documentimageguid: `${groupId}-${uploadedby}`, uploadedby }),
      ocrAnalyzed: analyzed,
      groupId,
    });
    // One shop's images as the KPI row sees them: the uploader's own sets plus
    // sets a keyer merely referenced from a journal.
    const images = [img("g1", "natthakan", true), img("g2", "Natthakan ", true), img("g3", "natthakan", false)];

    expect(countOcrAnalyzedGroupsUploadedBy(images, "natthakan")).toBe(2);
    expect(countOcrAnalyzedGroupsUploadedBy(images, "kaem")).toBe(0);
  });
});
