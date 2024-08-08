import vscode from "vscode";
import http from "http";
import { createProxyServer } from "http-proxy";
import zlib from "zlib";

let server: http.Server | null = null;

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Request Logger");

  // Créer le proxy
  const proxy = createProxyServer({});

  proxy.on("proxyRes", function (proxyRes, req, res) {
    if (req.url?.includes("api")) {
      let body: Buffer[] = [];
      proxyRes.on("data", function (chunk) {
        body.push(chunk);
      });
      // Lorsque la connexion est fermée (rarement utilisé)
      proxyRes.on("close", function () {
        outputChannel.appendLine("Connexion fermée.");
      });
      // Lorsque toute la réponse a été reçue
      proxyRes.on("end", function () {
        let buffer = Buffer.concat(body);

        // Check if the response is compressed
        const encoding = proxyRes.headers["content-encoding"];

        if (encoding === "gzip") {
          zlib.gunzip(buffer, (err, decoded) => {
            if (err) {
              outputChannel.appendLine(`Error decompressing response: ${err}`);
            } else {
              logResponse(req, proxyRes, decoded.toString("utf-8"));
            }
          });
        } else if (encoding === "deflate") {
          zlib.inflate(buffer, (err, decoded) => {
            if (err) {
              outputChannel.appendLine(`Error decompressing response: ${err}`);
            } else {
              logResponse(req, proxyRes, decoded.toString("utf-8"));
            }
          });
        } else if (encoding === "br") {
          zlib.brotliDecompress(buffer, (err, decoded) => {
            if (err) {
              outputChannel.appendLine(`Error decompressing response: ${err}`);
            } else {
              logResponse(req, proxyRes, decoded.toString("utf-8"));
            }
          });
        } else {
          // If not compressed, log as plain text
          logResponse(req, proxyRes, buffer.toString());
        }
      });
    }
  });

  function logResponse(
    req: http.IncomingMessage,
    proxyRes: http.IncomingMessage,
    body: string
  ) {
    outputChannel.appendLine(
      `Response received: ${req.method} ${req.url}, Status: ${proxyRes.statusCode}`
    );
    outputChannel.appendLine(`Response body: ${body}`);
  }

  // Créer un serveur HTTP pour rediriger les requêtes
  server = http.createServer(function (req, res) {
    // Remove caching headers
    delete req.headers["if-none-match"];
    delete req.headers["if-modified-since"];
    proxy.web(req, res, { target: "http://localhost:4200" });
  });

  server.listen(8000);

  outputChannel.appendLine("Proxy démarré sur http://localhost:8000");

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.startProxy", () => {
      outputChannel.show();
      outputChannel.appendLine("Proxy en cours d'exécution...");
    })
  );
}

export function deactivate() {
  if (server) {
    server.close();
    server = null;
  }
}
