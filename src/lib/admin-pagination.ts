export type AdminPageParam = string | string[] | undefined;

export type AdminPagination = {
  currentPage: number;
  requestedPage: number;
  shouldRedirect: boolean;
  skip: number;
  take: number;
  totalPages: number;
};

const firstPage = 1;

export function parseAdminPageParam(page: AdminPageParam) {
  if (typeof page !== "string") return firstPage;

  const value = page.trim();
  if (!/^[1-9]\d*$/.test(value)) return firstPage;

  const parsedPage = Number(value);
  return Number.isSafeInteger(parsedPage) ? parsedPage : firstPage;
}

export function resolveAdminPagination(
  page: AdminPageParam,
  totalItems: number,
  pageSize: number,
): AdminPagination {
  if (!Number.isSafeInteger(totalItems) || totalItems < 0) {
    throw new RangeError("totalItems must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new RangeError("pageSize must be a positive safe integer");
  }

  const requestedPage = parseAdminPageParam(page);
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), firstPage);
  const currentPage = Math.min(requestedPage, totalPages);
  const canonicalPageParam = currentPage > firstPage ? String(currentPage) : undefined;

  return {
    currentPage,
    requestedPage,
    shouldRedirect: page !== canonicalPageParam,
    skip: (currentPage - firstPage) * pageSize,
    take: pageSize,
    totalPages,
  };
}

export function buildAdminPaginationHref(
  pathname: string,
  searchParams: URLSearchParams,
  page: number,
) {
  if (!Number.isSafeInteger(page) || page < firstPage) {
    throw new RangeError("page must be a positive safe integer");
  }

  const nextParams = new URLSearchParams(searchParams);
  nextParams.delete("page");
  if (page > firstPage) nextParams.set("page", String(page));

  const search = nextParams.toString();
  return search ? `${pathname}?${search}` : pathname;
}
