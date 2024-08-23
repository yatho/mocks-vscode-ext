import vscode from "vscode";

export function openMockDetail(
  uri: string,
  mock: { method: string; status: number; body: string }[]
): void {
  const view = vscode.window.createWebviewPanel(
    "proxyMockerViewDetails",
    uri,
    vscode.ViewColumn.Active
  );

  view.webview.html = getWebviewContent(uri, mock);
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
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f9;
                color: #333;
                margin: 20px;
            }

            h1 {
                color: #2c3e50;
            }

            .mock-container {
                background-color: #fff;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .mock-container p {
                margin: 8px 0;
            }

            pre {
                background-color: #f0f0f0;
                padding: 15px;
                border-radius: 4px;
                overflow-x: auto;
            }

            button {
                background-color: #3498db;
                color: #fff;
                border: none;
                border-radius: 5px;
                padding: 10px 15px;
                cursor: pointer;
                transition: background-color 0.3s ease;
            }

            button:hover {
                background-color: #2980b9;
            }

            hr {
                border: none;
                border-top: 1px solid #ddd;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <h1>${uri}</h1>
        ${mocks.map(
          (mock) => `<div class="mock-container">
              <p><strong>Method type:</strong> ${mock.method}</p>
              <p><strong>Status code:</strong> ${mock.status}</p>
              <p><strong>Response body:</strong></p>
              <pre>${mock.body}</pre>
          </div>`
        )}
    </body>
    </html>
    `;
}
