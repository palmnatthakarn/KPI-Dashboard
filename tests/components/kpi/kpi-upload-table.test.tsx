import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { KpiUploadTable } from "@/components/kpi/kpi-upload-table";
import type { UploaderUploads } from "@/lib/kpi/kpi-doc-search";
import type { DocumentImage } from "@/types/document-image";

vi.mock("@/lib/employee/employee-mapping-service", () => ({
  getDisplayName: (name: string) => name,
  useEmployeeMappings: () => undefined,
}));

const image = (imageId: string, groupId: string) =>
  ({ imageId, groupId, uploadedBy: "anna", uploadedAt: "2026-10-05T02:00:00Z" }) as DocumentImage;

const uploaders: UploaderUploads[] = [
  {
    uploader: "anna",
    imageCount: 3,
    shops: [
      { shopName: "ร้าน A", images: [image("1", "g1"), image("2", "g1")] },
      { shopName: "ร้าน B", images: [image("3", "g2")] },
    ],
  },
];

describe("KpiUploadTable", () => {
  it("lists uploaders and reveals their shops on click", () => {
    render(<KpiUploadTable uploaders={uploaders} fontScale={1} />);

    expect(screen.getByText("ทั้งหมด 1 คน")).toBeInTheDocument();
    expect(screen.queryByText("ร้าน A")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByText("anna")[0]);
    expect(screen.getAllByText("ร้าน A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ร้าน B").length).toBeGreaterThan(0);
  });
});
