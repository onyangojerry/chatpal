// src/utils/test-utils.js
import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuthContext from '../context/auth/AuthContext';
import { SocketProvider } from '../context/socket/SocketState';

// Custom renderer for components that need auth and/or socket context
export const renderWithProviders = (ui, options = {}) => {
  // Create a mock auth context with all required properties
  const mockAuthContext = {
    isAuthenticated: true,
    token: 'test-token',
    user: { id: 'user1', name: 'Test User' },
    loading: false,
    error: null,
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    clearErrors: jest.fn(),
    loadUser: jest.fn()
  };

  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <SocketProvider>
        <BrowserRouter>
          {ui}
        </BrowserRouter>
      </SocketProvider>
    </AuthContext.Provider>,
    options
  );
};

// Mock for API calls
export const mockApiResponse = (data) => {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {}
  };
};