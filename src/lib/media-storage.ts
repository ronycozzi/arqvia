import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const localUploadDir = path.join(process.cwd(), "public", "uploads", "media");
const localPublicPrefix = "/uploads/media/";
const privateUploadDir = path.join(process.cwd(), "storage", "lead-attachments");
const localPrivatePrefix = "local:";
const s3PrivatePrefix = "s3:";

type StorageInput = {
  bytes: Buffer;
  contentType: string;
  filename: string;
};

type S3Config = {
  bucket: string;
  client: S3Client;
  publicBaseUrl: string;
};

export type MediaStorageStatus = {
  configured: boolean;
  persistent: boolean;
  provider: "local" | "s3";
};

let cachedS3Config: S3Config | null = null;

function cleanBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function getStorageProvider(): MediaStorageStatus["provider"] {
  return process.env.MEDIA_STORAGE_PROVIDER === "s3" ? "s3" : "local";
}

export function getMediaStorageStatus(
  env: Record<string, string | undefined> = process.env,
): MediaStorageStatus {
  const provider = env.MEDIA_STORAGE_PROVIDER === "s3" ? "s3" : "local";
  const configured =
    provider === "local" ||
    Boolean(
      env.S3_BUCKET &&
        env.S3_REGION &&
        env.S3_PUBLIC_BASE_URL &&
        env.S3_ACCESS_KEY_ID &&
        env.S3_SECRET_ACCESS_KEY,
    );

  return { configured, persistent: provider === "s3" && configured, provider };
}

function createS3Config(): S3Config {
  if (cachedS3Config) return cachedS3Config;

  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.S3_REGION?.trim();
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();

  if (!bucket || !region || !publicBaseUrl || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 media storage requires S3_BUCKET, S3_REGION, S3_PUBLIC_BASE_URL, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.",
    );
  }

  cachedS3Config = {
    bucket,
    client: new S3Client({
      region,
      ...(process.env.S3_ENDPOINT
        ? { endpoint: process.env.S3_ENDPOINT.trim() }
        : {}),
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId, secretAccessKey },
    }),
    publicBaseUrl: cleanBaseUrl(publicBaseUrl),
  };

  return cachedS3Config;
}

function safeLocalPathFromMediaUrl(url: string) {
  if (!url.startsWith(localPublicPrefix)) return null;

  const filename = path.basename(url);
  const resolved = localMediaPath(filename);
  const uploadRoot = path.resolve(localUploadDir);

  return resolved.startsWith(uploadRoot + path.sep) ? resolved : null;
}

function objectKeyFromPublicUrl(url: string, publicBaseUrl: string) {
  const prefix = `${cleanBaseUrl(publicBaseUrl)}/`;
  if (!url.startsWith(prefix)) return null;

  const key = decodeURIComponent(url.slice(prefix.length));
  return key && !key.includes("..") ? key : null;
}

export async function storeMediaObject({
  bytes,
  contentType,
  filename,
}: StorageInput) {
  const uniqueFilename = `${Date.now()}-${randomUUID().slice(0, 8)}-${filename}`;

  if (getStorageProvider() === "local") {
    await mkdir(localUploadDir, { recursive: true });
    const diskPath = localMediaPath(uniqueFilename);
    await writeFile(diskPath, bytes, { flag: "wx" });

    return {
      remove: async () => {
        try {
          await unlink(diskPath);
        } catch (error) {
          if (!isMissingFileError(error)) throw error;
        }
      },
      url: `${localPublicPrefix}${uniqueFilename}`,
    };
  }

  const config = createS3Config();
  const key = `media/${uniqueFilename}`;
  await config.client.send(
    new PutObjectCommand({
      Body: bytes,
      Bucket: config.bucket,
      CacheControl: "public, max-age=31536000, immutable",
      ContentType: contentType,
      Key: key,
    }),
  );

  return {
    remove: async () => {
      await config.client.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    },
    url: `${config.publicBaseUrl}/${key}`,
  };
}

