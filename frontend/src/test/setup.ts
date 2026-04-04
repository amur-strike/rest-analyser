import '@testing-library/jest-dom';

// Track WebSocket instances
const wsInstances: any[] = [];

// Mock WebSocket
class MockWebSocket {
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onclose: (() => void) | null = null;
  readyState: number = 1; // OPEN

  constructor(url: string) {
    this.url = url;
    wsInstances.push(this);
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }

  send(data: string) {
    // Mock send
  }

  close() {
    if (this.onclose) this.onclose();
  }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
}

// Add mock property to access instances
(MockWebSocket as any).mock = {
  get instances() {
    return wsInstances;
  },
  clearInstances() {
    wsInstances.length = 0;
  },
};

global.WebSocket = MockWebSocket as any;

// Clear instances before each test
beforeEach(() => {
  wsInstances.length = 0;
});
