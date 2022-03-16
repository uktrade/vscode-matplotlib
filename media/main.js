//@ts-check

console.log("main.js go...");
// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    const oldState = vscode.getState() || { plots: [] };
    console.log("main.js oldState: ", oldState.plots);

    /* @type {Array<{ url: string, command: { commandline: string[], pid: string }>} */
    let plots = oldState.plots;

    updatePlots(plots);

    document.querySelector('.clear-plots-button').addEventListener('click', () => {
        console.log("Webview: clicked clearPlots");
        clearPlots();
    });

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        console.log("Webview got a message", event);
        const message = event.data; // The json data that the extension sent
        switch (message.command) {
            case 'addPlot':
                {
                    addPlot(message.plot);
                    break;
                }
            case 'clearPlots':
                {
                    clearPlots();
                    break;
                }
            default:
                console.error("Webview - event listener Unsupported message ", message);

        }
    });

    function clearPlots() {
        console.log("Webview - clearPlots");
        plots = [];
        updatePlots(plots);
    };

    /**
     * @param {Array<{ url: string, command: { commandline: string[], pid: string } }>} plots
     */
    function updatePlots(plots) {
        console.log("Webview - updatePlots ", plots);
        const ul = document.querySelector('.plot-list');
        ul.textContent = '';
        for (const plot of plots) {
            var command = plot.command;
            const li = document.createElement('li');
            li.className = 'plot-entry';

            var info = document.createElement('div');
            info.className = 'plot-info';
            info.innerText = `${command.commandline.toString()} PID: ${command.pid}`;
    
            var img = document.createElement('img');
            img.src = plot.url;

            li.appendChild(info);
            li.appendChild(img);

            ul.appendChild(li);
        }

        // Update the saved state
        vscode.setState({ plots: plots });
    }

    /** 
     * @param {string} command 
     */
    function onRefreshSelected(command) {
        console.log("Webview - refreshSelected");
        vscode.postMessage({ type: 'reRunCommand', value: command });
    }

    function addPlot(plot) {
        console.log("Webview - addPlot ", plot);
        plots.push(plot);
        updatePlots(plots);
    }
}());


