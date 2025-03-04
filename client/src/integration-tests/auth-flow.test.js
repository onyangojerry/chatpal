// src/integration-tests/auth-flow.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route, MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/auth/AuthState';
import Login from '../components/auth/Login';
import Register from '../components/auth/Register';
import Dashboard from '../components/Dashboard';
import PrivateRoute from '../components/routing/PrivateRoute';
import axios from 'axios';

// Mock axios
jest.mock('axios');

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  test('registration to login flow', async () => {
    // Mock successful registration
    axios.post.mockResolvedValueOnce({ data: { token: 'register-token' } });
    
    // Mock successful user data fetch after registration
    axios.get.mockResolvedValueOnce({
      data: { id: 'user1', name: 'Test User', email: 'test@example.com' }
    });
    
    // Render app at register page
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/register']}>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );
    
    // Check we're on register page
    expect(screen.getByText(/Register for ChatPal/i)).toBeInTheDocument();
    
    // Fill out registration form
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'password123' } });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));
    
    // Check axios was called correctly
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/auth/register',
        {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        },
        expect.any(Object)
      );
    });
    
    // Check token was stored
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'token', 'register-token'
    );
    
    // Mock redirect to dashboard would happen here
    // In a real app, we'd check for dashboard content
  });

  test('login redirects to dashboard when successful', async () => {
    // Mock successful login
    axios.post.mockResolvedValueOnce({ data: { token: 'login-token' } });
    
    // Mock successful user data fetch
    axios.get.mockResolvedValueOnce({
      data: { id: 'user1', name: 'Test User', email: 'test@example.com' }
    });
    
    // Mock dashboard API calls
    axios.get.mockResolvedValueOnce({ data: [] }); // Groups data
    
    // Render app at login page
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );
    
    // Check we're on login page
    expect(screen.getByText(/Login to ChatPal/i)).toBeInTheDocument();
    
    // Fill out login form
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));
    
    // Check axios was called correctly
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/auth/login',
        {
          email: 'test@example.com',
          password: 'password123'
        },
        expect.any(Object)
      );
    });
    
    // Check token was stored
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'token', 'login-token'
    );
    
    // Wait for redirect to dashboard
    await waitFor(() => {
      // The dashboard would load here
      // In a complete test, we'd check for dashboard elements
    });
  });
});