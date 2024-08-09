import vscode, { Uri } from "vscode";
import http from "http";
import zlib from "zlib";
import { RequestInterceptMockingViewProvider } from "./RequestInterceptMockingViewProvider";
import { RequestMockDetail } from "./RequestMockDetail";
import { createProxyServer } from "http-proxy";

// TODO : Nettoyer tout ça
// TODO : Créer des tests
// TODO : Changer le nom de l'extension
// TODO : Surcharger par des icones
// TODO : Ordonner les actions dans le menu

let server: http.Server | null = null;
let proxyUri: Uri | null = null;

function createProxy(outputChannel: vscode.OutputChannel) {
  const config = vscode.workspace.getConfiguration("requestInterceptMocking");
  const proxy = createProxyServer({});
  const proxyPort = config.get<number>("proxyPort", 8000);
  const targetPort = config.get<number>("targetPort", 4200);

  proxyUri = vscode.Uri.parse(`http://localhost:${proxyPort}`);

  server = http.createServer(function (req, res) {
    // Remove caching headers
    delete req.headers["if-none-match"];
    delete req.headers["if-modified-since"];
    proxy.web(req, res, { target: `http://localhost:${targetPort}` });
  });

  server.listen(proxyPort);

  outputChannel.appendLine(`Proxy démarré sur http://localhost:${proxyPort}`);

  return proxy;
}

function createTreeViews(context: vscode.ExtensionContext) {
  const treeDataProvider = new RequestInterceptMockingViewProvider(context);
  const treeView = vscode.window.createTreeView("requestInterceptMockingView", {
    treeDataProvider,
  });

  const requestMockDetail = new RequestMockDetail();

  treeView.onDidChangeSelection((e) => {
    if (e.selection.length === 0) return;

    const selected = e.selection[0];
    const requestContent: {
      [key: string]: { method: string; status: number; body: string }[];
    } = context.globalState.get("requestContent", {});

    requestMockDetail.openMockDetail(
      selected.label,
      requestContent[selected.label]
    );
  });

  return treeDataProvider;
}

function openProxyUri() {
  if (proxyUri) vscode.env.openExternal(proxyUri);
}

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Request mocker");
  let treeDataProvider = createTreeViews(context);
  const proxy = createProxy(outputChannel);

  function logAndSavecRequest(
    req: http.IncomingMessage,
    proxyRes: http.IncomingMessage,
    body: string
  ) {
    saveRequest(req, proxyRes, body);
    outputChannel.appendLine(`Request added : ${req.url}`);
  }

  async function saveRequest(
    req: http.IncomingMessage,
    res: http.IncomingMessage,
    body: string
  ) {
    if (!req.url || !req.method || !res.statusCode) return;

    let requestContent: {
      [key: string]: { method: string; status: number; body: string }[];
    } = context.globalState.get("requestContent", {});

    if (!requestContent[req.url]) {
      requestContent[req.url] = [];
    }

    requestContent[req.url] = requestContent[req.url].filter(
      (response) => response.method !== req.method
    );

    requestContent[req.url].push({
      method: req.method,
      status: res.statusCode,
      body: body,
    });

    try {
      await context.globalState.update("requestContent", requestContent);
    } catch (error) {
      console.error("Failed to save request data:", error);
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.saveRequest", () => {
      proxy.on("proxyRes", function (proxyRes, req, res) {
        if (req.url?.includes("api")) {
          let body: Buffer[] = [];
          proxyRes.on("data", function (chunk) {
            body.push(chunk);
          });
          // Lorsque toute la réponse a été reçue
          proxyRes.on("end", function () {
            let buffer = Buffer.concat(body);

            // Check if the response is compressed
            const encoding = proxyRes.headers["content-encoding"];

            if (encoding === "gzip") {
              zlib.gunzip(buffer, (err, decoded) => {
                if (err) {
                  outputChannel.appendLine(
                    `Error decompressing response: ${err}`
                  );
                } else {
                  logAndSavecRequest(req, proxyRes, decoded.toString("utf-8"));
                }
              });
            } else if (encoding === "deflate") {
              zlib.inflate(buffer, (err, decoded) => {
                if (err) {
                  outputChannel.appendLine(
                    `Error decompressing response: ${err}`
                  );
                } else {
                  logAndSavecRequest(req, proxyRes, decoded.toString("utf-8"));
                }
              });
            } else if (encoding === "br") {
              zlib.brotliDecompress(buffer, (err, decoded) => {
                if (err) {
                  outputChannel.appendLine(
                    `Error decompressing response: ${err}`
                  );
                } else {
                  logAndSavecRequest(req, proxyRes, decoded.toString("utf-8"));
                }
              });
            } else {
              // If not compressed, log as plain text
              logAndSavecRequest(req, proxyRes, buffer.toString());
            }
            vscode.commands.executeCommand("extension.refreshMock");
          });
        }
      });
      outputChannel.appendLine("Start save request...");
      openProxyUri();
    }),
    vscode.commands.registerCommand("extension.stopSaveRequest", () => {
      proxy.removeAllListeners("proxyRes");
      outputChannel.appendLine("Stop save request...");
    }),
    vscode.commands.registerCommand("extension.showMock", async () => {
      outputChannel.appendLine("Mocks");
      outputChannel.appendLine(
        JSON.stringify(context.globalState.get("requestContent"), null, 2)
      );
    }),
    vscode.commands.registerCommand("extension.useMock", async () => {
      proxy.on("proxyReq", function (proxyReq, req, res) {
        if (!req.url?.includes("api")) return;

        let requestContent: {
          [key: string]: { method: string; status: number; body: string }[];
        } = context.globalState.get("requestContent", {});

        if (requestContent[req.url]) {
          const response = requestContent[req.url].find(
            (response: any) => response.method === req.method
          );
          if (response) {
            res.writeHead(response.status, {
              "Content-Type": "application/json",
            });
            res.end(response.body);
            return;
          }
        }
      });

      outputChannel.appendLine("Proxy en cours d'exécution...");
      openProxyUri();
    }),
    vscode.commands.registerCommand("extension.stopUseMock", () => {
      proxy.removeAllListeners("proxyReq");
      outputChannel.appendLine("Stop use mocks to replace real called...");
    }),
    vscode.commands.registerCommand("extension.deleteMocks", async () => {
      context.globalState.update("requestContent", {});
      vscode.commands.executeCommand("extension.refreshMock");
    }),
    vscode.commands.registerCommand(
      "extension.deleteMock",
      async (uri: string) => {}
    ),
    vscode.commands.registerCommand(
      "extension.refreshMock",
      async (uri: string) => {
        treeDataProvider.refresh();
      }
    )
  );
}

export function deactivate() {
  if (server) {
    server.close();
    server = null;
  }
}
