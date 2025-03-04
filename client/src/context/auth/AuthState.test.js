// src/context/auth/AuthState.test.js
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthState';
import AuthContext from './AuthContext';
import axios from 'axios';

// Mock axios
jest.mock('axios');

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('AuthState Provider', () => {
  let contextData;
  const getContextData = () => contextData;
  
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  const renderAuthProvider = () => {
    render(
      <AuthProvider>
        <AuthContext.Consumer>
          {(context) => {
            contextData = context;
            return <div>Test Component</div>;
          }}
        </AuthContext.Consumer>
      </AuthProvider>
    );
    return getContextData;
  };

  test('provides initial state', () => {
    renderAuthProvider();
    
    expect(contextData.isAuthenticated).toBeNull();
    expect(contextData.loading).toBe(true);
    expect(contextData.user).toBeNull();
    expect(contextData.error).toBeNull();
  });

  test('login action updates state on success', async () => {
    // Mock token in localStorage
    localStorageMock.getItem.mockReturnValue('test-token');
    
    // Mock successful login response
    axios.post.mockResolvedValueOnce({ data: { token: 'test-token' } });
    
    // Mock successful user data fetch
    axios.get.mockResolvedValueOnce({
      data: { id: 'test-id', name: 'Test User', email: 'test@example.com' }
    });
    
    const getData = renderAuthProvider();
    
    // Call login action
    await act(async () => {
      await contextData.login({ email: 'test@example.com', password: 'password123' });
    });
    
    // Get updated context data
    const updatedData = getData();
    
    // Check state was updated
    expect(updatedData.isAuthenticated).toBe(true);
    expect(updatedData.loading).toBe(false);
    expect(updatedData.user).toEqual({
      id: 'test-id',
      name: 'Test User',
      email: 'test@example.com'
    });
  });

  test('login action handles error', async () => {
    // Mock login error
    axios.post.mockRejectedValueOnce({
      response: { data: { msg: 'Invalid credentials' } }
    });
    
    const getData = renderAuthProvider();
    
    // Call login action
    await act(async () => {
      await contextData.login({ email: 'wrong@example.com', password: 'wrongpassword' });
    });
    
    // Get updated context data
    const updatedData = getData();
    
    // Check error state
    expect(updatedData.error).toBe('Invalid credentials');
    expect(updatedData.isAuthenticated).toBeNull();
    expect(updatedData.loading).toBe(false);
  });

  test('logout action clears state', async () => {
    // Setup authenticated state first
    localStorageMock.getItem.mockReturnValue('test-token');
    axios.get.mockResolvedValueOnce({
      data: { id: 'test-id', name: 'Test User', email: 'test@example.com' }
    });
    
    const getData = renderAuthProvider();
    
    // Wait for initial load to complete
    await waitFor(() => {
      expect(getData().loading).toBe(false);
    });
    
    // Call logout
    act(() => {
      contextData.logout();
    });
    
    // Get updated context data
    const updatedData = getData();
    
    // Check state was cleared
    expect(updatedData.isAuthenticated).toBe(false);
    expect(updatedData.user).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
  });
});