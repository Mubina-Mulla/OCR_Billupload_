import React from 'react';
import './Loader.css';

const Loader = ({ message = 'Loading...', size = 'medium' }) => {
  return (
    <div className={`loader-container loader-${size}`}>
      <div className="loader-spinner"></div>
      <p className="loader-message">{message}</p>
    </div>
  );
};

export default Loader;
