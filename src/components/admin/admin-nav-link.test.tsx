import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminNavLink } from "./admin-nav-link";

const navigation = vi.hoisted(() => ({ pathname: "/admin/leads/lead-1" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

describe("AdminNavLink", () => {
  afterEach(() => cleanup());

  it("marks a parent module active for nested routes", () => {
    render(
      <AdminNavLink
        href="/admin/leads"
        activeClassName="active"
        inactiveClassName="inactive"
      >
        Leads
      </AdminNavLink>,
    );

    const link = screen.getByRole("link", { name: "Leads" });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveClass("active");
    expect(link).not.toHaveClass("inactive");
  });

  it("keeps the dashboard exact while another admin module is active", () => {
    render(
      <AdminNavLink
        href="/admin"
        exact
        activeClassName="active"
        inactiveClassName="inactive"
      >
        Dashboard
      </AdminNavLink>,
    );

    const link = screen.getByRole("link", { name: "Dashboard" });
    expect(link).not.toHaveAttribute("aria-current");
    expect(link).toHaveClass("inactive");
  });
});
