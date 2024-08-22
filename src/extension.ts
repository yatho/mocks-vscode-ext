import vscode from "vscode";
import http from "http";
import { ProxyMockerDetail } from "./ProxyMockerDetail";
import { createProxyServer } from "http-proxy";
import { ProxyMockerViewProvider } from "./ProxyMockerViewProvider";
import { decodeBuffer } from "http-encoding";

const PROXY_MOCKER = "proxyMocker";
// TODO : Créer des tests

let server: http.Server | null = null;

function createProxy(outputChannel: vscode.OutputChannel) {
  const config = vscode.workspace.getConfiguration(PROXY_MOCKER);
  const proxy = createProxyServer({ changeOrigin: true });
  const proxyPort = config.get<number>("proxyPort", 8000);
  const targetUri = config.get<string>("targetUri", "http://localhost:3000");

  server = http.createServer(function (req, res) {
    // Remove caching headers
    delete req.headers["if-none-match"];
    delete req.headers["if-modified-since"];
    proxy.web(req, res, { target: targetUri });
  });
  server.listen(proxyPort);

  return proxy;
}

function createTreeViews(context: vscode.ExtensionContext) {
  const treeDataProvider = new ProxyMockerViewProvider(context);
  const treeView = vscode.window.createTreeView("proxyMockerView", {
    treeDataProvider,
  });

  const proxyMockerDetail = new ProxyMockerDetail();

  treeView.onDidChangeSelection((e) => {
    if (e.selection.length === 0) {
      return;
    }

    const selected = e.selection[0];
    const requestContent: {
      [key: string]: { method: string; status: number; body: string }[];
    } = context.workspaceState.get("requestContent", {});

    proxyMockerDetail.openMockDetail(
      selected.label,
      requestContent[selected.label]
    );
  });

  return treeDataProvider;
}

function changeMockContext(value: boolean) {
  vscode.commands.executeCommand(
    "setContext",
    "proxyMockerExt.isUseMock",
    value
  );
}

function changeSaveContext(value: boolean) {
  vscode.commands.executeCommand(
    "setContext",
    "proxyMockerExt.isSaveRequest",
    value
  );
}

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Proxy Mocker");
  let treeDataProvider = createTreeViews(context);
  let proxy = createProxy(outputChannel);

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (!event.affectsConfiguration(PROXY_MOCKER)) {
      return;
    }
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
    if (!req.url || !req.method || !res.statusCode) {
      return;
    }

    let requestContent: {
      [key: string]: { method: string; status: number; body: string }[];
    } = context.workspaceState.get("requestContent", {});

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
      await context.workspaceState.update("requestContent", requestContent);
    } catch (error) {
      console.error("Failed to save request data:", error);
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("proxyMockerExt.saveRequest", () => {
      changeSaveContext(true);
      const config = vscode.workspace.getConfiguration(PROXY_MOCKER);
      const pathPattern = config.get<string>("pathPattern", "/api");
      proxy.on("proxyRes", function (proxyRes, req, res) {
        if (req.url?.match(pathPattern)) {
          let body: Buffer[] = [];
          proxyRes.on("data", function (chunk) {
            body.push(chunk);
          });
          // When all body data has been received
          proxyRes.on("end", async function () {
            let buffer = Buffer.concat(body);
            const encoding = proxyRes.headers["content-encoding"];
            const decoded = await decodeBuffer(buffer, encoding);
            logAndSaveRequest(req, proxyRes, decoded.toString("utf-8"));
            vscode.commands.executeCommand("extension.refreshMock");
          });
        }
      });
      outputChannel.appendLine("Start save request...");
    }),
    vscode.commands.registerCommand("proxyMockerExt.stopSaveRequest", () => {
      changeSaveContext(false);
      proxy.removeAllListeners("proxyRes");
      outputChannel.appendLine("Stop save request...");
    }),
    vscode.commands.registerCommand("proxyMockerExt.showMock", async () => {
      outputChannel.show();
      outputChannel.appendLine("Mocks");
      outputChannel.appendLine(
        JSON.stringify(context.workspaceState.get("requestContent"), null, 2)
      );
    }),
    vscode.commands.registerCommand("proxyMockerExt.useMock", async () => {
      changeMockContext(true);
      const config = vscode.workspace.getConfiguration(PROXY_MOCKER);
      const pathPattern = config.get<string>("pathPattern", "/api");
      proxy.on("proxyReq", function (proxyReq, req, res) {
        if (!req.url?.match(pathPattern)) {
          return;
        }

        let requestContent: {
          [key: string]: { method: string; status: number; body: string }[];
        } = context.workspaceState.get("requestContent", {});

        if (requestContent[req.url]) {
          const response = requestContent[req.url].find(
            (response: any) => response.method === req.method
          );
          if (response) {
            res.writeHead(response.status, {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            });
            res.end(response.body);
            return;
          }
        }
      });
      outputChannel.appendLine("Start using mock...");
    }),
    vscode.commands.registerCommand("proxyMockerExt.stopUseMock", () => {
      changeMockContext(false);
      proxy.removeAllListeners("proxyReq");
      outputChannel.appendLine("Stop use mocks to replace real called...");
    }),
    vscode.commands.registerCommand("proxyMockerExt.deleteMocks", async () => {
      context.workspaceState.update("requestContent", {});
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
