// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as commands from './mplCommands';
import { MatplotlibPanel, getWebviewOptions } from "./mplPlotPanel";


/*
export function activate(context: vscode.ExtensionContext) {
	const killCommand = vscode.commands.registerTextEditorCommand(
		'extension.mplInlineKillPythonProcess',
		commands.killPythonProcess);
	context.subscriptions.push(killCommand);

	const showPlotPanel = vscode.commands.registerCommand(
		'extension.mplInlineShowPlots',
		commands.showPlotPanel);

	context.subscriptions.push(showPlotPanel);

}

// this method is called when your extension is deactivated
export function deactivate() {
	commands.killPythonProcess();
}
*/




export function activate(context: vscode.ExtensionContext) {
	console.log("--- activate");
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'mplPlotPanel.open', 
			commands.createOpenPlotPanel(context))
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'mplPlotPanel.clear', 
			commands.createClearPlotPanel(context))
	);

	// Run python code and render plots into panel.
	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand(
			'mplPlotPanel.runActiveDocument', 			
			commands.createRunActiveDocument(context))
	);

	if (vscode.window.registerWebviewPanelSerializer) {
		// Register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(MatplotlibPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				console.log(`Got state: ${state}`);
				// Reset the webview options so we use latest uri for `localResourceRoots`.
				webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
				MatplotlibPanel.revive(webviewPanel, context.extensionUri);
			}
		});
	}
}

export function deactivate() {
	// TODO:  Kill any python processes.
	// TODO:  Clean up any sockets
	// TODO:  Clean up files (?)
	// commands.killPythonProcess();
}