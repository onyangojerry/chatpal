import React, { useReducer, useContext, useEffect } from 'react';
import io from 'socket.io-client';
import SocketContext from './SocketContext';
import socketReducer from './socketReducer';
import AuthContext from '../auth/AuthContext';

export const SocketProvider = ({ children }) => {
  const authContext = useContext(AuthContext);
  const { isAuthenticated, token } = authContext;

  const initialState = {
    socket: null,
    connected: false
  };

  const [state, dispatch] = useReducer(socketReducer, initialState);

  // Initialize socket connection
  useEffect(() => {
    if (isAuthenticated && token) {
      // Connect to socket.io server
      const newSocket = io('', {
        auth: {
          token
        }
      });
      
      // Socket connected event
      newSocket.on('connect', () => {
        dispatch({
          type: 'SOCKET_CONNECTED',
          payload: newSocket
        });
      });

      // Socket disconnected event
      newSocket.on('disconnect', () => {
        dispatch({ type: 'SOCKET_DISCONNECTED' });
      });

      // Cleanup on unmount
      return () => {
        if (newSocket) newSocket.disconnect();
      };
    }
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider
      value={{
        socket: state.socket,
        connected: state.connected
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
