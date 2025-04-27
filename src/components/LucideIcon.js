import React from 'react';
import { useLocation } from 'react-router-dom';

export const LucideIcon = ({ icon: Icon, className, to }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  // Determine color based on active state
  const iconColor = isActive 
    ? 'var(--cui-sidebar-nav-link-active-icon-color)' 
    : 'var(--cui-sidebar-nav-link-icon-color)';

  return (
    <Icon
      className={`nav-icon ${className || ''}`}
      size={18}
      color={iconColor}
      style={{
        fill: 'none',
        display: 'inline-block',
        marginRight: '0.5rem',
        verticalAlign: 'text-top'
      }}
    />
  );
};

export default LucideIcon;