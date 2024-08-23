import vscode from "vscode";

export class ProxyMockerViewProvider
  implements vscode.TreeDataProvider<RequestMock>
{
  constructor(private context: vscode.ExtensionContext) {}

  private _onDidChangeTreeData: vscode.EventEmitter<RequestMock | undefined> =
    new vscode.EventEmitter<RequestMock | undefined>();
  readonly onDidChangeTreeData: vscode.Event<RequestMock | undefined> =
    this._onDidChangeTreeData.event;

  getTreeItem(element: RequestMock): vscode.TreeItem {
    return element;
  }

  getChildren(element?: RequestMock): Thenable<RequestMock[]> {
    return Promise.resolve(getMocks(this.context));
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}

export class RequestMock extends vscode.TreeItem {
  constructor(public readonly label: string) {
    super(label);
  }
}

function getMocks(context: vscode.ExtensionContext): RequestMock[] {
  const requestContent = context.workspaceState.get("requestContent", {});
  return Object.keys(requestContent)
    .map((key) => ({
      label: key,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
