import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { persistence } from '../services/persistenceManager';
import { requireAuth } from '../middleware/auth';
import { readSshConfigCandidates } from '../services/sshConfigParser';
import { HostEntry, KeyEntry } from '../types';

const router = Router();
router.use(requireAuth);

router.get('/', (_req: Request, res: Response) => {
  try {
    const config = persistence.loadHosts();
    res.json(config.hosts);
  } catch {
    res.status(500).json({ error: 'Failed to load hosts' });
  }
});

// Lists candidates parsed from the server's ~/.ssh/config for the "import" picker.
router.get('/ssh-config', (_req: Request, res: Response) => {
  try {
    const candidates = readSshConfigCandidates();
    const config = persistence.loadHosts();
    const existingNames = new Set(config.hosts.map(h => h.name).filter(Boolean));
    res.json(candidates.map(c => ({ ...c, alreadyImported: existingNames.has(c.alias) })));
  } catch {
    res.status(500).json({ error: 'Failed to read SSH config' });
  }
});

// Re-parses ~/.ssh/config server-side and creates Host (+ Key, if needed) entries
// for the selected aliases. Client only supplies which aliases to import, not
// their field values, so a tampered request can't smuggle in arbitrary paths.
router.post('/ssh-config/import', (req: Request, res: Response) => {
  const { aliases } = req.body as { aliases?: string[] };
  if (!Array.isArray(aliases) || aliases.length === 0) {
    res.status(400).json({ error: 'aliases is required' });
    return;
  }

  try {
    const candidates = readSshConfigCandidates();
    const hostsConfig = persistence.loadHosts();
    const keysConfig = persistence.loadKeys();
    const existingNames = new Set(hostsConfig.hosts.map(h => h.name).filter(Boolean));
    const created: HostEntry[] = [];
    const skipped: string[] = [];

    for (const alias of aliases) {
      const candidate = candidates.find(c => c.alias === alias);
      if (!candidate || existingNames.has(alias)) {
        skipped.push(alias);
        continue;
      }

      let keyId = '';
      if (candidate.identityFile) {
        const existingKey = keysConfig.keys.find(k => k.private_key_path === candidate.identityFile);
        if (existingKey) {
          keyId = existingKey.id;
        } else {
          const newKey: KeyEntry = {
            id: uuidv4(),
            type: 'rsa',
            private_key_path: candidate.identityFile,
            encrypted: false,
            description: `Imported from ~/.ssh/config (${alias})`,
          };
          keysConfig.keys.push(newKey);
          keyId = newKey.id;
        }
      }

      const host: HostEntry = {
        id: uuidv4(),
        name: candidate.alias,
        hostname: candidate.hostname,
        port: candidate.port,
        username: candidate.username,
        transport: 'ssh',
        key_id: keyId,
        tags: [],
        mosh_allowed: false,
        vnc_enabled: false,
        vnc_port: 5900,
        rdp_enabled: false,
        rdp_port: 3389,
      };
      hostsConfig.hosts.push(host);
      existingNames.add(alias);
      created.push(host);
    }

    persistence.saveKeys(keysConfig);
    persistence.saveHosts(hostsConfig);
    res.status(201).json({ created, skipped });
  } catch {
    res.status(500).json({ error: 'Failed to import hosts from SSH config' });
  }
});

router.post('/', (req: Request, res: Response) => {
  const body = req.body as Partial<HostEntry>;

  if (!body.hostname) {
    res.status(400).json({ error: 'hostname is required' });
    return;
  }

  try {
    const config = persistence.loadHosts();
    const host: HostEntry = {
      id: body.id || uuidv4(),
      name: body.name?.trim() || undefined,
      hostname: body.hostname,
      port: body.port || 22,
      username: body.username || '',
      transport: body.transport || 'ssh',
      key_id: body.key_id || '',
      tags: body.tags || [],
      mosh_allowed: body.mosh_allowed ?? false,
      vnc_enabled: body.vnc_enabled ?? false,
      vnc_port: body.vnc_port ?? 5900,
      rdp_enabled: body.rdp_enabled ?? false,
      rdp_port: body.rdp_port ?? 3389,
    };
    config.hosts.push(host);
    persistence.saveHosts(config);
    res.status(201).json(host);
  } catch {
    res.status(500).json({ error: 'Failed to save host' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body as Partial<HostEntry>;

  try {
    const config = persistence.loadHosts();
    const idx = config.hosts.findIndex(h => h.id === id);
    if (idx < 0) {
      res.status(404).json({ error: 'Host not found' });
      return;
    }
    const merged = { ...config.hosts[idx], ...updates, id };
    merged.vnc_enabled = merged.vnc_enabled ?? false;
    merged.vnc_port = merged.vnc_port ?? 5900;
    config.hosts[idx] = merged;
    persistence.saveHosts(config);
    res.json(config.hosts[idx]);
  } catch {
    res.status(500).json({ error: 'Failed to update host' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const config = persistence.loadHosts();
    const idx = config.hosts.findIndex(h => h.id === id);
    if (idx < 0) {
      res.status(404).json({ error: 'Host not found' });
      return;
    }
    config.hosts.splice(idx, 1);
    persistence.saveHosts(config);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete host' });
  }
});

export default router;
