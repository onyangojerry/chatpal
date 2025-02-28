import React from 'react';
import './DrawingButton.css';

const DrawingButton = ({ onClick }) => {
  return (
    <button className="drawing-tool-button" onClick={onClick}>
      <i className="fa fa-paint-brush"></i>
      <span>Drawing</span>
    </button>
  );
};

export default DrawingButton;