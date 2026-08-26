// @vitest-environment node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  deleteStoredMediaObject,
  deletePrivateMediaObject,
  readPrivateMediaObject,
  storeMediaObject,
  storePrivateMediaObject,
} from "@/lib/media-storage";

const previousProvider = process.env.MEDIA_STORAGE_PROVIDER;

afterEach(() => {
  if (previousProvider === undefined) {
    delete process.env.MEDIA_STORAGE_PROVIDER;
  } else {
    process.env.MEDIA_STORAGE_PROVIDER = previousProvider;
  }
});

describe("private local media deletion", () => {
  it("deletes PII-bearing objects before metadata and stays retry-safe", async () => {
    process.env.MEDIA_STORAGE_PROVIDER = "local";
    const stored = await storePrivateMediaObject({
      bytes: Buffer.from("private-plan-reference"),
      contentType: "text/plain",
      filename: "delete-retry-test.txt",
    });

    expect(stored.storageKey).not.toContain("delete-retry-test");
    expect(stored.storageKey).toMatch(/^local:[a-f0-9-]+\.bin$/i);

    await expect(readPrivateMediaObject(stored.storageKey)).resolves.toEqual(
      Buffer.from("private-plan-reference"),
    );
    await expect(deletePrivateMediaObject(stored.storageKey)).resolves.toBeUndefined();
    await expect(readPrivateMediaObject(stored.storageKey)).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(deletePrivateMediaObject(stored.storageKey)).resolves.toBeUndefined();
  });

  it("deletes public local objects and remains safe to retry", async () => {
    process.env.MEDIA_STORAGE_PROVIDER = "local";
    const stored = await storeMediaObject({
      bytes: Buffer.from("public-image-reference"),
      contentType: "image/webp",
      filename: "public-delete-retry-test.webp",
    });
    const diskPath = path.join(process.cwd(), "public", stored.url);

    await expect(readFile(diskPath)).resolves.toEqual(
      Buffer.from("public-image-reference"),
    );
    await expect(deleteStoredMediaObject(stored.url)).resolves.toBeUndefined();
    await expect(readFile(diskPath)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(deleteStoredMediaObject(stored.url)).resolves.toBeUndefined();
  });

  it("fails closed for unsupported or provider-mismatched private keys", async () => {
    process.env.MEDIA_STORAGE_PROVIDER = "local";

    await expect(
      deletePrivateMediaObject("invalid:lead-attachments/plan.pdf"),
    ).rejects.toThrow(/unsupported format/i);
    await expect(
      deletePrivateMediaObject("s3:lead-attachments/plan.pdf"),
    ).rejects.toThrow(/active provider/i);
  });
});
