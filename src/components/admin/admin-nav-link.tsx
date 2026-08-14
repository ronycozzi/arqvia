"use client";

import type { ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type AdminNavLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  activeClassName?: string;
  exact?: boolean;
  inactiveClassName?: string;
};

export function AdminNavLink({
  activeClassName,
  className,
  exact,
  href,
  inactiveClassName,
  ...props
}: AdminNavLinkProps) {
  const pathname = usePathname();
  const hrefString = typeof href === "string" ? href : href.toString();
  const cleanHref = hrefString.split(/[?#]/)[0] || hrefString;
  const isActive =
    exact || cleanHref === "/admin"
      ? pathname === cleanHref
      : pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(className, isActive ? activeClassName : inactiveClassName)}
      href={href}
      {...props}
    />
  );
}
