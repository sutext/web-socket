# Socket

-   Wrapped on WebSocket and has implement retry mechanis

## Usage

-   npm i @sutext/socket

## Example

```ts
import { Socket } from "@sutext/socket";

export type MessageType = "Notification" | "Chat" | Socket.Events;
export interface Message {
    readonly from: number;
    readonly to: number;
    readonly content: string;
}
class Messenger extends Socket.Client<MessageType> {
    constructor() {
        super();
        // add custom config here

        this.ping.interval = 30; //default
        this.ping.allow = true; //default
        this.socket.retry.allow = true; //default
        this.socket.retry.chance = 8; //default
        this.socket.retry.delay = 100; //default
        this.socket.binaryType = "arraybuffer"; //default
        this.ping.buildPing = () => {
            return '{"type":"PING"}';
        }; //default

        this.ping.parsePong = (evt: MessageEvent) => {
            if (typeof evt.data !== "string") return false;
            var msg = JSON.parse(evt.data);
            return msg && msg.type == "PONG";
        }; //default
    }
    protected get isLogin(): boolean {
        return true;
    }
    protected buildurl(): string {
        return "wss://xxxx.com";
    }
    protected onMessage(evt: MessageEvent): void {
        if (typeof evt.data !== "string") {
            return;
        }
        const msg = JSON.parse(evt.data);
        if (msg.type == "Chat") {
            this.emit("Chat", msg);
        } else {
            this.emit("message", msg);
        }
    }
    protected onError(res: ErrorEvent): void {
        console.log(res);
        console.log("连接错误");
    }
    protected onClosed(res: CloseEvent, reason: Socket.CloseReason): void {
        console.log(res);
        console.log("关闭原因", reason);
    }
    protected onOpened(res: EventListener, isRetry: boolean): void {
        console.log("连接成功");
    }
}
export const messenger = new Messenger();
messenger.start();
messenger.on("Chat", {}, (message: Message) => {
    console.log(message);
});
```
