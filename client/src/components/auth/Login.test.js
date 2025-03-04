// src/components/auth/Login.test.js
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../utils/test-utils';
import Login from './Login';
import axios from 'axios';

// Mock axios
jest.mock('axios');

describe('Login Component', () => {
  beforeEach(() => {
    // Reset all mocks between tests
    jest.clearAllMocks();
    // Reset localStorage mock
    window.localStorage.getItem.mockReturnValue(null);
  });

  it('renders login form correctly', () => {
    renderWithProviders(<Login />);
    
    expect(screen.getByText(/Login to ChatPal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account/i)).toBeInTheDocument();
    expect(screen.getByText(/Register/i)).toBeInTheDocument();
  });

  it('validates empty form submission', async () => {
    renderWithProviders(<Login />);
    
    // Submit form without entering data
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));
    
    // Check for validation error
    await waitFor(() => {
      expect(screen.getByText(/Please fill in all fields/i)).toBeInTheDocument();
    });
  });

  it('handles form input changes', () => {
    renderWithProviders(<Login />);
    
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    
    // Type in the inputs
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Verify values were updated
    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('submits the form with valid credentials', async () => {
    // Mock successful login response
    axios.post.mockResolvedValueOnce({ data: { token: 'fake-token' } });
    
    renderWithProviders(<Login />);
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText(/Email/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/Password/i), { 
      target: { value: 'password123' } 
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));
    
    // Check that axios.post was called with correct arguments
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
    
    // Check that token was saved to localStorage
    await waitFor(() => {
      expect(window.localStorage.setItem).toHaveBeenCalledWith('token', 'fake-token');
    });
  });

  it('displays error message on failed login', async () => {
    // Mock failed login response
    axios.post.mockRejectedValueOnce({
      response: { data: { msg: 'Invalid credentials' } }
    });
    
    renderWithProviders(<Login />);
    
    // Fill out and submit the form
    fireEvent.change(screen.getByLabelText(/Email/i), { 
      target: { value: 'wrong@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/Password/i), { 
      target: { value: 'wrongpassword' } 
    });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});