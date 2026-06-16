import React from 'react';
import { User } from 'lucide-react';

const Avatar = ({ name, size = 32, className = '', src }) => {
  if (src) {
    return (
      <img 
        src={src}
        alt={name || 'User Avatar'}
        className={`rounded-full object-cover shadow-sm border border-slate-200 ${className}`}
        style={{ width: size, height: size }}
        title={name}
        referrerPolicy="no-referrer"
      />
    );
  }

  if (!name) {
    return (
      <div 
        className={`rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 ${className}`}
        style={{ width: size, height: size }}
      >
        <User size={size * 0.6} />
      </div>
    );
  }

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true&size=${size}`;
  
  return (
    <img 
      src={avatarUrl}
      alt={name}
      className={`rounded-full object-cover shadow-sm border border-slate-200 ${className}`}
      style={{ width: size, height: size }}
      title={name}
    />
  );
};

export default Avatar;
