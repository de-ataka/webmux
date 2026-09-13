import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface SshConfigCandidate {
  alias: string;
  hostname: string;
  port: number;
  username: string;
  identityFile: string | null;
}

function expandHome(value: string, homeDir: string): string {
  if (value === '~') return homeDir;
  if (value.startsWith('~/')) return path.join(homeDir, value.slice(2));
  return value;
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function defaultUsername(): string {
  try {
    return os.userInfo().username;
  } catch {
    return '';
  }
}

/** Parses the Host/HostName/Port/User/IdentityFile directives of an ssh_config file. */
export function parseSshConfig(content: string, homeDir: string = os.homedir()): SshConfigCandidate[] {
  const candidates: SshConfigCandidate[] = [];
  let aliases: string[] = [];
  let hostName = '';
  let port = 22;
  let username = defaultUsername();
  let identityFile: string | null = null;

  const flush = () => {
    for (const alias of aliases) {
      candidates.push({ alias, hostname: hostName || alias, port, username, identityFile });
    }
    aliases = [];
    hostName = '';
    port = 22;
    username = defaultUsername();
    identityFile = null;
  };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^(\S+)\s+(.+)$/);
    if (!match) continue;
    const keyword = match[1].toLowerCase();
    const value = match[2].trim();

    if (keyword === 'host') {
      flush();
      // Wildcard patterns (Host *, Host 10.0.*) aren't concrete hosts to import.
      aliases = value.split(/\s+/).filter(pattern => !pattern.includes('*') && !pattern.includes('?'));
      continue;
    }
    if (aliases.length === 0) continue;

    switch (keyword) {
      case 'hostname':
        hostName = stripQuotes(value);
        break;
      case 'port': {
        const parsed = parseInt(value, 10);
        if (!Number.isNaN(parsed)) port = parsed;
        break;
      }
      case 'user':
        username = stripQuotes(value);
        break;
      case 'identityfile':
        identityFile = expandHome(stripQuotes(value), homeDir);
        break;
      default:
        break;
    }
  }
  flush();

  return candidates;
}

/** Reads and parses ~/.ssh/config; returns an empty list if it doesn't exist or can't be read. */
export function readSshConfigCandidates(homeDir: string = os.homedir()): SshConfigCandidate[] {
  const configPath = path.join(homeDir, '.ssh', 'config');
  let content: string;
  try {
    content = fs.readFileSync(configPath, 'utf-8');
  } catch {
    return [];
  }
  return parseSshConfig(content, homeDir);
}
