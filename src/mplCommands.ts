"use strict";

// derived from vscode-csound MIT.

import * as child_process from "child_process";
import * as path from "path";
import * as vscode from "vscode";
import { IDESideChannelServer } from "./ideSideChannel";
import * as net from "net";
import { url } from "inspector";

import { MatplotlibPanel, plots } from "./mplPlotPanel";


let output: vscode.OutputChannel;
const processMap: { [pid: number]: child_process.ChildProcess | undefined } = {};
const ideSideChannel = new IDESideChannelServer();


export function createOpenPlotPanel(context: vscode.ExtensionContext) {
    return async function openPlotPanel(textEditor: vscode.TextEditor) {
        console.log("-- Open the plot planel");
        MatplotlibPanel.createOrShow(context.extensionUri);
    };
}

export function createClearPlotPanel(context: vscode.ExtensionContext) {
    return async function clearPlotPanel(textEditor: vscode.TextEditor) {
        console.log("-- Clear the plot planel");
        MatplotlibPanel.createOrShow(context.extensionUri).doClearPlots();
    };
}

export function createRunActiveDocument(context: vscode.ExtensionContext) {
    return async function runActiveDocument(textEditor: vscode.TextEditor) {
        console.debug("runActiveDocument", textEditor.document);
        const config = vscode.workspace.getConfiguration("matplotlib-panel");
        const document = textEditor.document;

        if (document.languageId !== "python") {
            return;
        }

        ideSideChannel.on('message', (message: any) => {
            //let data: string = buffer.toString();
            var panel = MatplotlibPanel.createOrShow(context.extensionUri);
            console.log("ideSideChannel onData", plots);
            try {
                // const message = JSON.parse(data);
                if (message.dialect === "ide_sidechannel" && message.type === "image") {

                    panel.doAddPlot(message.image.url, message.command);

                    console.log(`-- posted Message to panel ${message.image.url.substring(0, 32)}...`);
                }
                else {
                    console.error("ideSideChannel recieved unexpected message ", message);
                    // TODO clean up / disconnect
                }
            } catch (e: any) {
                console.error("ideSideChannel recieved non JSON data", e);
                // TODO clean up / disconnect
            }
        });

        console.log("go!");
        if (document.isDirty) {
            if (!config.get("saveSilentlyOnRun")) {
                const selection = await saveToRunDialog();
                if (selection === "Cancel") {
                    return;
                }
            }
            await document.save();
        }
        if (output === undefined) {
            output = vscode.window.createOutputChannel("Matplotlib output");
        }

        // TODO - change this from here.
        const command = config.get("executable", "python3");
        // We need to clone the args array because if we don't, when we push the filename on, it
        // will actually go into the config in memory, and be in the args of our next syntax check.
        const args: string[] = [...config.get("interpreterArgs", [])];

        const cwd = path.dirname(document.fileName);
        args.push(path.relative(cwd, document.fileName));
        const options = {
            cwd: cwd,
            env: ideSideChannel.envVars(),
        };

        output.clear();
        output.show(true); // true means keep focus in the editor window

        output.append(`${cwd}\n`);
        output.append(`${command} ${args}\n`);
        const process = child_process.spawn(command, args, options);

        processMap[process.pid] = process;

        process.stdout.on("data", (data) => {
            // I've seen spurious 'ANSI reset color' sequences in some csound output
            // which doesn't render correctly in this context. Stripping that out here.
            output.append(data.toString().replace(/\x1b\[m/g, ""));
        });
        process.stderr.on("data", (data) => {
            // It looks like all csound output is written to stderr, actually.
            // If you want your changes to show up, change this one.
            output.append(data.toString().replace(/\x1b\[m/g, ""));
        });
        if (process.pid) {
            console.log("Python is running (pid " + process.pid + ")");
        }
    };
}

async function saveToRunDialog(): Promise<string> {
    const selected = await vscode.window
        .showInformationMessage<vscode.MessageItem>(
            "Save file for Python to run?",
            { modal: true },
            { title: "Cancel", isCloseAffordance: true },
            { title: "Save", isCloseAffordance: false },
            {
                title: "Always silently save before running",
                isCloseAffordance: false,
            }
        )

        .then((selected) => {
            if (selected) {
                if (selected.title === "Always silently save before running") {
                    setsaveSilentlyOnRun();
                    return "Save";
                } else {
                    return selected.title;
                }
            } else {
                return "Cancel";
            }
        });
    return selected || "Cancel";
}

async function setsaveSilentlyOnRun() {
    const config = vscode.workspace.getConfiguration("matplotlib-panel");
    config.update("saveSilentlyOnRun", "true", true);
}

export function killPythonProcess() {
    for (let pid in processMap) {
        let p = processMap[pid];
        if (p === undefined) {
            delete processMap[pid];
        } else {
            console.log("Killing Python process (pid " + p.pid + ")");
            p.kill("SIGTERM");
            console.log("Python subprocess terminated");
        }
    }
}
