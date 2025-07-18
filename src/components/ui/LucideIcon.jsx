import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export const LucideIcon = ({ icon: Icon, className, to }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const [isHovered, setIsHovered] = useState(false);
  const iconRef = useRef();
  
  useEffect(() => {
    // Function to check if the parent nav item is hovered
    const checkParentHover = (event) => {
      if (!iconRef.current) return;
      
      // Find the parent nav item (typically a <li> or similar element)
      const parentNavItem = iconRef.current.closest('.c-sidebar-nav-item') || 
                            iconRef.current.closest('.nav-item');
      
      if (parentNavItem) {
        // Check if the event target is the parent or a child of the parent
        const isHoveringParent = parentNavItem.contains(event.target);
        setIsHovered(isHoveringParent);
      }
    };
    
    // Add event listeners to the document for mouseover/mouseout
    document.addEventListener('mouseover', checkParentHover);
    document.addEventListener('mouseout', checkParentHover);
    
    return () => {
      // Clean up
      document.removeEventListener('mouseover', checkParentHover);
      document.removeEventListener('mouseout', checkParentHover);
    };
  }, []);
  
  // Use the same color for hover as active state
  const iconColor = isActive || isHovered
    ? 'var(--cui-sidebar-nav-link-active-icon-color)'
    : 'var(--cui-sidebar-nav-link-icon-color)';

  return (
    <Icon
      ref={iconRef}
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