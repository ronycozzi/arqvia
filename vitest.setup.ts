import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();

  return {
    ...actual,
    after: (callback: () => void | Promise<void>) => callback(),
  };
});
