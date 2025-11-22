import React, { useState } from 'react';
import './CollapsiblePanels.css';

/**
 * A component that displays two vertical panels. When one is clicked, it expands
 * to fill the container while the other collapses. Clicking the expanded panel
 * returns it to the default split view.
 *
 * @param {object} props
 * @param {React.ReactNode} props.leftPanelContent The content for the left panel.
 * @param {string} props.leftTitle The title for the left panel, visible when collapsed.
 * @param {React.ReactNode} props.rightPanelContent The content for the right panel.
 * @param {string} props.rightTitle The title for the right panel, visible when collapsed.
 */
const CollapsiblePanels = ({ leftPanelContent, leftTitle, rightPanelContent, rightTitle }) => {
  // 'left' or 'right' determines which panel is active. 'split' is the default.
  const [activePanel, setActivePanel] = useState('left');

  const handlePanelClick = (panel) => {
    // If the clicked panel is already active, revert to split view. Otherwise, make it active.
    setActivePanel(current => (current === panel ? 'split' : panel));
  };

  return (
    <div className={`collapsible-panels-container panel-${activePanel}`}>
      <div className="panel left-panel" onClick={() => handlePanelClick('left')}>
        <div className="panel-title-vertical" onClick={(e) => { e.stopPropagation(); handlePanelClick('left'); }}>{leftTitle}</div>
        <div className="panel-content" onClick={(e) => e.stopPropagation()}>{leftPanelContent}</div>
      </div>
      <div className="panel right-panel" onClick={() => handlePanelClick('right')}>
        <div className="panel-title-vertical" onClick={(e) => { e.stopPropagation(); handlePanelClick('right'); }}>{rightTitle}</div>
        <div className="panel-content" onClick={(e) => e.stopPropagation()}>{rightPanelContent}</div>
      </div>
    </div>
  );
};

export default CollapsiblePanels;