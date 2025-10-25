// EditorWhiteboardToggle.jsx
import React from "react";
import "./ToggleSwitch.css"; // we'll use the same CSS

export default function EditorWhiteboardToggle({ isEditor, onToggle }) {
  return (
    <div className="btn-container">
      <label className="switch btn-color-mode-switch">
        <input
          type="checkbox"
          id="mode_toggle"
          checked={!isEditor}
          onChange={onToggle}
        />
        <label
          className="btn-color-mode-switch-inner"
          data-off="Editor"
          data-on="Whiteboard"
          htmlFor="mode_toggle"
        ></label>
      </label>
    </div>
  );
}
