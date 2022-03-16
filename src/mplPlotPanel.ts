import * as vscode from 'vscode';


export interface Plot {
	url: string;
	command: string;
	// TODO generated: Timestamp
}

export let plots: Plot[] = [];

export function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	// TOOD - enable using the /run directory here to share images.
	return {
		// Enable javascript in the webview
		enableScripts: true,

		// Restrict the webview to only loading content from our extension's `media` directory.
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
		//localResourceRoots: [extensionUri]
	};
}

/**
 * Webview Panel to display rendered plots.
 */
export class MatplotlibPanel {
	/**
	 * Track the matplotlib plots open panel. 
	 * Only allow a single panel to exists at a time.
	 */
	public static currentPanel: MatplotlibPanel | undefined;

	public static readonly viewType = 'matplotlibPlots';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (MatplotlibPanel.currentPanel) {
			console.debug("createOrShow reveal existing panel");
			MatplotlibPanel.currentPanel._panel.reveal(column);
			return MatplotlibPanel.currentPanel;
		}

		console.debug("createOrShow create new panel");
		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			MatplotlibPanel.viewType,
			'Matplotlib Visualisations',
			{ viewColumn: column || vscode.ViewColumn.One, preserveFocus: true },
			getWebviewOptions(extensionUri),
		);

		const currentPanel: MatplotlibPanel = new MatplotlibPanel(panel, extensionUri);
		MatplotlibPanel.currentPanel = currentPanel;
		console.debug("createOrShow return new panel");
		return currentPanel;
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		MatplotlibPanel.currentPanel = new MatplotlibPanel(panel, extensionUri);
		return MatplotlibPanel.currentPanel;
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public doAddPlot(url: string, command: { commandline: string, pid: string}) {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		console.debug(`-- doAddPlot url: ${url.substring(0, 32)}... command: ${JSON.stringify(command)}`);
		this._panel.webview.postMessage({
			command: 'addPlot', 'plot': {
				url: url,
				command: command,
			}
		});
		return MatplotlibPanel.currentPanel;
	}

	public doClearPlots() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		console.debug("-- doClearPlots");
		this._panel.webview.postMessage({
			command: 'clearPlots'});
		return MatplotlibPanel.currentPanel;
	}

	public dispose() {
		MatplotlibPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		const webview = this._panel.webview;
		this._panel.webview.html = this._getHtmlForWebview(webview);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		const self: MatplotlibPanel = this;

		function _getMediaUri(pathList: string[]) {
			const mediaPathOnDisk = vscode.Uri.joinPath(self._extensionUri, 'media');
			return vscode.Uri.joinPath(mediaPathOnDisk, ...pathList);
		}

		// Local path to main script run in the webview
		const scriptPathOnDisk = _getMediaUri(['main.js']);

		// And the uri we use to load this script in the webview
		const scriptUri = (scriptPathOnDisk).with({ 'scheme': 'vscode-resource' });

		// TODO add path to /run if images can be read locally.

		// Uri to load images and styles into webview
		const imageLogoUri = webview.asWebviewUri(_getMediaUri(['logo2.svg']));

		const styleResetUri = webview.asWebviewUri(_getMediaUri(['reset.css']));
		const styleVSCodeUri = webview.asWebviewUri(_getMediaUri(['vscode.css']));
		const styleMainUri = webview.asWebviewUri(_getMediaUri(['main.css']));

		// Use a randomly generated secret to only allow specific scripts to be run
		const secret = getSecret();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource}; script-src 'nonce-${secret}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				<title>Matplotlib Visualisations</title>
			</head>
			<body>
				<img src="${imageLogoUri}" width="200" />
				<h1 id="Visualisations"></h1>
                <ul class="plot-list">
				</ul>
				<button class="clear-plots-button">Clear Plots</button>

				<script nonce="${secret}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getSecret() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}