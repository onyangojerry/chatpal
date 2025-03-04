// client/src/components/Dashboard.js
import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../context/auth/AuthContext';
import api from '../utils/api';

const Dashboard = () => {
  const authContext = useContext(AuthContext);
  const { user } = authContext;
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await api.get('/groups');
        setGroups(res.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching groups:', err);
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Welcome, {user?.name}</h1>
      </header>

      <div className="dashboard-content">
        {loading ? (
          <div className="loading">Loading your chats...</div>
        ) : (
          <>
            <div className="groups-section">
              <div className="section-header">
                <h2>Your Conversations</h2>
                <button className="new-group-button">New Chat</button>
              </div>
              
              {groups.length === 0 ? (
                <div className="no-groups">
                  You don't have any conversations yet. Start a new chat to begin.
                </div>
              ) : (
                <div className="groups-list">
                  {groups.map(group => (
                    <Link 
                      to={`/chat/${group._id}`} 
                      key={group._id}
                      className="group-card"
                    >
                      <h3>{group.name}</h3>
                      <div className="group-members">
                        {group.members.length} participants
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;