Object.defineProperty(exports, "__esModule", { value: true });
var Emitter = require("@sutext/emitter").default;
var __extends =
    globalThis.__extends ||
    (function () {
        var extendStatics = function (d, b) {
            extendStatics =
                Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array &&
                    function (d, b) {
                        d.__proto__ = b;
                    }) ||
                function (d, b) {
                    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
                };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() {
                this.constructor = d;
            }
            d.prototype =
                b === null
                    ? Object.create(b)
                    : ((__.prototype = b.prototype), new __());
        };
    })();
globalThis.__extends = __extends;
var Socket = (function () {
    function Socket(builder, protocols) {
        var _this = this;
        this._retrying = false;
        this.retryable = false;
        this.binaryType = "arraybuffer";
        this.buildurl = builder;
        this.protocols = protocols;
        this.retry = new Socket.Retry(
            this.onRetryCallback.bind(this),
            this.onRetryFailed.bind(this)
        );
        this.open = function () {
            if (
                _this.readyState === Socket.CONNECTING ||
                _this.readyState === Socket.OPEN ||
                typeof _this.buildurl !== "function"
            ) {
                return;
            }
            if (_this.ws) {
                _this.ws.onopen = undefined;
                _this.ws.onclose = undefined;
                _this.ws.onerror = undefined;
                _this.ws.onmessage = undefined;
            }
            _this.ws = new WebSocket(_this.buildurl(), _this.protocols);
            _this.ws.onclose = _this.onCloseCallback.bind(_this);
            _this.ws.onerror = _this.onErrorCallback.bind(_this);
            _this.ws.onmessage = _this.onMessageCallback.bind(_this);
            _this.ws.onopen = _this.onOpenCallback.bind(_this);
            _this.ws.binaryType = _this.binaryType;
        };
        this.close = function (code, reason) {
            if (!_this.ws) return;
            if (
                _this.ws.readyState === Socket.CLOSED ||
                _this.ws.readyState === Socket.CLOSING
            )
                return;
            _this.ws.close(code, reason);
        };
        this.send = function (data) {
            _this.ws && _this.ws.send(data);
        };
    }
    Socket.prototype.onRetryCallback = function () {
        this.open();
        this._retrying = true;
    };
    Socket.prototype.onRetryFailed = function (e) {
        this._retrying = false;
        if (typeof this.onclose === "function") {
            this.onclose(e, "retry");
        }
    };
    Socket.prototype.onOpenCallback = function (e) {
        if (typeof this.onopen === "function") {
            this.onopen.call(null, e, this._retrying);
        }
        this._retrying = false;
    };
    Socket.prototype.onCloseCallback = function (e) {
        if (this.retryable && e.code < 3000) {
            this.retry.attempt(e);
        } else if (typeof this.onclose === "function") {
            this._retrying = false;
            var reason = "server";
            if (e.reason === "ping" || e.reason === "user") {
                reason = e.reason;
            }
            this.onclose(e, reason);
        }
    };
    Socket.prototype.onErrorCallback = function () {
        if (typeof this.onerror === "function") {
            this.onerror.apply(null, arguments);
        }
    };
    Socket.prototype.onMessageCallback = function () {
        if (typeof this.onmessage === "function") {
            this.onmessage.apply(null, arguments);
        }
    };
    Object.defineProperty(Socket.prototype, "isRetrying", {
        get: function () {
            return this._retrying;
        },
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(Socket.prototype, "protocol", {
        get: function () {
            return this.ws && this.ws.protocol;
        },
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(Socket.prototype, "extensions", {
        get: function () {
            return this.ws && this.ws.extensions;
        },
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(Socket.prototype, "readyState", {
        get: function () {
            return (this.ws && this.ws.readyState) || WebSocket.CLOSED;
        },
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(Socket.prototype, "bufferedAmount", {
        get: function () {
            return this.ws && this.ws.bufferedAmount;
        },
        enumerable: true,
        configurable: true,
    });
    return Socket;
})();
(function (Socket) {
    Socket.OPEN = WebSocket.OPEN;
    Socket.CLOSED = WebSocket.CLOSED;
    Socket.CLOSING = WebSocket.CLOSING;
    Socket.CONNECTING = WebSocket.CONNECTING;
    var Retry = /** @class */ (function () {
        function Retry(attempt, failed) {
            var _this = this;
            this.delay = 100;
            this.chance = 8;
            this.count = 0;
            this.allow = true;
            this.reset = function () {
                _this.count = 0;
            };
            this.attempt = function (evt) {
                if (this.allow && _this.count < _this.chance) {
                    setTimeout(function () {
                        return _this.onAttempt(evt);
                    }, _this.random(_this.count++, _this.delay));
                } else {
                    _this.onFailed(evt);
                }
            };
            this.onAttempt = attempt;
            this.onFailed = failed;
        }
        Retry.prototype.random = function (attempt, delay) {
            return Math.floor(
                (0.5 + Math.random() * 0.5) * Math.pow(2, attempt) * delay
            );
        };
        return Retry;
    })();
    Socket.Retry = Retry;
    var Ping = (function () {
        function Ping(socket) {
            var _this = this;
            this.allow = true;
            this.timer = null;
            this.timeout = null;
            this.interval = 30;
            this.socket = socket;
            this.send = function () {
                if (_this.timeout) return;
                if (_this.socket.readyState !== Socket.OPEN) return;
                _this.socket.send(_this.buildPing());
                _this.timeout = setTimeout(function () {
                    console.warn("PING timeout");
                    _this.timeout = null;
                    _this.socket.close(1000, "ping");
                }, 3 * 1000);
            };
            this.receive = function (evt) {
                if (_this.parsePong(evt)) {
                    if (_this.timeout) {
                        clearTimeout(_this.timeout);
                        _this.timeout = null;
                    }
                    return true;
                }
                return false;
            };
            this.start = function () {
                if (!_this.allow || _this.timer) return;
                _this.timer = setInterval(
                    _this.send.bind(_this),
                    _this.interval * 1000
                );
            };
            this.stop = function () {
                if (!_this.timer) return;
                clearInterval(_this.timer);
                _this.timer = null;
            };
        }
        return Ping;
    })();
    var Client = /** @class */ (function (_super) {
        __extends(Client, _super);
        function Client() {
            var _this =
                (_super !== null && _super.apply(this, arguments)) || this;
            _this.buildPing = function () {
                return '{"type":"PING"}';
            };
            _this.parsePong = function (evt) {
                if (typeof evt.data !== "string") return false;
                var msg = JSON.parse(evt.data);
                return msg && msg.type == "PONG";
            };
            _this.stop = function () {
                if (
                    _this.socket.readyState === Socket.CLOSED ||
                    _this.socket.readyState === Socket.CLOSING
                ) {
                    return;
                }
                _this.socket.retryable = false;
                _this.socket.close(1000, "user");
                _this.ping.stop();
            };
            _this.start = function () {
                if (
                    !_this.isLogin ||
                    _this.socket.isRetrying ||
                    _this.socket.readyState === Socket.OPEN ||
                    _this.socket.readyState === Socket.CONNECTING
                ) {
                    return;
                }
                _this.socket.retry.reset();
                _this.socket.retryable = true;
                _this.socket.open();
                _this.ping.start();
            };
            _this.socket = new Socket(function () {
                return _this.buildurl();
            });
            _this.ping = new Ping(_this.socket);
            _this.socket.onopen = function (evt, isRetry) {
                _this.onOpened(evt, isRetry);
            };
            _this.socket.onerror = function (evt) {
                _this.onError(evt);
            };
            _this.socket.onmessage = function (evt) {
                if (!_this.ping.receive(evt)) {
                    _this.onMessage(evt);
                }
            };
            _this.socket.onclose = function (evt, reason) {
                _this.ping.stop();
                _this.onClosed(evt, reason);
            };
        }
        Client.prototype.onError = function (res) {};
        Client.prototype.onOpened = function (res, isRetry) {};
        Client.prototype.onClosed = function (res) {};
        Client.prototype.onMessage = function (msg) {};
        Object.defineProperty(Client.prototype, "isConnected", {
            get: function () {
                return this.socket.readyState === Socket.OPEN;
            },
            enumerable: true,
            configurable: true,
        });
        return Client;
    })(Emitter);
    Socket.Client = Client;
})(Socket);
module.exports.default = Socket;
