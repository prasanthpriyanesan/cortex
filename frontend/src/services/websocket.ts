const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/stocks';

export class StockWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect();
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }

  subscribe(symbols: string[]) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        symbols: symbols,
      }));
    }
  }

  unsubscribe(symbols: string[]) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'unsubscribe',
        symbols: symbols,
      }));
    }
  }

  onQuoteUpdate(callback: (data: any) => void) {
    const callbacks = this.subscribers.get('quote_update') || new Set();
    callbacks.add(callback);
    this.subscribers.set('quote_update', callbacks);

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
    };
  }

  private handleMessage(message: any) {
    const { type, data } = message;

    const callbacks = this.subscribers.get(type);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }
}

export const stockWebSocket = new StockWebSocket();
