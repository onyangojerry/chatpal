import React from 'react';
import './TableButton.css';

const TableButton = ({ onClick }) => {
  return (
    <button className="table-tool-button" onClick={onClick}>
      <i className="fa fa-table"></i>
      <span>Table</span>
    </button>
  );
};

export default TableButton;