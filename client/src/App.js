import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/auth/AuthState';
import { SocketProvider } from './context/socket/SocketState';
import PrivateRoute from './components/routing/PrivateRoute';

import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/Dashboard';
import Chat from './components/chat/Chat';
import DrawingBoard from './components/drawing/DrawingBoard';
import TableView from './components/tables/TableView';
import NotificationCenter from './components/notifications/NotificationCenter';

import './App.css';

const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <div className="app-container">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } />
              <Route path="/chat/:groupId" element={
                <PrivateRoute>
                  <Chat />
                </PrivateRoute>
              } />
              <Route path="/drawing/:drawingId" element={
                <PrivateRoute>
                  <DrawingBoard />
                </PrivateRoute>
              } />
              <Route path="/table/:tableId" element={
                <PrivateRoute>
                  <TableView />
                </PrivateRoute>
              } />
            </Routes>
            <NotificationCenter />
          </div>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
