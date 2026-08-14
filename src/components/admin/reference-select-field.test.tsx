import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReferenceSelectField } from "./reference-select-field";

const options = [
  { id: "service-1", label: "Construcción llave en mano", meta: "llave-en-mano" },
  { id: "service-2", label: "Diseño interior", meta: "interiores" },
];

describe("ReferenceSelectField", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("filters initial options while preserving the selected relation", () => {
    render(
      <ReferenceSelectField
        defaultValue="service-1"
        disabled={false}
        label="Servicio relacionado"
        name="serviceId"
        options={options}
        referenceType="services"
      />,
    );

    fireEvent.change(screen.getByRole("searchbox", { name: /buscar en servicio/i }), {
      target: { value: "interior" },
    });
    expect(screen.getByRole("combobox", { name: "Servicio relacionado" })).toHaveValue(
      "service-1",
    );
    expect(screen.getByRole("option", { name: /diseño interior/i })).toBeVisible();
  });

  it("searches remote records after a short debounce", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          hasMore: false,
          options: [{ id: "service-3", label: "Remodelación integral", meta: "remodelacion" }],
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReferenceSelectField
        defaultValue=""
        disabled={false}
        label="Servicio relacionado"
        name="serviceId"
        options={options}
        referenceType="services"
      />,
    );
    fireEvent.change(screen.getByRole("searchbox", { name: /buscar en servicio/i }), {
      target: { value: "remodelación" },
    });
    await waitFor(
      () =>
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining("/api/admin/references?q=remodelaci%C3%B3n"),
          expect.objectContaining({ credentials: "same-origin" }),
        ),
      { timeout: 1500 },
    );
    expect(
      await screen.findByRole("option", { name: /remodelación integral/i }),
    ).toBeVisible();
  });
});
