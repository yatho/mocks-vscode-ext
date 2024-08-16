import vscode, { Uri } from "vscode";
import http from "http";
import zlib from "zlib";
import { ProxyMockerDetail } from "./ProxyMockerDetail";
import { createProxyServer } from "http-proxy";
import { ProxyMockerViewProvider } from "./ProxyMockerViewProvider";

// TODO : Nettoyer tout ça
// TODO : Créer des tests
// TODO : Changer le nom de l'extension
// TODO : Surcharger par des icones
// TODO : Ordonner les actions dans le menu

let server: http.Server | null = null;
let proxyUri: Uri | null = null;

function createProxy(outputChannel: vscode.OutputChannel) {
  const config = vscode.workspace.getConfiguration("proxyMocker");
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
  const treeDataProvider = new ProxyMockerViewProvider(context);
  const treeView = vscode.window.createTreeView("proxyMockerView", {
    treeDataProvider,
  });

  const proxyMockerDetail = new ProxyMockerDetail();

  treeView.onDidChangeSelection((e) => {
    if (e.selection.length === 0) return;

    const selected = e.selection[0];
    const requestContent: {
      [key: string]: { method: string; status: number; body: string }[];
    } = context.globalState.get("requestContent", {});

    proxyMockerDetail.openMockDetail(
      selected.label,
      requestContent[selected.label]
    );
  });

  return treeDataProvider;
}

async function openProxyUri() {
  if (proxyUri) {
    const config = vscode.workspace.getConfiguration("proxyMocker");
    const automaticallyOpen = config?.get<boolean>("automaticallyOpen", true);
    if (automaticallyOpen) {
      vscode.env.openExternal(proxyUri);
    } else {
      const openUri = await vscode.window.showQuickPick(["Yes", "No"], {
        canPickMany: false,
        title: "Do you want open the proxy uri ?",
      });
      if (openUri === "Yes") vscode.env.openExternal(proxyUri);
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Proxy Mocker");
  let treeDataProvider = createTreeViews(context);
  let proxy = createProxy(outputChannel);

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (!event.affectsConfiguration("proxyMocker")) return;
    deactivate();

    proxy.close();

    proxy = createProxy(outputChannel);
  });

  function logAndSaveRequest(
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
    vscode.commands.registerCommand("proxyMockerExt.saveRequest", () => {
      vscode.commands.executeCommand("proxyMockerExt.stopSaveRequest");
      proxy.on("proxyRes", function (proxyRes, req, res) {
        // TODO : Permit to choose the pattern
        if (req.url?.includes("api")) {
          let body: Buffer[] = [];
          proxyRes.on("data", function (chunk) {
            body.push(chunk);
          });
          // When all body data has been received
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
                  logAndSaveRequest(req, proxyRes, decoded.toString("utf-8"));
                }
              });
            } else if (encoding === "deflate") {
              zlib.inflate(buffer, (err, decoded) => {
                if (err) {
                  outputChannel.appendLine(
                    `Error decompressing response: ${err}`
                  );
                } else {
                  logAndSaveRequest(req, proxyRes, decoded.toString("utf-8"));
                }
              });
            } else if (encoding === "br") {
              zlib.brotliDecompress(buffer, (err, decoded) => {
                if (err) {
                  outputChannel.appendLine(
                    `Error decompressing response: ${err}`
                  );
                } else {
                  logAndSaveRequest(req, proxyRes, decoded.toString("utf-8"));
                }
              });
            } else {
              // If not compressed, log as plain text
              logAndSaveRequest(req, proxyRes, buffer.toString("utf-8"));
            }
          });
          vscode.commands.executeCommand("extension.refreshMock");
        }
      });
      outputChannel.appendLine("Start save request...");
      openProxyUri();
    }),
    vscode.commands.registerCommand("proxyMockerExt.stopSaveRequest", () => {
      proxy.removeAllListeners("proxyRes");
      outputChannel.appendLine("Stop save request...");
    }),
    vscode.commands.registerCommand("proxyMockerExt.showMock", async () => {
      outputChannel.appendLine("Mocks");
      outputChannel.appendLine(
        JSON.stringify(context.globalState.get("requestContent"), null, 2)
      );
    }),
    vscode.commands.registerCommand("proxyMockerExt.useMock", async () => {
      vscode.commands.executeCommand("proxyMockerExt.stopUseMock");
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
    vscode.commands.registerCommand("proxyMockerExt.stopUseMock", () => {
      proxy.removeAllListeners("proxyReq");
      outputChannel.appendLine("Stop use mocks to replace real called...");
    }),
    vscode.commands.registerCommand("proxyMockerExt.deleteMocks", async () => {
      context.globalState.update("requestContent", {});
      vscode.commands.executeCommand("proxyMockerExt.refreshMock");
    }),
    vscode.commands.registerCommand(
      "proxyMockerExt.deleteMock",
      async (uri: string) => {}
    ),
    vscode.commands.registerCommand(
      "proxyMockerExt.refreshMock",
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
