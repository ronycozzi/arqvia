// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  assertPublicWebhookDestination,
  isPublicIpAddress,
  UnsafeOutboundDestinationError,
} from "./outbound-network";

describe("outbound network policy", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.4",
    "169.254.169.254",
    "172.20.0.1",
    "192.168.1.10",
    "::1",
    "fe80::1",
    "fd00::1",
  ])("rejects non-public address %s", (address) => {
    expect(isPublicIpAddress(address)).toBe(false);
  });

  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])(
    "accepts public address %s",
    (address) => {
      expect(isPublicIpAddress(address)).toBe(true);
    },
  );

  it("rejects an allowlisted hostname when DNS resolves to a private address", async () => {
    const resolver = vi.fn().mockResolvedValue([
      { address: "127.0.0.1", family: 4 },
      { address: "10.0.0.8", family: 4 },
    ]);

    await expect(
      assertPublicWebhookDestination("https://crm.example.com/hook", {
        resolver,
      }),
    ).rejects.toBeInstanceOf(UnsafeOutboundDestinationError);
  });

  it("requires every resolved address to be public", async () => {
    await expect(
      assertPublicWebhookDestination("https://crm.example.com/hook", {
        resolver: async () => [
          { address: "8.8.8.8", family: 4 },
          { address: "169.254.169.254", family: 4 },
        ],
      }),
    ).rejects.toThrow(/privada o reservada/);
  });

  it("allows an explicitly local development receiver only when requested", async () => {
    await expect(
      assertPublicWebhookDestination("http://localhost:4100/hook", {
        allowDevelopmentLocalhost: true,
      }),
    ).resolves.toBeUndefined();
  });
});
