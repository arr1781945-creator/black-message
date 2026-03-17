/**
 * frontend/utils/websocket_manager.js
 * Authenticated WebSocket manager with auto-reconnect,
 * heartbeat, message queuing, and exponential backoff.
 */

export class WebSocketManager {
  constructor(url, accessToken, handlers = {}) {
    this.url = url;
    this.accessToken = accessToken;
    this.handlers = handlers;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 8;
    this.reconnectDelay = 1000;     // ms, doubles each attempt
    this.heartbeatInterval = null;
    this.messageQueue = [];         // queued messages while disconnected
    this.isConnecting = false;
    this.isIntentionalClose = false;
  }

  connect() {
    if (this.isConnecting) return;
    this.isConnecting = true;
    this.isIntentionalClose = false;

    // Append token as query param (WS headers not supported by all browsers)
    const wsUrl = `${this.url}?token=${encodeURIComponent(this.accessToken)}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this._startHeartbeat();
      this._flushQueue();
      this.handlers.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); }
      catch (_) { return; }
      this._dispatch(data);
    };

    this.ws.onerror = (err) => {
      this.handlers.onError?.(err);
    };

    this.ws.onclose = (event) => {
      this.isConnecting = false;
      this._stopHeartbeat();
      if (!this.isIntentionalClose) {
        this._scheduleReconnect();
      }
      this.handlers.onDisconnect?.(event.code);
    };
  }

  disconnect() {
    this.isIntentionalClose = true;
    this._stopHeartbeat();
    this.ws?.close(1000, 'Client initiated close');
    this.ws = null;
    this.messageQueue = [];
  }

  send(payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      // Queue messages sent while disconnected
      if (this.messageQueue.length < 50) {
        this.messageQueue.push(payload);
      }
    }
  }

  // ─── Private ─────────────────────────────────────────────────

  _dispatch(data) {
    switch (data.type) {
      case 'message':       this.handlers.onMessage?.(data); break;
      case 'typing':        this.handlers.onTyping?.(data); break;
      case 'presence':      this.handlers.onPresence?.(data); break;
      case 'reaction':      this.handlers.onReaction?.(data); break;
      case 'error':         this.handlers.onError?.(new Error(data.detail)); break;
      case 'pong':          break; // Heartbeat response
      default:              this.handlers.onUnknown?.(data);
    }
  }

  _startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25_000); // Every 25s
  }

  _stopHeartbeat() {
    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
  }

  _flushQueue() {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      this.ws.send(JSON.stringify(msg));
    }
  }

  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.handlers.onError?.(new Error('Max reconnection attempts reached.'));
      return;
    }
    const delay = Math.min(this.reconnectDelay * (2 ** this.reconnectAttempts), 30_000);
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), delay);
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
