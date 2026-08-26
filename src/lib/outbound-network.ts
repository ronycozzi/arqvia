import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

type ResolvedAddress = { address: string; family: 4 | 6 };
type HostResolver = (hostname: string) => Promise<readonly ResolvedAddress[]>;

const blockedIpv4 = new BlockList();
([
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] satisfies Array<[string, number]>).forEach(([network, prefix]) =>
  blockedIpv4.addSubnet(network, prefix, "ipv4"),
);

const blockedIpv6 = new BlockList();
([
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:2::", 48],
  ["2001:10::", 28],
  ["2001:20::", 28],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
] satisfies Array<[string, number]>).forEach(([network, prefix]) =>
  blockedIpv6.addSubnet(network, prefix, "ipv6"),
);

export class UnsafeOutboundDestinationError extends Error {}

export type PublicWebhookResolution = {
  addresses: readonly ResolvedAddress[];
  developmentLocalhost: boolean;
  url: URL;
};

export function isPublicIpAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return !blockedIpv4.check(address, "ipv4");
  if (family === 6) return !blockedIpv6.check(address, "ipv6");
  return false;
}

export async function assertPublicWebhookDestination(
  rawUrl: string,
  options: {
    allowDevelopmentLocalhost?: boolean;
    resolver?: HostResolver;
    signal?: AbortSignal;
  } = {},
) {
  await resolvePublicWebhookDestination(rawUrl, options);
}

export async function resolvePublicWebhookDestination(
  rawUrl: string,
  options: {
    allowDevelopmentLocalhost?: boolean;
    resolver?: HostResolver;
    signal?: AbortSignal;
  } = {},
): Promise<PublicWebhookResolution> {
  const url = new URL(rawUrl);
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const isDevelopmentLocalhost =
    options.allowDevelopmentLocalhost &&
    (hostname === "localhost" || hostname.endsWith(".localhost"));
  if (isDevelopmentLocalhost) {
    return { addresses: [], developmentLocalhost: true, url };
  }

  const resolver: HostResolver =
    options.resolver ||
    (async (host) => {
      const results = await lookup(host, { all: true, verbatim: true });
      return results.map(({ address, family }) => ({
        address,
        family: family as 4 | 6,
      }));
    });
  let addresses: readonly ResolvedAddress[];
  try {
    addresses = isIP(hostname)
      ? [{ address: hostname, family: isIP(hostname) as 4 | 6 }]
      : await resolveWithAbort(resolver(hostname), options.signal);
  } catch {
    throw new UnsafeOutboundDestinationError(
      "El destino del webhook no pudo resolverse de forma segura.",
    );
  }

  if (!addresses.length || addresses.some(({ address }) => !isPublicIpAddress(address))) {
    throw new UnsafeOutboundDestinationError(
      "El destino del webhook resuelve a una red privada o reservada.",
    );
  }

  return { addresses, developmentLocalhost: false, url };
}

export function createPinnedLookup(
  addresses: readonly ResolvedAddress[],
): LookupFunction {
  let index = 0;

  return (
    _hostname: string,
    options,
    callback: (
      error: NodeJS.ErrnoException | null,
      address: string | ResolvedAddress[],
      family?: number,
    ) => void,
  ) => {
    if (options.all) {
      callback(null, addresses.map((address) => ({ ...address })));
      return;
    }

    const selected = addresses[index % addresses.length];
    index += 1;
    callback(null, selected.address, selected.family);
  };
}

export async function postJsonToPublicWebhook(
  rawUrl: string,
  options: {
    allowDevelopmentLocalhost?: boolean;
    body: string;
    headers: Record<string, string>;
    resolver?: HostResolver;
    signal: AbortSignal;
  },
) {
  const resolution = await resolvePublicWebhookDestination(rawUrl, options);
  const transport = resolution.url.protocol === "http:" ? httpRequest : httpsRequest;
  const lookup = resolution.developmentLocalhost
    ? undefined
    : createPinnedLookup(resolution.addresses);

  return new Promise<{ ok: boolean; status: number }>((resolve, reject) => {
    const request = transport(
      resolution.url,
      {
        agent: false,
        headers: {
          ...options.headers,
          "content-length": String(Buffer.byteLength(options.body)),
        },
        lookup,
        method: "POST",
        signal: options.signal,
      },
      (response) => {
        const status = response.statusCode || 502;
        response.resume();
        response.once("end", () => {
          resolve({ ok: status >= 200 && status < 300, status });
        });
      },
    );
    request.once("error", reject);
    request.end(options.body);
  });
}

async function resolveWithAbort<T>(promise: Promise<T>, signal?: AbortSignal) {
  if (!signal) return promise;
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");

  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => {
      signal.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true },
      );
    }),
  ]);
}
