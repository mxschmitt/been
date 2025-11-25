import React from 'react';

export const VisitedToggle = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) => (
  <label className="toggle" htmlFor="visited-toggle">
    <input
      id="visited-toggle"
      type="checkbox"
      checked={checked}
      onChange={event => onChange(event.target.checked)}
    />
    <span className="toggle__track">
      <span className="toggle__thumb" />
    </span>
    <div className="toggle__copy">
      <span className="toggle__title">Visited only</span>
      <span className="toggle__hint">Hide countries not checked off</span>
    </div>
  </label>
);
