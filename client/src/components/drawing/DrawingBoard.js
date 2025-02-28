import React, { useEffect, useRef, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import SocketContext from '../../context/socket/SocketContext';
import AuthContext from '../../context/auth/AuthContext';
import api from '../../utils/api';
import './DrawingBoard.css';

const DrawingBoard = () => {
  const { drawingId } = useParams();
  const socketContext = useContext(SocketContext);
  const authContext = useContext(AuthContext);
  const { socket } = socketContext;
  const { user } = authContext;

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [drawingData, setDrawingData] = useState(null);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    const fetchDrawing = async () => {
      try {
        const res = await api.get(`/drawings/${drawingId}`);
        setDrawingData(res.data);
        
        // Load existing drawing data
        if (res.data.canvasData) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
          };
          img.src = res.data.canvasData;
        }
      } catch (err) {
        console.error('Error fetching drawing:', err);
      }
    };

    fetchDrawing();
  }, [drawingId]);

  useEffect(() => {
    if (!socket) return;

    // Join drawing room
    socket.emit('joinDrawing', { drawingId });

    // Listen for drawing actions from other users
    socket.on('drawingAction', handleDrawingAction);
    
    // Listen for participant updates
    socket.on('drawingParticipants', (data) => {
      setParticipants(data.participants);
    });

    // Listen for clear canvas action
    socket.on('clearDrawing', () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    return () => {
      socket.off('drawingAction');
      socket.off('drawingParticipants');
      socket.off('clearDrawing');
      socket.emit('leaveDrawing', { drawingId });
    };
  }, [socket, drawingId]);

  const handleDrawingAction = (data) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    switch (data.type) {
      case 'start':
        ctx.beginPath();
        ctx.moveTo(data.x, data.y);
        break;
      case 'draw':
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
        break;
      default:
        break;
    }
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Emit drawing start event
    if (socket) {
      socket.emit('drawingAction', {
        drawingId,
        type: 'start',
        x,
        y,
        color,
        lineWidth
      });
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Emit drawing event
    if (socket) {
      socket.emit('drawingAction', {
        drawingId,
        type: 'draw',
        x,
        y,
        color,
        lineWidth
      });
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    
    // Save canvas state periodically
    const canvas = canvasRef.current;
    const canvasData = canvas.toDataURL('image/png');
    
    if (socket) {
      socket.emit('saveDrawing', {
        drawingId,
        canvasData
      });
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (socket) {
      socket.emit('clearDrawing', { drawingId });
    }
  };

  return (
    <div className="drawing-board-container">
      <div className="toolbar">
        <div className="color-picker">
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)} 
          />
        </div>
        <div className="line-width">
          <input 
            type="range" 
            min="1" 
            max="20" 
            value={lineWidth} 
            onChange={(e) => setLineWidth(parseInt(e.target.value))} 
          />
        </div>
        <button onClick={clearCanvas}>Clear Canvas</button>
        <Link to={`/chat/${drawingData?.group?._id}`} className="back-button">
          Back to Chat
        </Link>
      </div>
      
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
        />
      </div>
      
      <div className="participants">
        <h3>Active Users ({participants.length})</h3>
        <ul>
          {participants.map(user => (
            <li key={user.id}>
              {user.name} {user.isDrawing ? '(drawing)' : ''}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DrawingBoard;