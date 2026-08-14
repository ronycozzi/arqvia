import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

type ResolvedAddress = { address: string; family: number };
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
  ["100::", 64],
  ["2001:2::", 48],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] satisfies Array<[string, number]>).forEach(([network, prefix]) =>
  blockedIpv6.addSubnet(network, prefix, "ipv6"),
);

export class UnsafeOutboundDestinationError extends Error {}

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
  } = {},
) {
  const url = new URL(rawUrl);
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const isDevelopmentLocalhost =
    options.allowDevelopmentLocalhost &&
    (hostname === "localhost" || hostname.endsWith(".localhost"));
  if (isDevelopmentLocalhost) return;

  const resolver: HostResolver =
    options.resolver ||
    ((host) => lookup(host, { all: true, verbatim: true }));
  let addresses: readonly ResolvedAddress[];
  try {
    addresses = isIP(hostname)
      ? [{ address: hostname, family: isIP(hostname) }]
      : await resolver(hostname);
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
}
