// src/context/socket/SocketState.test.js
import React from 'react';
import { render, act } from '@testing-library/react';
import { SocketProvider } from './SocketState';
import SocketContext from './SocketContext';
import AuthContext from '../auth/AuthContext';  // Import directly
import io from 'socket.io-client';

// Mock socket.io client
jest.mock('socket.io-client');

// No need to mock AuthContext - we'll provide a value directly

describe('SocketState Provider', () => {
  let socketContextData;
  
  // Create a handlers object to store callbacks
  const handlers = {};
  
  const mockSocket = {
    on: jest.fn((event, callback) => {
      // Store the callback in our handlers object
      handlers[event] = callback;
      return mockSocket;
    }),
    emit: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear handlers registry
    Object.keys(handlers).forEach(key => delete handlers[key]);
    
    // Mock socket.io
    io.mockReturnValue(mockSocket);
    
    // Render with a real AuthContext.Provider and a mock value
    render(
      <AuthContext.Provider value={{ 
        isAuthenticated: true, 
        token: 'test-token',
        user: { id: 'user1', name: 'Test User' },
        loading: false,
        error: null 
      }}>
        <SocketProvider>
          <SocketContext.Consumer>
            {(context) => {
              socketContextData = context;
              return <div>Test Component</div>;
            }}
          </SocketContext.Consumer>
        </SocketProvider>
      </AuthContext.Provider>
    );
  });

  test('initializes with null socket and connected false', () => {
    expect(socketContextData.socket).toBeNull();
    expect(socketContextData.connected).toBe(false);
  });

  test('connects socket when authenticated', () => {
    expect(io).toHaveBeenCalled();
    
    // Simulate socket connection
    act(() => {
      // Use our handlers object to access the connect callback
      const connectHandler = handlers['connect'];
      if (connectHandler) connectHandler();
    });
    
    // Check socket is now connected
    expect(socketContextData.socket).not.toBeNull();
    expect(socketContextData.connected).toBe(true);
  });

  test('disconnects socket on unmount', () => {
    // Re-render without the provider
    render(<div>No provider</div>);
    
    // Check disconnect was called
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});