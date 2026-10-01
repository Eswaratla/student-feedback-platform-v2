import { useEffect, useRef, useState } from 'react';
import { downloadExport } from '../api';

export default function DownloadButton({
  type,
  id = null,
  className = 'btn btn-secondary',
  children = 'Download',
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
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

  async function handleFormat(format) {
    setOpen(false);
    setError('');
    try {
      await downloadExport(type, id, format);
    } catch (err) {
      setError(err.message || 'Download failed');
    }
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
      {error && <p className="form-error download-error">{error}</p>}
    </div>
  );
}
