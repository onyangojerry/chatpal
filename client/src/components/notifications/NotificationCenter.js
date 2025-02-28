import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import SocketContext from '../../context/socket/SocketContext';
import AuthContext from '../../context/auth/AuthContext';
import api from '../../utils/api';
import NotificationBadge from './NotificationBadge';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const socketContext = useContext(SocketContext);
  const authContext = useContext(AuthContext);
  const { socket } = socketContext;
  const { user } = authContext;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        setNotifications(res.data);
        
        // Count unread notifications
        const unread = res.data.filter(notif => !notif.read).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications();
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    // Listen for new notifications
    socket.on('newNotification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification('ChatPal', {
          body: notification.content
        });
      }
    });

    // Listen for notification read status updates
    socket.on('notificationMarkedRead', ({ notificationId }) => {
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, read: true } 
            : notif
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    socket.on('allNotificationsMarkedRead', () => {
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    });

    // Request notification permissions
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    // Get unread count on initial connection
    socket.emit('getUnreadNotificationCount');
    socket.on('unreadNotificationCount', ({ count }) => {
      setUnreadCount(count);
    });

    return () => {
      socket.off('newNotification');
      socket.off('notificationMarkedRead');
      socket.off('allNotificationsMarkedRead');
      socket.off('unreadNotificationCount');
    };
  }, [socket]);

  const toggleNotificationCenter = () => {
    setIsOpen(!isOpen);
  };

  const markAsRead = (notificationId) => {
    if (socket) {
      socket.emit('markNotificationRead', { notificationId });
    }
  };

  const markAllAsRead = () => {
    if (socket) {
      socket.emit('markAllNotificationsRead');
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read first
    markAsRead(notification._id);
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'newMessage':
        navigate(`/chat/${notification.group}`);
        break;
      case 'threadReply':
        navigate(`/chat/${notification.group}`);
        break;
      case 'tableUpdate':
        navigate(`/table/${notification.table}`);
        break;
      case 'drawingUpdate':
        navigate(`/drawing/${notification.drawing}`);
        break;
      default:
        break;
    }
    
    // Close notification center
    setIsOpen(false);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) return null;

  return (
    <div className="notification-center">
      <button 
        className="notification-toggle" 
        onClick={toggleNotificationCenter}
      >
        <i className="fa fa-bell"></i>
        <NotificationBadge count={unreadCount} />
      </button>
      
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read" 
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification._id} 
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    {notification.content}
                  </div>
                  <div className="notification-time">
                    {formatTime(notification.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;