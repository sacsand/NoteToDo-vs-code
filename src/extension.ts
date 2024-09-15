

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
import * as vscode from 'vscode';
import { TodoPanel } from './view/todoPanel';

export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "todolist" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('todolist.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from TodoList!');
	});

	// Register a command to show the TodoPanel
	let disposablePanel = vscode.commands.registerCommand('extension.showTodoPanel', () => {
		const extensionUri = context.extensionUri; // Get the extension URI
		TodoPanel.createOrShow(); // Pass the extension URI
	});

	
	context.subscriptions.push(disposable);
	context.subscriptions.push(disposablePanel);
}

// This method is called when your extension is deactivated
export function deactivate() {}
