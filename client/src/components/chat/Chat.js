import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import Message from './Message';
import Thread from './Thread';
import DrawingButton from '../drawing/DrawingButton';
import TableButton from '../tables/TableButton';
import SocketContext from '../../context/socket/SocketContext';
import AuthContext from '../../context/auth/AuthContext';
import api from '../../utils/api';
import './Chat.css';

const Chat = () => {
  const { groupId } = useParams();
  const socketContext = useContext(SocketContext);
  const authContext = useContext(AuthContext);
  const { socket } = socketContext;
  const { user } = authContext;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [group, setGroup] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeThread, setActiveThread] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        setIsLoading(true);
        const groupRes = await api.get(`/groups/${groupId}`);
        setGroup(groupRes.data);
        
        const messagesRes = await api.get(`/messages/group/${groupId}`);
        setMessages(messagesRes.data);
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching group data:', err);
        setIsLoading(false);
      }
    };

    fetchGroupData();

    return () => {
      if (socket) {
        socket.emit('leaveGroup', { groupId });
      }
    };
  }, [groupId, socket]);

  useEffect(() => {
    if (!socket) return;

    // Join group room
    socket.emit('joinGroup', { groupId });

    // Listen for new messages
    socket.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
      markMessageAsRead(message._id);
      scrollToBottom();
    });

    // Listen for user updates in the group
    socket.on('groupUsers', ({ users }) => {
      setActiveUsers(users);
    });

    // Clean up event listeners
    return () => {
      socket.off('newMessage');
      socket.off('groupUsers');
    };
  }, [socket, groupId]);

  useEffect(() => {
    scrollToBottom();
    
    // Mark all messages as read when entering the chat
    if (messages.length > 0 && socket && user) {
      const unreadMessageIds = messages
        .filter(msg => !msg.readBy.some(read => read.user === user.id))
        .map(msg => msg._id);
      
      if (unreadMessageIds.length > 0) {
        socket.emit('markAsRead', { messageIds: unreadMessageIds });
      }
    }
  }, [messages, socket, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket) return;
    
    // Send message to server
    socket.emit('sendMessage', {
      groupId,
      content: newMessage
    });
    
    // Clear input
    setNewMessage('');
  };

  const handleAttachmentClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Create a FormData object to send file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('groupId', groupId);
    
    try {
      const res = await api.post('/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Send a message with the attachment
      socket.emit('sendMessage', {
        groupId,
        content: `Shared a file: ${file.name}`,
        attachments: [{
          type: file.type.startsWith('image/') ? 'image' : 'file',
          url: res.data.url,
          name: file.name
        }]
      });
    } catch (err) {
      console.error('Error uploading file:', err);
    }
    
    // Reset the file input
    e.target.value = null;
  };

  const openThread = (message) => {
    setActiveThread(message);
  };

  const closeThread = () => {
    setActiveThread(null);
  };

  const markMessageAsRead = (messageId) => {
    if (socket) {
      socket.emit('markAsRead', { messageIds: [messageId] });
    }
  };

  const createNewDrawing = async () => {
    try {
      const res = await api.post('/drawings', {
        title: `Drawing in ${group.name}`,
        group: groupId
      });
      
      // Send a message with the drawing attachment
      socket.emit('sendMessage', {
        groupId,
        content: 'Started a new drawing',
        attachments: [{
          type: 'drawing',
          name: res.data.title,
          referenceId: res.data._id
        }]
      });
      
      // Redirect to the drawing page
      window.open(`/drawing/${res.data._id}`, '_blank');
    } catch (err) {
      console.error('Error creating drawing:', err);
    }
  };
  
  const createNewTable = async () => {
    try {
      const res = await api.post('/tables', {
        title: `Table in ${group.name}`,
        group: groupId,
        columns: [
          { name: 'Column 1', type: 'text' },
          { name: 'Column 2', type: 'text' }
        ],
        rows: [['', '']]
      });
      
      // Send a message with the table attachment
      socket.emit('sendMessage', {
        groupId,
        content: 'Created a new table',
        attachments: [{
          type: 'table',
          name: res.data.title,
          referenceId: res.data._id
        }]
      });
      
      // Redirect to the table page
      window.open(`/table/${res.data._id}`, '_blank');
    } catch (err) {
      console.error('Error creating table:', err);
    }
  };

  return (
    <div className="chat-container">
      {isLoading ? (
        <div className="loading">Loading chat...</div>
      ) : (
        <>
          <div className="chat-header">
            <h2>{group?.name}</h2>
            <div className="active-users">
              {activeUsers.map(user => (
                <span key={user.id} className={`user-badge ${user.status}`}>
                  {user.name}
                </span>
              ))}
            </div>
          </div>
          
          <div className="chat-messages">
            {messages.map(message => (
              <Message 
                key={message._id}
                message={message}
                currentUser={user?.id}
                onThreadClick={openThread}
                markAsRead={markMessageAsRead}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="chat-input-container">
            <button className="attachment-button" onClick={handleAttachmentClick}>
              <i className="fa fa-paperclip"></i>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            
            <button className="drawing-button" onClick={createNewDrawing}>
              <i className="fa fa-paint-brush"></i>
            </button>
            
            <button className="table-button" onClick={createNewTable}>
              <i className="fa fa-table"></i>
            </button>
            
            <form className="chat-form" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit">Send</button>
            </form>
          </div>
          
          {activeThread && (
            <div className="thread-overlay">
              <Thread 
                threadId={activeThread.thread || activeThread._id}
                parentMessage={activeThread}
                onClose={closeThread}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Chat;