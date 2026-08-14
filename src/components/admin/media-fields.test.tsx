import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MediaImageField, type AdminMediaOption } from "./media-fields";

const assets: AdminMediaOption[] = Array.from({ length: 25 }, (_, index) => ({
  altText: `Descripción del recurso ${index + 1}`,
  category: index % 2 === 0 ? "Proyecto" : "Equipo",
  id: `media-${index + 1}`,
  title: `Imagen ${index + 1}`,
  url: `/images/media-${index + 1}.webp`,
}));

describe("MediaImageField library", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps large approved libraries searchable beyond the first page", () => {
    render(
      <MediaImageField
        assets={assets}
        defaultValue=""
        disabled={false}
        label="Imagen principal"
        name="heroImage"
      />,
    );

    expect(screen.getByRole("button", { name: "Usar Imagen 12" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Usar Imagen 13" })).toBeNull();

    fireEvent.change(screen.getByLabelText("Buscar imágenes en la biblioteca"), {
      target: { value: "Imagen 13" },
    });

    expect(screen.getByRole("button", { name: "Usar Imagen 13" })).toBeVisible();
    expect(screen.getByText("1 resultado")).toBeVisible();
  });

  it("filters by category and writes the selected URL into the field", () => {
    render(
      <MediaImageField
        assets={assets}
        defaultValue=""
        disabled={false}
        label="Imagen principal"
        name="heroImage"
      />,
    );

    fireEvent.change(screen.getByLabelText("Filtrar biblioteca por categoría"), {
      target: { value: "Equipo" },
    });
    expect(screen.getByText("12 resultados")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Usar Imagen 2" }));
    expect(screen.getByRole("textbox", { name: "Imagen principal" })).toHaveValue(
      "/images/media-2.webp",
    );
  });

  it("searches approved assets beyond the initial server selection", async () => {
    const remoteAsset: AdminMediaOption = {
      altText: "Archivo histórico del acceso principal",
      category: "Proyecto",
      id: "media-historic",
      title: "Acceso histórico",
      url: "/images/acceso-historico.webp",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ assets: [remoteAsset], hasMore: false }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MediaImageField
        assets={assets}
        defaultValue=""
        disabled={false}
        label="Imagen principal"
        name="heroImage"
      />,
    );

    fireEvent.change(screen.getByLabelText(/buscar imágenes/i), {
      target: { value: "histórico" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /buscar en toda la biblioteca/i }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/media?q=hist%C3%B3rico"),
        expect.objectContaining({ credentials: "same-origin" }),
      );
    });
    expect(
      await screen.findByRole("button", { name: "Usar Acceso histórico" }),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Usar Acceso histórico" }),
    );
    expect(screen.getByRole("textbox", { name: "Imagen principal" })).toHaveValue(
      "/images/acceso-historico.webp",
    );
  });
});
