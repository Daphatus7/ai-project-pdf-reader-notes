import React, { useEffect, useRef, useState } from 'react';
import { OutputStyle, PageMode } from '../../types';

type Props = {
  styleValue: OutputStyle;
  setStyle: (o: OutputStyle) => void;
  pageMode: PageMode;
  setPageMode: (m: PageMode) => void;
  customPages: string;
  setCustomPages: (v: string) => void;
};

const SettingsPopover: React.FC<Props> = ({
  styleValue,
  setStyle,
  pageMode,
  setPageMode,
  customPages,
  setCustomPages,
}) => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as any)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  return (
    <div className="popover">
      <button
        className="btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="settingsPanel"
        onClick={() => setOpen((v) => !v)}
      >
        Settings
      </button>
      <div
        ref={panelRef}
        id="settingsPanel"
        className={`popover-panel ${open ? 'open' : ''}`}
        role="dialog"
        aria-label="Conversion settings"
      >
        <fieldset className="setting">
          <legend>Output style</legend>
          <label className="row">
            <input
              type="radio"
              name="style"
              value="preserve"
              checked={styleValue === 'preserve'}
              onChange={() => setStyle('preserve')}
            />{' '}
            <span>Preserve headings</span>
          </label>
          <label className="row">
            <input
              type="radio"
              name="style"
              value="plain"
              checked={styleValue === 'plain'}
              onChange={() => setStyle('plain')}
            />{' '}
            <span>Plain text</span>
          </label>
        </fieldset>
        <fieldset className="setting">
          <legend>Page range</legend>
          <label className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
            <span className="row" style={{ flex: '1 1 auto' }}>
              <input
                type="radio"
                name="pages"
                value="all"
                checked={pageMode === 'all'}
                onChange={() => setPageMode('all')}
              />{' '}
              <span style={{ marginLeft: 6 }}>All</span>
            </span>
          </label>
          <label className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
            <span className="row" style={{ flex: '1 1 auto' }}>
              <input
                type="radio"
                name="pages"
                value="custom"
                checked={pageMode === 'custom'}
                onChange={() => setPageMode('custom')}
              />{' '}
              <span style={{ marginLeft: 6 }}>Custom</span>
            </span>
            <input
              className="input"
              type="text"
              placeholder="e.g., 1-3,5,9-12"
              aria-label="Custom page range"
              disabled={pageMode !== 'custom'}
              style={{ width: '50%' }}
              value={customPages}
              onChange={(e) => setCustomPages(e.target.value)}
            />
          </label>
        </fieldset>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPopover;
