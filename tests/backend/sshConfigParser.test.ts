import { parseSshConfig } from '@backend/services/sshConfigParser';

describe('parseSshConfig', () => {
  const homeDir = '/home/testuser';

  it('parses a basic Host block', () => {
    const config = [
      'Host myserver',
      '  HostName 192.168.1.10',
      '  Port 2222',
      '  User alice',
      '  IdentityFile ~/.ssh/id_ed25519',
      '',
    ].join('\n');

    const result = parseSshConfig(config, homeDir);

    expect(result).toEqual([
      {
        alias: 'myserver',
        hostname: '192.168.1.10',
        port: 2222,
        username: 'alice',
        identityFile: '/home/testuser/.ssh/id_ed25519',
      },
    ]);
  });

  it('defaults hostname to the alias and port to 22 when omitted', () => {
    const result = parseSshConfig('Host plainhost\n  User bob\n', homeDir);

    expect(result).toEqual([
      {
        alias: 'plainhost',
        hostname: 'plainhost',
        port: 22,
        username: 'bob',
        identityFile: null,
      },
    ]);
  });

  it('expands multiple aliases on one Host line into separate candidates', () => {
    const result = parseSshConfig('Host foo bar\n  HostName shared.example.com\n', homeDir);

    expect(result.map(c => c.alias)).toEqual(['foo', 'bar']);
    expect(result.every(c => c.hostname === 'shared.example.com')).toBe(true);
  });

  it('skips wildcard-only Host blocks', () => {
    const result = parseSshConfig('Host *\n  User globaluser\n\nHost real\n  HostName real.example.com\n', homeDir);

    expect(result).toEqual([
      {
        alias: 'real',
        hostname: 'real.example.com',
        port: 22,
        username: expect.any(String),
        identityFile: null,
      },
    ]);
  });

  it('drops wildcard patterns but keeps concrete aliases on a mixed Host line', () => {
    const result = parseSshConfig('Host concrete *.internal\n  HostName 10.0.0.5\n', homeDir);

    expect(result.map(c => c.alias)).toEqual(['concrete']);
  });

  it('ignores comments, blank lines, and unrecognized directives', () => {
    const config = [
      '# a comment',
      '',
      'Host myserver',
      '  # another comment',
      '  HostName 10.0.0.1',
      '  ProxyJump bastion',
      '  ServerAliveInterval 30',
      '',
    ].join('\n');

    const result = parseSshConfig(config, homeDir);

    expect(result).toEqual([
      {
        alias: 'myserver',
        hostname: '10.0.0.1',
        port: 22,
        username: expect.any(String),
        identityFile: null,
      },
    ]);
  });

  it('ignores directives that appear before any Host block', () => {
    const result = parseSshConfig('ServerAliveInterval 30\n\nHost myserver\n  HostName 10.0.0.1\n', homeDir);

    expect(result).toHaveLength(1);
    expect(result[0].alias).toBe('myserver');
  });

  it('strips quotes from values', () => {
    const result = parseSshConfig('Host myserver\n  IdentityFile "~/.ssh/my key"\n', homeDir);

    expect(result[0].identityFile).toBe('/home/testuser/.ssh/my key');
  });

  it('returns an empty array for empty content', () => {
    expect(parseSshConfig('', homeDir)).toEqual([]);
  });

  it('ignores an invalid port value and keeps the default', () => {
    const result = parseSshConfig('Host myserver\n  Port notanumber\n', homeDir);

    expect(result[0].port).toBe(22);
  });
});
