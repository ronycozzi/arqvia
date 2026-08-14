import { describe, expect, it } from "vitest";
import {
  formatAttachmentBytes,
  leadAttachmentMaxBytes,
} from "@/lib/lead-attachment-config";
import {
  isPassivePdfDocument,
  storeLeadAttachmentFiles,
  validateLeadAttachmentFiles,
} from "@/lib/lead-attachments";

function createFile(
  name: string,
  type: string,
  size = 32,
  prefix = "content",
) {
  return new File([prefix, new Uint8Array(Math.max(0, size - prefix.length))], name, {
    type,
  });
}

describe("lead attachment validation", () => {
  it("accepts up to three supported files within the total limit", () => {
    const files = [
      createFile("plano.pdf", "application/pdf"),
      createFile("frente.jpg", "image/jpeg"),
      createFile("interior.png", "image/png"),
    ];

    expect(validateLeadAttachmentFiles(files)).toBeNull();
  });

  it("rejects more than three attachments", () => {
    const files = Array.from({ length: 4 }, (_, index) =>
      createFile(`archivo-${index}.pdf`, "application/pdf"),
    );

    expect(validateLeadAttachmentFiles(files)).toMatchObject({
      status: 400,
      message: expect.stringContaining("hasta 3"),
    });
  });

  it("rejects oversized and unsupported files", () => {
    expect(
      validateLeadAttachmentFiles([
        createFile("video.mp4", "video/mp4", leadAttachmentMaxBytes + 1),
      ]),
    ).toMatchObject({ status: 413 });

    expect(
      validateLeadAttachmentFiles([
        createFile("datos.txt", "text/plain"),
      ]),
    ).toMatchObject({ status: 400 });
  });

  it("checks a PDF signature before attempting storage", async () => {
    const result = await storeLeadAttachmentFiles([
      createFile("plano.pdf", "application/pdf", 32, "not-a-pdf"),
    ]);

    expect(result).toEqual({
      ok: false,
      message: "El PDF no coincide con el formato declarado.",
      status: 400,
    });
  });

  it("rejects a shallow PDF header without a complete document structure", async () => {
    const result = await storeLeadAttachmentFiles([
      createFile(
        "plano.pdf",
        "application/pdf",
        96,
        "%PDF-1.7\ncontenido invalido",
      ),
    ]);

    expect(result).toEqual({
      ok: false,
      message: "El PDF está dañado o contiene funciones interactivas no permitidas.",
      status: 400,
    });
  });

  it("accepts a structurally complete passive PDF and rejects active actions", () => {
    const passive = minimalPdf();
    const active = minimalPdf("/OpenAction 1 0 R /JavaScript true");

    expect(isPassivePdfDocument(passive)).toBe(true);
    expect(isPassivePdfDocument(active)).toBe(false);
  });

  it("formats sizes for the public form and admin panel", () => {
    expect(formatAttachmentBytes(800)).toBe("800 B");
    expect(formatAttachmentBytes(2048)).toBe("2 KB");
    expect(formatAttachmentBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });
});

function minimalPdf(extraCatalog = "") {
  const prefix = `%PDF-1.7\n1 0 obj\n<< /Type /Catalog ${extraCatalog} >>\nendobj\n`;
  const xrefOffset = Buffer.byteLength(prefix, "latin1");
  return Buffer.from(
    `${prefix}xref\n0 2\n0000000000 65535 f \n0000000009 00000 n \ntrailer\n<< /Size 2 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
    "latin1",
  );
}
