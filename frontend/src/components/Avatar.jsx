import React from 'react';

const Avatar = ({ name, size = 32, className = '' }) => {
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&color=fff&bold=true&size=${size}`;
  
  return (
    <img 
      src={avatarUrl}
      alt={name || 'Avatar'}
      className={`rounded-full object-cover shadow-sm border border-slate-200 ${className}`}
      style={{ width: size, height: size }}
      title={name}
    />
  );
};

export default Avatar;
