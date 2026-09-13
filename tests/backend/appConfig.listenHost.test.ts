import { normalizeListenHost, normalizeAppConfig } from '@backend/services/appConfig';
import type { AppConfig } from '@backend/types';

function baseAppConfig(listenHost: AppConfig['app']['listen_host']): AppConfig {
  return {
    app: {
      name: 'webmux',
      listen_host: listenHost,
      http_port: 8080,
      https_port: 8443,
      secure_mode: false,
      trusted_http_allowed: true,
      default_term: { cols: 80, rows: 24, font_size: 14 },
      transport: { prefer_mosh: false, ssh_fallback: true, mosh_server_path: '' },
    },
  };
}

describe('normalizeListenHost', () => {
  it('defaults to 0.0.0.0 when unset', () => {
    expect(normalizeListenHost(undefined)).toEqual(['0.0.0.0']);
  });

  it('wraps a single string host in an array', () => {
    expect(normalizeListenHost('172.21.30.178')).toEqual(['172.21.30.178']);
  });

  it('splits a comma-separated string into multiple hosts', () => {
    expect(normalizeListenHost('172.21.30.178, 100.107.185.7')).toEqual([
      '172.21.30.178',
      '100.107.185.7',
    ]);
  });

  it('accepts a YAML list of hosts', () => {
    expect(normalizeListenHost(['172.21.30.178', '100.107.185.7'])).toEqual([
      '172.21.30.178',
      '100.107.185.7',
    ]);
  });

  it('drops blank entries and de-duplicates', () => {
    expect(normalizeListenHost(['172.21.30.178', '', '172.21.30.178'])).toEqual([
      '172.21.30.178',
    ]);
  });

  it('falls back to 0.0.0.0 when only blank entries are given', () => {
    expect(normalizeListenHost([' ', ''])).toEqual(['0.0.0.0']);
  });
});

describe('normalizeAppConfig listen_host', () => {
  it('normalizes a comma-separated listen_host string into an array', () => {
    const normalized = normalizeAppConfig(baseAppConfig('172.21.30.178,100.107.185.7'));
    expect(normalized.app.listen_host).toEqual(['172.21.30.178', '100.107.185.7']);
  });
});
