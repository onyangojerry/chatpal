import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import SocketContext from '../../context/socket/SocketContext';
import AuthContext from '../../context/auth/AuthContext';
import api from '../../utils/api';
import './TableView.css';

const TableView = () => {
  const { tableId } = useParams();
  const socketContext = useContext(SocketContext);
  const authContext = useContext(AuthContext);
  const { socket } = socketContext;
  const { user } = authContext;

  const [tableData, setTableData] = useState({
    title: '',
    columns: [],
    rows: []
  });
  const [editingCell, setEditingCell] = useState(null);
  const [cellValue, setCellValue] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTable = async () => {
      try {
        const res = await api.get(`/tables/${tableId}`);
        setTableData(res.data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching table:', err);
        setIsLoading(false);
      }
    };

    fetchTable();
  }, [tableId]);

  useEffect(() => {
    if (!socket) return;

    // Join table room
    socket.emit('joinTable', { tableId });

    // Listen for table updates
    socket.on('tableUpdate', (data) => {
      setTableData(data);
    });

    // Listen for cell updates
    socket.on('cellUpdate', ({ rowIndex, colIndex, value, updatedBy }) => {
      setTableData(prevData => {
        const newRows = [...prevData.rows];
        if (!newRows[rowIndex]) {
          // Expand table if needed
          while (newRows.length <= rowIndex) {
            const newRow = Array(prevData.columns.length).fill('');
            newRows.push(newRow);
          }
        }
        newRows[rowIndex][colIndex] = value;
        return { ...prevData, rows: newRows };
      });
    });

    // Listen for active users updates
    socket.on('tableActiveUsers', (users) => {
      setActiveUsers(users);
    });

    // Listen for cell editing notifications
    socket.on('cellEditing', ({ rowIndex, colIndex, user: cellUser }) => {
      // Maybe show an indicator that someone else is editing this cell
      console.log(`${cellUser.name} is editing cell at row ${rowIndex}, col ${colIndex}`);
    });

    return () => {
      socket.off('tableUpdate');
      socket.off('cellUpdate');
      socket.off('tableActiveUsers');
      socket.off('cellEditing');
      socket.emit('leaveTable', { tableId });
    };
  }, [socket, tableId]);

  const handleCellClick = (rowIndex, colIndex) => {
    setEditingCell({ rowIndex, colIndex });
    setCellValue(tableData.rows[rowIndex]?.[colIndex] || '');
    
    // Notify others that this cell is being edited
    if (socket) {
      socket.emit('cellEditing', { tableId, rowIndex, colIndex });
    }
  };

  const handleCellChange = (e) => {
    setCellValue(e.target.value);
  };

  const handleCellBlur = () => {
    if (!editingCell) return;
    
    const { rowIndex, colIndex } = editingCell;
    
    // Update table locally
    setTableData(prevData => {
      const newRows = [...prevData.rows];
      if (!newRows[rowIndex]) {
        // Expand table if needed
        while (newRows.length <= rowIndex) {
          const newRow = Array(prevData.columns.length).fill('');
          newRows.push(newRow);
        }
      }
      newRows[rowIndex][colIndex] = cellValue;
      return { ...prevData, rows: newRows };
    });
    
    // Send update to server
    if (socket) {
      socket.emit('updateCell', {
        tableId,
        rowIndex: editingCell.rowIndex,
        colIndex: editingCell.colIndex,
        value: cellValue
      });
    }
    
    setEditingCell(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    }
  };

  const addColumn = () => {
    const columnName = prompt('Enter column name:');
    if (!columnName || !socket) return;
    
    socket.emit('addColumn', {
      tableId,
      columnName
    });
  };

  const addRow = () => {
    if (!socket) return;
    socket.emit('addRow', { tableId });
  };

  return (
    <div className="table-view-container">
      {isLoading ? (
        <div className="loading">Loading table...</div>
      ) : (
        <>
          <div className="table-header">
            <h2>{tableData.title}</h2>
            <div className="table-actions">
              <button onClick={addColumn}>Add Column</button>
              <button onClick={addRow}>Add Row</button>
              <Link to={`/chat/${tableData.group?._id}`} className="back-button">
                Back to Chat
              </Link>
            </div>
          </div>
          
          <div className="active-users">
            <span>Active users: </span>
            {activeUsers.map(user => (
              <span key={user.id} className="user-badge">{user.name}</span>
            ))}
          </div>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {tableData.columns.map((column, index) => (
                    <th key={index}>{column.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, colIndex) => (
                      <td 
                        key={colIndex} 
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                        className={
                          editingCell && 
                          editingCell.rowIndex === rowIndex && 
                          editingCell.colIndex === colIndex ? 'editing' : ''
                        }
                      >
                        {editingCell && 
                         editingCell.rowIndex === rowIndex && 
                         editingCell.colIndex === colIndex ? (
                          <input
                            type="text"
                            value={cellValue}
                            onChange={handleCellChange}
                            onBlur={handleCellBlur}
                            onKeyDown={handleKeyDown}
                            autoFocus
                          />
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default TableView;