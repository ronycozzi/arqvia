// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  buildAdminPaginationHref,
  parseAdminPageParam,
  resolveAdminPagination,
} from "@/lib/admin-pagination";

describe("admin pagination", () => {
  it.each([
    [undefined, 1],
    ["", 1],
    ["0", 1],
    ["-2", 1],
    ["2.5", 1],
    ["2oops", 1],
    [["2", "3"], 1],
    ["2", 2],
    [" 3 ", 3],
  ])("parses %j as page %i", (value, expected) => {
    expect(parseAdminPageParam(value)).toBe(expected);
  });

  it("calculates a valid requested page", () => {
    expect(resolveAdminPagination("2", 51, 25)).toEqual({
      currentPage: 2,
      requestedPage: 2,
      shouldRedirect: false,
      skip: 25,
      take: 25,
      totalPages: 3,
    });
  });

  it("clamps an upper out-of-range page and marks it for redirect", () => {
    expect(resolveAdminPagination("999", 51, 25)).toEqual({
      currentPage: 3,
      requestedPage: 999,
      shouldRedirect: true,
      skip: 50,
      take: 25,
      totalPages: 3,
    });
  });

  it("redirects an out-of-range empty result to the canonical first page", () => {
    expect(resolveAdminPagination("999", 0, 25)).toEqual({
      currentPage: 1,
      requestedPage: 999,
      shouldRedirect: true,
      skip: 0,
      take: 25,
      totalPages: 1,
    });
  });

  it("canonicalizes malformed and explicit first-page parameters", () => {
    expect(resolveAdminPagination(undefined, 10, 25).shouldRedirect).toBe(false);
    expect(resolveAdminPagination("1", 10, 25).shouldRedirect).toBe(true);
    expect(resolveAdminPagination("01", 10, 25).shouldRedirect).toBe(true);
    expect(resolveAdminPagination("oops", 10, 25).shouldRedirect).toBe(true);
  });

  it("builds page links without mutating filters", () => {
    const filters = new URLSearchParams({ estado: "DRAFT", page: "9", q: "casa patio" });
    const nextPageUrl = new URL(
      buildAdminPaginationHref("/admin/blog", filters, 3),
      "https://admin.test",
    );

    expect(nextPageUrl.pathname).toBe("/admin/blog");
    expect(Object.fromEntries(nextPageUrl.searchParams)).toEqual({
      estado: "DRAFT",
      page: "3",
      q: "casa patio",
    });
    expect(filters.get("page")).toBe("9");
    expect(buildAdminPaginationHref("/admin/blog", filters, 1)).toBe(
      "/admin/blog?estado=DRAFT&q=casa+patio",
    );
  });

  it("rejects invalid pagination totals and sizes", () => {
    expect(() => resolveAdminPagination(undefined, -1, 25)).toThrow(RangeError);
    expect(() => resolveAdminPagination(undefined, 1, 0)).toThrow(RangeError);
  });
});
