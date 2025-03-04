// src/setupTests.js
import '@testing-library/jest-dom';

// Mock scrollIntoView which isn't implemented in JSDOM
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
}

// Mock for socket.io-client
jest.mock('socket.io-client', () => {
  const socket = {
    on: jest.fn(),
    emit: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn()
  };
  return jest.fn(() => socket);
});

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  writable: true
});

// Silence React 18 console errors for testing environment
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      /Warning: ReactDOM.render is no longer supported in React 18./.test(args[0]) ||
      /Warning: The current testing environment is not configured to support act/.test(args[0]) ||
      /Warning: An update to .* inside a test was not wrapped in act/.test(args[0])
    ) {
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});