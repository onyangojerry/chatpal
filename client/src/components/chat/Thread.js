import React, { useState, useEffect, useRef, useContext } from 'react';
import SocketContext from '../../context/socket/SocketContext';
import AuthContext from '../../context/auth/AuthContext';
import api from '../../utils/api';
import './Thread.css';

const Thread = ({ threadId, parentMessage, onClose }) => {
  const socketContext = useContext(SocketContext);
  const authContext = useContext(AuthContext);
  const { socket } = socketContext;
  const { user } = authContext;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchThreadMessages = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(`/messages/thread/${threadId}`);
        setMessages(res.data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching thread messages:', err);
        setIsLoading(false);
      }
    };

    fetchThreadMessages();
  }, [threadId]);

  useEffect(() => {
    if (!socket) return;

    // Join thread room
    socket.emit('joinThread', { threadId });

    // Listen for new thread messages
    socket.on('threadMessage', (message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    return () => {
      socket.off('threadMessage');
      socket.emit('leaveThread', { threadId });
    };
  }, [socket, threadId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket) return;
    
    // Send message to server
    socket.emit('sendThreadMessage', {
      threadId,
      content: newMessage,
      parentId: parentMessage._id
    });
    
    // Clear input
    setNewMessage('');
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="thread-container">
      <div className="thread-header">
        <h3>Thread</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="parent-message">
        <div className="message-sender">{parentMessage.sender.name}</div>
        <div className="message-content">{parentMessage.content}</div>
        <div className="message-time">
          {formatTime(parentMessage.createdAt)}
        </div>
      </div>
      
      <div className="thread-messages">
        {isLoading ? (
          <div className="loading">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="no-messages">No replies yet</div>
        ) : (
          messages.map(message => (
            <div key={message._id} className="thread-message">
              <div className="message-sender">{message.sender.name}</div>
              <div className="message-content">{message.content}</div>
              <div className="message-time">
                {formatTime(message.createdAt)}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="thread-input" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Type a reply..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default Thread;