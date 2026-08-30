import { useEffect, useRef, useState } from 'react';
import { downloadExport } from '../api';

export default function DownloadButton({
  type,
  id = null,
  className = 'btn btn-secondary',
  children = 'Download',
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleFormat(format) {
    downloadExport(type, id, format);
    setOpen(false);
  }

  return (
    <div className="download-button-wrap" ref={wrapRef}>
      <button type="button" className={className} onClick={() => setOpen((prev) => !prev)}>
        {children}
      </button>
      {open && (
        <div className="download-format-menu" role="menu">
          <p className="download-format-label">Choose format</p>
          <button type="button" role="menuitem" onClick={() => handleFormat('word')}>
            Word
          </button>
          <button type="button" role="menuitem" onClick={() => handleFormat('pdf')}>
            PDF
          </button>
        </div>
      )}
    </div>
  );
}
