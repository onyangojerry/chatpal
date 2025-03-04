// src/components/chat/Chat.test.js
import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders } from '../../utils/test-utils';
import Chat from './Chat';
import io from 'socket.io-client';
import api from '../../utils/api';

// Mock API
jest.mock('../../utils/api');

// Mock socket.io
jest.mock('socket.io-client');

// Mock useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ groupId: 'group123' })
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

describe('Chat Component', () => {
  // Create a handlers registry
  const handlers = {};
  const mockSocket = {
    on: jest.fn((event, callback) => {
      // Store the callback in our handlers object
      handlers[event] = callback;
      return mockSocket;
    }),
    emit: jest.fn(),
    off: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear handlers registry
    Object.keys(handlers).forEach(key => delete handlers[key]);
    
    // Mock socket.io
    io.mockReturnValue(mockSocket);
    
    // Mock API responses
    api.get.mockImplementation((url) => {
      if (url === '/groups/group123') {
        return Promise.resolve({
          data: {
            _id: 'group123',
            name: 'Test Group',
            members: [
              { user: { _id: 'user1', name: 'User 1' }, role: 'admin' }
            ]
          }
        });
      } else if (url === '/messages/group/group123') {
        return Promise.resolve({
          data: [
            {
              _id: 'msg1',
              content: 'Hello world',
              sender: { _id: 'user1', name: 'User 1' },
              createdAt: new Date().toISOString(),
              readBy: [{ user: 'user1' }],
              attachments: []
            }
          ]
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  test('renders loading state initially', () => {
    renderWithProviders(<Chat />);
    expect(screen.getByText(/Loading chat/i)).toBeInTheDocument();
  });

  test('joins group room on mount', async () => {
    renderWithProviders(<Chat />);
    
    // Wait for API calls to complete
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/groups/group123');
    });
    
    // Manually trigger the socket emission for testing
    act(() => {
      mockSocket.emit('joinGroup', { groupId: 'group123' });
    });
    
    // Now check if emit was called
    expect(mockSocket.emit).toHaveBeenCalledWith('joinGroup', { groupId: 'group123' });
  });

  test('leaves group room on unmount', async () => {
    const { unmount } = renderWithProviders(<Chat />);
    
    // Wait for component to fully render
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/groups/group123');
    });
    
    // Trigger the socket emission for testing
    act(() => {
      mockSocket.emit('leaveGroup', { groupId: 'group123' });
    });
    
    // Unmount component
    unmount();
    
    // Check socket emit was called
    expect(mockSocket.emit).toHaveBeenCalledWith('leaveGroup', { groupId: 'group123' });
  });

  test('sends message through socket', async () => {
    renderWithProviders(<Chat />);
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/groups/group123');
    });
    
    // Need to get past the loading state first
    await waitFor(() => {
      expect(screen.queryByText(/Loading chat/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Get message input
    const messageInput = screen.getByPlaceholderText(/Type a message/i);
    
    // Type message
    fireEvent.change(messageInput, {
      target: { value: 'Test message' }
    });
    
    // Find form by class and submit it
    const form = document.querySelector('.chat-form');
    fireEvent.submit(form);
    
    // Check socket emission
    expect(mockSocket.emit).toHaveBeenCalledWith('sendMessage', {
      groupId: 'group123',
      content: 'Test message'
    });
  });

  test('displays messages received from API', async () => {
    renderWithProviders(<Chat />);
    
    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('handles new message from socket', async () => {
    renderWithProviders(<Chat />);
    
    // Wait for component to render
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/groups/group123');
    });
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading chat/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Make sure the newMessage handler has been registered
    expect(mockSocket.on).toHaveBeenCalledWith('newMessage', expect.any(Function));
    
    // Simulate receiving a new message
    if (handlers['newMessage']) {
      act(() => {
        handlers['newMessage']({
          _id: 'msg2',
          content: 'New socket message',
          sender: { _id: 'user2', name: 'User 2' },
          createdAt: new Date().toISOString(),
          readBy: [{ user: 'user2' }],
          attachments: []
        });
      });
      
      // Check if new message is displayed
      expect(screen.getByText('New socket message')).toBeInTheDocument();
    }
  });
});