import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Message.css';

const Message = ({ message, currentUser, onThreadClick, markAsRead }) => {
  const [isOwnMessage, setIsOwnMessage] = useState(false);
  
  useEffect(() => {
    // Check if the message is from the current user
    setIsOwnMessage(message.sender._id === currentUser);
    
    // Mark message as read if it's not already read by current user
    const isRead = message.readBy.some(read => read.user === currentUser);
    if (!isRead) {
      markAsRead(message._id);
    }
  }, [message, currentUser, markAsRead]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getReadStatus = () => {
    if (isOwnMessage) {
      if (message.readBy.length > 1) {
        return 'Read';
      } else {
        return 'Sent';
      }
    }
    return null;
  };

  const renderAttachment = (attachment) => {
    switch (attachment.type) {
      case 'image':
        return (
          <div className="message-attachment image">
            <img src={attachment.url} alt={attachment.name} />
            <span>{attachment.name}</span>
          </div>
        );
      case 'file':
        return (
          <div className="message-attachment file">
            <i className="fa fa-file"></i>
            <a href={attachment.url} target="_blank" rel="noopener noreferrer">
              {attachment.name}
            </a>
          </div>
        );
      case 'drawing':
        return (
          <div className="message-attachment drawing">
            <i className="fa fa-paint-brush"></i>
            <Link to={`/drawing/${attachment.referenceId}`} target="_blank">
              {attachment.name}
            </Link>
          </div>
        );
      case 'table':
        return (
          <div className="message-attachment table">
            <i className="fa fa-table"></i>
            <Link to={`/table/${attachment.referenceId}`} target="_blank">
              {attachment.name}
            </Link>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`message ${isOwnMessage ? 'own' : 'other'}`}>
      {!isOwnMessage && (
        <div className="message-avatar">
          {message.sender.avatar ? (
            <img src={message.sender.avatar} alt={message.sender.name} />
          ) : (
            <div className="avatar-placeholder">
              {message.sender.name.charAt(0)}
            </div>
          )}
        </div>
      )}
      
      <div className="message-content">
        {!isOwnMessage && (
          <div className="message-sender">{message.sender.name}</div>
        )}
        
        <div className="message-bubble">
          <div className="message-text">{message.content}</div>
          
          {message.attachments && message.attachments.length > 0 && (
            <div className="message-attachments">
              {message.attachments.map((attachment, index) => (
                <div key={index}>
                  {renderAttachment(attachment)}
                </div>
              ))}
            </div>
          )}
          
          <div className="message-info">
            <span className="message-time">{formatTime(message.createdAt)}</span>
            {isOwnMessage && (
              <span className="message-status">{getReadStatus()}</span>
            )}
          </div>
        </div>
        
        {/* Thread button */}
        <button 
          className="thread-button"
          onClick={() => onThreadClick(message)}
        >
          <i className="fa fa-reply"></i>
          {message.thread && <span className="thread-count">Thread</span>}
        </button>
      </div>
    </div>
  );
};

export default Message;