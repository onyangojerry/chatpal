// src/utils/api.test.js
import axios from 'axios';
import api from './api';

// Declare these variables BEFORE they're used
let mockRequestInterceptor;
let mockResponseInterceptor;

// Mock the localStorage
beforeEach(() => {
  // Set up localStorage mock
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  };
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });
});

// Mock axios (but we'll use the real api module)
jest.mock('axios', () => {
  return {
    create: jest.fn(() => ({
      interceptors: {
        request: {
          use: jest.fn((fulfilled) => {
            // Store the fulfilled function for testing
            mockRequestInterceptor = fulfilled;
          })
        },
        response: {
          use: jest.fn((fulfilled, rejected) => {
            // Store the rejected function for testing
            mockResponseInterceptor = rejected;
          })
        }
      },
      defaults: {
        headers: {
          common: {}
        }
      }
    }))
  };
});

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.getItem.mockClear();
    window.localStorage.setItem.mockClear();
    window.localStorage.removeItem.mockClear();
  });
  
  test('adds auth token to request if available', () => {
    // Setup localStorage to return a token
    window.localStorage.getItem.mockReturnValue('test-token');
    
    // Create a request config
    const config = { headers: {} };
    
    // Call the interceptor directly
    const result = mockRequestInterceptor(config);
    
    // Check the token was added
    expect(result.headers['x-auth-token']).toBe('test-token');
  });
  
  test('does not add auth token if not available', () => {
    // Ensure localStorage returns null for getItem
    window.localStorage.getItem.mockReturnValue(null);
    
    // Create a request config
    const config = { headers: {} };
    
    // Call the interceptor directly
    const result = mockRequestInterceptor(config);
    
    // Check no token was added
    expect(result.headers['x-auth-token']).toBeUndefined();
  });
  
  test('handles 401 errors by removing token', async () => {
    // Create an error with 401 status
    const error = {
      response: {
        status: 401,
        data: { msg: 'Token is not valid' }
      }
    };
    
    // Call the rejection handler
    try {
      await mockResponseInterceptor(error);
      fail('Expected promise to reject');
    } catch (err) {
      // This should reject, which is expected
      // Check localStorage.removeItem was called with 'token'
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('token');
    }
  });
});