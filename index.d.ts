import Emitter from "@sutext/emitter";
/** @description Wrapped on WebSocket and has implement retry mechanis */
declare class Socket {
    binaryType: "arraybuffer" | "blob"; /** @default 'arraybuffer' */
    readonly retry: Socket.Retry; /** @description retry settings */
    readonly send: (data: string | ArrayBuffer | Blob) => void;
    readonly open: () => void;
    readonly close: (code?: number, reason?: string) => void;
    readonly isRetrying: boolean;
    readonly protocol: string;
    readonly extensions: string;
    readonly readyState: number;
    readonly bufferedAmount: number;
    onopen: (evt: Event, isRetry: boolean) => void;
    onclose: (evt: CloseEvent, reason: Socket.CloseReason) => void;
    onerror: (evt: ErrorEvent) => void;
    onmessage: (evt: MessageEvent) => void;
    constructor(builder: () => string, protocols?: string | string[]);
}
declare namespace Socket {
    const OPEN: number;
    const CLOSED: number;
    const CLOSING: number;
    const CONNECTING: number;
    type CloseReason = "user" | "ping" | "retry" | "server";
    type Events = "open" | "error" | "close" | "message";
    type Status = "closed" | "closing" | "opened" | "opening";
    /** @description A retry machine for web socket  */
    interface Retry {
        /**
         * @description base attempt delay time @default 100 milliscond
         * @description the real delay time use a exponential random algorithm
         */
        delay: number;
        /** @description allow ping pong mechanism or not. @default true */
        allow: boolean;
        /** @description the max retry times when retrying @default 8 */
        chance: number;
    }
    interface Ping {
        /**
         * @description allow ping pong mechanism or not.
         * @default true
         * @warn It doesn't work affter socket has been started.
         */
        allow: boolean;
        /**
         * @description the time interval of ping
         * @default 30s
         * @notice It doesn't work affter socket has been started.
         */
        interval: number;
        /**
         * @description build the ping data for ping pong
         * @note you can reset this function for custom
         * @default return '{"type":"PING"}'
         */
        buildPing: () => string;
        /**
         * @description parse pong data for ping pong.
         * @returns if msg is pong retrun true othewise return false
         * @default parse 'evt.data = {"type":"PONG"}'
         */
        parsePong: (evt: MessageEvent) => boolean;
    }
    /**
     * @description socket client wrapped on Socket
     * @description you must inherit this class to implements your logic
     * @implements client PING heartbeat mechanis
     * @implements client reconnect  mechanis
     * @notice by defualt the client never emit any event. you must emit it at override point yourself.
     */
    abstract class Client<E extends string = Events> extends Emitter<E> {
        /**
         * @description the client ping mechanis
         * @ping use socket.send("{\"type\":\"PING\"}")
         * @pong receive message = "{\"type\":\"PONG\"}"
         * @note the server must send the specified @pong  when recived @ping otherwhis please close the ping
         */
        protected readonly ping: Ping;
        /** the realy websocket handler */
        protected readonly socket: Socket;
        /** Tell me your login status if not no retry */
        protected abstract get isLogin(): boolean;
        /** @overwrite this method to provide url for web socket */
        protected abstract buildurl(): string;
        /** call when get some message @override point*/
        protected abstract onMessage(msg: MessageEvent): void;
        /** call when some error occur @override point */
        protected onError(res: ErrorEvent): void;
        /** call when socket opened @override point */
        protected onOpened(res: any, isRetry: boolean): void;
        /** call when socket closed @override point */
        protected onClosed(res: CloseEvent, reason: CloseReason): void;
        readonly isConnected: boolean; /** the connection status */
        readonly stop: () => void; /** disconnect and stop ping pong retry */
        readonly start: () => void; /** connect the server and start ping pong retry */
    }
}
export default Socket;
