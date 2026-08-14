export async function readBoundedRequest(
  request: Request,
  maxBytes: number,
  timeoutMs = 15_000,
): Promise<Request | null> {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) return null;
  if (!request.body) return request;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const deadline = Date.now() + timeoutMs;

  while (true) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      await reader.cancel().catch(() => undefined);
      return null;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), remainingMs);
    });
    const chunk = await Promise.race([reader.read(), timeout]);
    if (timer) clearTimeout(timer);
    if (!chunk) {
      await reader.cancel().catch(() => undefined);
      return null;
    }

    const { done, value } = chunk;
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new Request(request.url, {
    body: bytes,
    headers: request.headers,
    method: request.method,
  });
}

export async function readBoundedJson(
  request: Request,
  maxBytes = 16 * 1024,
  timeoutMs = 5_000,
): Promise<{ ok: true; value: unknown } | { ok: false; status: 400 | 413 }> {
  const bounded = await readBoundedRequest(request, maxBytes, timeoutMs);
  if (!bounded) return { ok: false, status: 413 };

  try {
    return { ok: true, value: await bounded.json() };
  } catch {
    return { ok: false, status: 400 };
  }
}
