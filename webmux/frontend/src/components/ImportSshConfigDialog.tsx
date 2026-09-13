import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { HostEntry, SshConfigCandidate } from '../types';

interface ImportSshConfigDialogProps {
  onClose: () => void;
  onImported: (created: HostEntry[]) => void;
}

function identityFileName(path: string | null): string {
  if (!path) return '';
  const parts = path.split('/');
  return parts[parts.length - 1];
}

export function ImportSshConfigDialog({ onClose, onImported }: ImportSshConfigDialogProps) {
  const [candidates, setCandidates] = useState<SshConfigCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSshConfigHosts()
      .then(list => {
        setCandidates(list);
        setSelected(new Set(list.filter(c => !c.alreadyImported).map(c => c.alias)));
      })
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (alias: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(alias)) next.delete(alias);
      else next.add(alias);
      return next;
    });
  };

  const handleImport = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.importSshConfigHosts(Array.from(selected));
      onImported(result.created);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.dialog}>
        <div style={styles.header}>
          <span style={styles.title}>Import from ~/.ssh/config</span>
          <button style={styles.closeBtn} onClick={onClose}>{'✕'}</button>
        </div>

        <div style={styles.body}>
          {loading && <p style={styles.hint}>Reading ~/.ssh/config…</p>}
          {!loading && error && <div style={styles.error}>{error}</div>}
          {!loading && !error && candidates.length === 0 && (
            <p style={styles.hint}>No hosts found in ~/.ssh/config.</p>
          )}
          {!loading && candidates.length > 0 && (
            <div style={styles.list}>
              {candidates.map(c => (
                <label key={c.alias} style={styles.row}>
                  <input
                    type="checkbox"
                    checked={selected.has(c.alias)}
                    disabled={c.alreadyImported || submitting}
                    onChange={() => toggle(c.alias)}
                  />
                  <div style={styles.rowText}>
                    <div style={styles.rowAlias}>
                      {c.alias}
                      {c.alreadyImported && <span style={styles.badge}>already added</span>}
                    </div>
                    <div style={styles.rowSub}>
                      {c.username ? `${c.username}@` : ''}{c.hostname}{c.port !== 22 ? `:${c.port}` : ''}
                      {c.identityFile && ` • ${identityFileName(c.identityFile)}`}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={styles.actions}>
          <button type="button" style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            type="button"
            style={styles.importBtn}
            onClick={handleImport}
            disabled={submitting || selected.size === 0}
          >
            {submitting ? 'Importing…' : `Import Selected (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
  },
  dialog: {
    background: '#1a1a2e',
    border: '1px solid #333366',
    borderRadius: 8,
    width: 440,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #333366',
  },
  title: {
    fontWeight: 700,
    fontSize: 15,
    color: '#e0e0e0',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: 14,
    cursor: 'pointer',
  },
  body: {
    padding: 16,
    overflow: 'auto',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '8px 6px',
    borderRadius: 4,
    cursor: 'pointer',
  },
  rowText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  rowAlias: {
    color: '#e0e0e0',
    fontSize: 13,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  rowSub: {
    color: '#888',
    fontSize: 12,
  },
  badge: {
    background: '#2a2a4a',
    color: '#8888aa',
    fontSize: 10,
    fontWeight: 400,
    padding: '1px 6px',
    borderRadius: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  hint: {
    color: '#888',
    fontSize: 12,
    margin: 0,
    fontStyle: 'italic',
  },
  error: {
    background: '#3a1a1a',
    border: '1px solid #c04040',
    borderRadius: 4,
    padding: '7px 10px',
    color: '#ff8080',
    fontSize: 12,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 16,
    borderTop: '1px solid #333366',
  },
  cancelBtn: {
    background: '#1a1a3a',
    border: '1px solid #333',
    borderRadius: 4,
    padding: '7px 16px',
    color: '#aaa',
    fontSize: 13,
    cursor: 'pointer',
  },
  importBtn: {
    background: '#7c6af7',
    border: 'none',
    borderRadius: 4,
    padding: '7px 20px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
