import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ImageGalleryDialog } from "@/components/documents/image-gallery-dialog";
import type { DocumentImage } from "@/types/document-image";

const image = (imageId: string, description: string, groupDocNo: string | null = null, groupTitle: string | null = null) =>
  ({ imageId, description, groupId: imageId, groupDocNo, groupTitle, imageUrl: null, uploadedBy: "anna" }) as unknown as DocumentImage;

describe("ImageGalleryDialog search", () => {
  it("filters sets by document number or file name, case-insensitively", () => {
    render(
      <ImageGalleryDialog
        shopName="ร้าน A"
        images={[
          image("1", "20261006_8e1907.jpg"),
          image("2", "scan.jpg", "AQ-6910-0001"),
          image("3", "id-card.jpg"),
          image("4", "page-1.jpg", "AQ-6910-0002", "ชุด 0002"),
        ]}
        onClose={() => {}}
      />
    );
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ค้นหาในรูปเอกสาร" }));
    const input = screen.getByRole("searchbox", { name: "ค้นหาเลขที่เอกสารหรือชื่อรูป" });

    fireEvent.change(input, { target: { value: "aq-6910" } });
    expect(screen.getByText("AQ-6910-0001")).toBeInTheDocument();
    expect(screen.queryByText("id-card.jpg")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "8E1907" } });
    expect(screen.getByText("20261006_8e1907.jpg")).toBeInTheDocument();
    expect(screen.queryByText("AQ-6910-0001")).not.toBeInTheDocument();

    // A grouped set is found by its set name as well as its document number.
    fireEvent.change(input, { target: { value: "ชุด 0002" } });
    expect(screen.getByText("ชุด 0002")).toBeInTheDocument();
    expect(screen.queryByText("AQ-6910-0001")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "zzz" } });
    expect(screen.getByText(/ไม่พบเอกสารที่ตรงกับ/)).toBeInTheDocument();

    // Closing the search clears it, so no hidden filter is left behind.
    fireEvent.click(screen.getByRole("button", { name: "ปิดการค้นหา" }));
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.getByText("id-card.jpg")).toBeInTheDocument();
  });
});