export async function deleteStoredMediaObject(url: string) {
  const localPath = safeLocalPathFromMediaUrl(url);
  if (localPath) {
    try {
      await unlink(localPath);
    } catch (error) {
      if (!isMissingFileError(error)) throw error;
    }
    return;
  }

  if (getStorageProvider() !== "s3") return;

  const config = createS3Config();
  const key = objectKeyFromPublicUrl(url, config.publicBaseUrl);
  if (!key) return;

  await config.client.send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
}

export async function storePrivateMediaObject({
  bytes,
  contentType,
  filename,
}: StorageInput) {
  const uniqueFilename = `${Date.now()}-${randomUUID().slice(0, 8)}-${filename}`;

  if (getStorageProvider() === "local") {
    await mkdir(privateUploadDir, { recursive: true });
    const diskPath = privateMediaPath(uniqueFilename);
    await writeFile(diskPath, bytes, { flag: "wx" });

    return {
      remove: async () => {
        try {
          await unlink(diskPath);
        } catch (error) {
          if (!isMissingFileError(error)) throw error;
        }
      },
      storageKey: `${localPrivatePrefix}${uniqueFilename}`,
    };
  }

  const config = createS3Config();
  const key = `lead-attachments/${uniqueFilename}`;
  await config.client.send(
    new PutObjectCommand({
      Body: bytes,
      Bucket: config.bucket,
      ContentType: contentType,
      Key: key,
    }),
  );

  return {
    remove: async () => {
      await config.client.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    },
    storageKey: `${s3PrivatePrefix}${key}`,
  };
}

export async function readPrivateMediaObject(storageKey: string) {
  const localFilename = safeLocalFilenameFromPrivateKey(storageKey);
  if (localFilename) {
    return readFile(
      path.join(
        process.cwd(),
        "storage",
        "lead-attachments",
        localFilename,
      ),
    );
  }

  const key = safeS3PrivateKey(storageKey);
  if (!key || getStorageProvider() !== "s3") {
    throw new Error("Private media object is not available from this provider.");
  }

  const config = createS3Config();
  const object = await config.client.send(
    new GetObjectCommand({ Bucket: config.bucket, Key: key }),
  );
  if (!object.Body) throw new Error("Private media object has no body.");

  return Buffer.from(await object.Body.transformToByteArray());
}

export async function deletePrivateMediaObject(storageKey: string) {
  const localFilename = safeLocalFilenameFromPrivateKey(storageKey);
  if (localFilename) {
    try {
      await unlink(
        path.join(
          process.cwd(),
          "storage",
          "lead-attachments",
          localFilename,
        ),
      );
    } catch (error) {
      if (!isMissingFileError(error)) throw error;
    }
    return;
  }

  const key = safeS3PrivateKey(storageKey);
  if (!key || getStorageProvider() !== "s3") return;

  const config = createS3Config();
  await config.client.send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
}

function isMissingFileError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function safeLocalFilenameFromPrivateKey(storageKey: string) {
  if (!storageKey.startsWith(localPrivatePrefix)) return null;

  const rawFilename = storageKey.slice(localPrivatePrefix.length);
  const filename = path.basename(rawFilename);
  return filename && rawFilename === filename ? filename : null;
}

function localMediaPath(filename: string) {
  return path.join(
    process.cwd(),
    "public",
    "uploads",
    "media",
    filename,
  );
}

function privateMediaPath(filename: string) {
  return path.join(
    process.cwd(),
    "storage",
    "lead-attachments",
    filename,
  );
}

function safeS3PrivateKey(storageKey: string) {
  if (!storageKey.startsWith(s3PrivatePrefix)) return null;

  const key = storageKey.slice(s3PrivatePrefix.length);
  return key.startsWith("lead-attachments/") && !key.includes("..") ? key : null;
}
