// Minimal stand-in for the production topology of a base path deployment:
// a "public" origin that forwards requests to the app, the way a rewrite from
// another domain does. The app receives its own Host header while the browser
// keeps sending the public Origin, which is exactly what breaks origin checks,
// Server Actions and redirects when they are not base-path aware.
//
//   node tests/e2e/support/public-origin-proxy.mjs <listen-port> <app-port>
//
// Then run the smoke suite against the public origin:
//
//   NEXT_PUBLIC_BASE_PATH=/arqvia-demo \
//   NEXT_PUBLIC_SITE_URL=http://localhost:<listen-port>/arqvia-demo npm run build
//   NEXT_PUBLIC_BASE_PATH=/arqvia-demo PLAYWRIGHT_PORT=<app-port> \
//   PLAYWRIGHT_BASE_URL=http://localhost:<listen-port> npm run e2e
import http from "node:http";

const listenPort = Number(process.argv[2] || 3417);
const appPort = Number(process.argv[3] || 3418);
const appHost = `localhost:${appPort}`;

http
  .createServer((request, response) => {
    const headers = { ...request.headers, host: appHost };
    // What a hosting proxy adds; the app must not rely on the forwarded host.
    headers["x-forwarded-for"] = request.socket.remoteAddress || "127.0.0.1";
    headers["x-forwarded-host"] = appHost;

    const upstream = http.request(
      {
        headers,
        host: "localhost",
        method: request.method,
        path: request.url,
        port: appPort,
      },
      (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      },
    );
    upstream.on("error", () => {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    });
    request.pipe(upstream);
  })
  .listen(listenPort, () => {
    console.log(`public origin http://localhost:${listenPort} -> app http://${appHost}`);
  });
