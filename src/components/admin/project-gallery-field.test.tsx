import type React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectGalleryField } from "./project-gallery-field";

const initialGallery = [
  "/images/cocina-before.webp | before | Cocina antes | Distribución original",
  "/images/cocina-after.webp | after | Cocina después | Cocina integrada",
].join("\n");

const assets = [
  {
    altText: "Fachada contemporánea al atardecer",
    category: "Proyecto",
    id: "asset-1",
    title: "Casa Patio Norte",
    url: "/images/casa-patio.webp",
  },
];

function renderGallery(overrides: Partial<React.ComponentProps<typeof ProjectGalleryField>> = {}) {
  return render(
    <ProjectGalleryField
      assets={assets}
      defaultValue={initialGallery}
      disabled={false}
      hint="Orden público de las imágenes"
      label="Galería"
      name="gallery"
      {...overrides}
    />,
  );
}

describe("ProjectGalleryField", () => {
  it("renders visual items while preserving the serialized form field", () => {
    renderGallery();

    expect(screen.getByRole("group", { name: "Galería" })).toBeVisible();
    const gallery = screen.getByRole("list", { name: "Imágenes de la galería" });
    expect(within(gallery).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByTestId("gallery-serialized-value")).toHaveValue(
      initialGallery,
    );
    expect(screen.getByText("2 imágenes")).toBeVisible();
  });

  it("updates metadata and visual order in the hidden backend value", () => {
    renderGallery();
    const items = within(
      screen.getByRole("list", { name: "Imágenes de la galería" }),
    ).getAllByRole("listitem");

    fireEvent.change(within(items[0]).getByLabelText("Descripción breve"), {
      target: { value: "Estado previo de la cocina" },
    });
    fireEvent.click(
      within(items[0]).getByRole("button", {
        name: "Mover Imagen 1 hacia abajo",
      }),
    );

    expect(screen.getByTestId("gallery-serialized-value")).toHaveValue(
      [
        "/images/cocina-after.webp | after | Cocina después | Cocina integrada",
        "/images/cocina-before.webp | before | Cocina antes | Estado previo de la cocina",
      ].join("\n"),
    );
  });

  it("adds an approved library asset with useful metadata", () => {
    renderGallery({ defaultValue: "" });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Agregar Casa Patio Norte a la galería",
      }),
    );

    expect(screen.getByTestId("gallery-serialized-value")).toHaveValue(
      "/images/casa-patio.webp | final | Fachada contemporánea al atardecer | Casa Patio Norte",
    );
    expect(screen.getByText("1 imagen")).toBeVisible();
  });

  it("supports an empty state, keyboard focus and deletion", async () => {
    renderGallery({ assets: [], defaultValue: "" });

    expect(screen.getByText("La galería está vacía")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Agregar primera imagen" }),
    );

    const urlInput = screen.getByLabelText("URL o ruta pública");
    await waitFor(() => expect(urlInput).toHaveFocus());
    fireEvent.blur(urlInput);
    expect(
      screen.getByText("Cargá una URL o elegí una imagen de la biblioteca."),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Imagen 1" }));
    expect(screen.getByText("La galería está vacía")).toBeVisible();
    expect(screen.getByTestId("gallery-serialized-value")).toHaveValue("");
  });

  it("exposes backend errors and disables editing controls in read-only mode", () => {
    renderGallery({ disabled: true, error: "Agregá al menos una imagen" });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Agregá al menos una imagen",
    );
    expect(screen.getByRole("button", { name: "Agregar imagen" })).toBeDisabled();
    expect(screen.getAllByLabelText("URL o ruta pública")[0]).toBeDisabled();
  });
});
