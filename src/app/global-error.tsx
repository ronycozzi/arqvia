"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Arqvia root rendering error", error);
  }, [error]);

  return (
    <html lang="es-AR">
      <head>
        <title>No pudimos cargar Arqvia</title>
      </head>
      <body
        style={{
          background: "#171815",
          color: "#fffaf1",
          fontFamily: "Arial, Helvetica, sans-serif",
          margin: 0,
        }}
      >
        <main
          style={{
            display: "grid",
            minHeight: "100vh",
            placeItems: "center",
            padding: "32px",
          }}
        >
          <section style={{ maxWidth: "640px" }}>
            <p
              style={{
                color: "#d3a26b",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Arqvia
            </p>
            <h1
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "42px",
                fontWeight: 400,
                lineHeight: 1.05,
                margin: "18px 0 0",
              }}
            >
              No pudimos cargar el sitio.
            </h1>
            <p style={{ color: "#d8d4ca", lineHeight: 1.7, marginTop: "24px" }}>
              Puede ser un problema temporal de conexión o de contenido. Probá
              nuevamente en unos segundos.
            </p>
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                background: "#8b5e2e",
                border: 0,
                color: "#fffaf1",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 700,
                marginTop: "28px",
                minHeight: "48px",
                padding: "0 24px",
              }}
            >
              Reintentar
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
