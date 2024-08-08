import vscode from "vscode";

export class RequestMockDetail {
  openMockDetail(
    uri: string,
    mock: { method: string; status: number; body: string }[]
  ) {
    const view = vscode.window.createWebviewPanel(
      "requestInterceptMockingViewDetails",
      uri,
      vscode.ViewColumn.Active,
      {}
    );

    view.webview.html = getWebviewContent(uri, mock);
  }
}

function getWebviewContent(
  uri: string,
  mocks: { method: string; status: number; body: string }[]
) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${uri}</title>
    </head>
    <body>
        <h1>${uri}</h1>
        ${mocks.map(
          (mock) => `<p>Method type : ${mock.method}</p>
              <p>Status code : ${mock.status}</p>
              <p>Response body:</p>
              <pre>${mock.body}</pre>
              <hr>`
        )}
    </body>
    </html>
    `;
}
