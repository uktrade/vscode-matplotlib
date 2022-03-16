import * as net from "net";
import * as vscode from "vscode";
import { existsSync, mkdirSync, unlinkSync } from "fs";
import { setFlagsFromString } from "v8";

const XDG_RUNTIME_DIR = process.env.XDG_RUNTIME_DIR;
const PID = process.pid;

interface MessageHandler { (data: any): void }
class MessageBuffer {

    delimiter: string;
    buffer: string;

    constructor(delimiter: string = '\n') {
        this.delimiter = delimiter;
        this.buffer = "";
    }

    isFinished(): boolean {
        if (
            this.buffer.length === 0 ||
            this.buffer.indexOf(this.delimiter) === -1
        ) {
            return true;
        }
        return false;
    }

    push(data: string): void {
        this.buffer += data;
    }

    getMessage(): string | null {
        const delimiterIndex = this.buffer.indexOf(this.delimiter);
        if (delimiterIndex !== -1) {
            const message = this.buffer.slice(0, delimiterIndex);
            this.buffer = this.buffer.replace(message + this.delimiter, "");
            return message;
        }
        return null;
    }

    handleData(): string | null {
        /**
         * Try to accumulate the buffer with messages
         *
         * If the server isnt sending delimiters for some reason
         * then nothing will ever come back for these requests
         */
        const message: string | null = this.getMessage();
        return message;
    }
}


export class IDESideChannelServer {
    received: MessageBuffer = new MessageBuffer("\n");
    server: net.Server;
    socketPath: string;
    messageHandlers: Array<MessageHandler>;

    constructor() {
        const socketPath = getSocketPath();
        this.socketPath = socketPath;
        this.messageHandlers = new Array<MessageHandler>();

        const server = net.createServer((connection: net.Socket) => {
            connection.on('end', () => {
                console.log("client disconnected");
            });
        });

        server.on('connection', (socket: net.Socket) => {
            console.log("got connection!");
            //socket.write("Hello from VSCode");
            //s.end();

            /*
            socket.on('data', (data: Buffer) => {
                console.log("---- got message");
                console.log(data.toString());
            });
            */

            socket
                //.on('data', this.onData)
                .on('data', buffer => {
                    this.received.push(buffer.toString());
                    console.log("-- got data");
                    while (!this.received.isFinished()) {
                      const data: string | null = this.received.handleData();
                      if (data !== null) {
                        let message : any = JSON.parse(data);
                        this._dispatchMessage(message);
                      }
                    }
                })
                .on('error', (error: Error) => {
                    console.log("-- got error");
                    console.log("-- ", error.toString());
                })
                .on('end', () => {
                    console.log("Connection end");
                })

                .on('close', () => {
                    console.log("Connection closed");
                    socket.destroy();
                });
        });

        server.listen(socketPath, () => {
            console.log("now listening on " + socketPath);
        })
            .on('connect', () => {
                console.log("connected!");
            })
            .on('error', (error) => {
                console.log("ouch");
            });

        this.server = server;
    }

    _dispatchMessage(message: any) {
        console.log("Dispatch message to ", this.messageHandlers);
        for (var handler of this.messageHandlers) {
            handler(message);
        }
    }

    on(event: string, callback: MessageHandler): void {
        if (event === 'message') {
            this.messageHandlers.push(callback);
        }
        else {
            throw new Error('Event is not message');
        }
    }

    envVars(): { [key: string]: string } {
        return {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            "MPLBACKEND": "module://matplotlib_imagebackend",
            // eslint-disable-next-line @typescript-eslint/naming-convention
            "MPL_IMAGEBACKEND_FEEDBACK_IO": this.socketPath,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            "MPL_IMAGEBACKEND_FEEDBACK_KEY": "TODO",
            // eslint-disable-next-line @typescript-eslint/naming-convention
            "MPL_IMAGEBACKEND_DIR": "/tmp",
        };
    }

}


function getSocketPath(): string {
    const dir = `${XDG_RUNTIME_DIR}/ide-sidechannel`;
    const socketPath = `${dir}/ide-sidechannel-mpl-${PID}.sock`;

    if (!existsSync(dir)) {
        mkdirSync(dir);
    }
    if (existsSync(socketPath)) {
        unlinkSync(socketPath);
    }
    return socketPath;
}
