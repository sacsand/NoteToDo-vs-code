import * as vscode from 'vscode';
import { TodoPanel } from './view/todoPanel';

// Create a basic TreeItem for our view
class TodoTreeItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly command?: vscode.Command
	) {
		super(label);
	}
}

// Create a TreeDataProvider for the view
class TodoTreeDataProvider implements vscode.TreeDataProvider<TodoTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<TodoTreeItem | undefined | void> = new vscode.EventEmitter<TodoTreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<TodoTreeItem | undefined | void> = this._onDidChangeTreeData.event;

	getTreeItem(element: TodoTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(): TodoTreeItem[] {
		return [
			new TodoTreeItem('Open To-Do & Markdown Panel', {
				command: 'extension.showTodoPanel',
				title: 'Open To-Do & Markdown Panel'
			})
		];
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}
}

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "todolist" is now active!');

	// Register command to show the TodoPanel
	const disposablePanel = vscode.commands.registerCommand('extension.showTodoPanel', () => {
		TodoPanel.createOrShow(context);
	});

	// Register the TreeDataProvider for the custom sidebar view
	const todoTreeDataProvider = new TodoTreeDataProvider();
	vscode.window.registerTreeDataProvider('todoView', todoTreeDataProvider);

	context.subscriptions.push(disposablePanel);
}

// This method is called when your extension is deactivated
export function deactivate() {}