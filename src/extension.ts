// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-matplotlib" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('vscode-matplotlib.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from vscode-matplotlib!');

		const panel = vscode.window.createWebviewPanel(
			'catCoding',
			'Cat Coding',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
			}
		  );

		  // And set its HTML content
		  panel.webview.html = getWebviewContent();
		  function getWebviewContent() {
			return `<!DOCTYPE html>
		  <html lang="en">
		  <head>
			  <meta charset="UTF-8">
			  <meta name="viewport" content="width=device-width, initial-scale=1.0">
			  <title>Cat Coding</title>
			  <script type="text/javascript">alert(1)</script>
		  </head>
		  <body>
			  <h1>Hello, world!</h1>
			  <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" width="300" />
		  </body>
		  </html>`;
		  }

		// json rpc plugin -> investigated

		// socket newline delimited json
		// theia -> server
		// matplotlib -> client

		// code -> edit file
		// client -> data (multiple files) -> server data -> render

		// command
		// code -> edit -> run command
		// client (js) -> server (py)

	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
