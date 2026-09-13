import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportSshConfigDialog } from '@frontend/components/ImportSshConfigDialog';

const mockApi = vi.hoisted(() => ({
  getSshConfigHosts: vi.fn(),
  importSshConfigHosts: vi.fn(),
}));

vi.mock('@frontend/utils/api', () => ({
  api: mockApi,
}));

describe('ImportSshConfigDialog', () => {
  const onClose = vi.fn();
  const onImported = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getSshConfigHosts.mockResolvedValue([
      { alias: 'foo', hostname: 'foo.example.com', port: 22, username: 'alice', identityFile: '/home/alice/.ssh/id_rsa', alreadyImported: false },
      { alias: 'bar', hostname: 'bar.example.com', port: 2222, username: 'bob', identityFile: null, alreadyImported: true },
    ]);
    mockApi.importSshConfigHosts.mockResolvedValue({
      created: [{ id: 'h-new', name: 'foo', hostname: 'foo.example.com', port: 22, username: 'alice', tags: [], mosh_allowed: false }],
      skipped: [],
    });
  });

  it('lists parsed candidates and pre-selects the ones not already imported', async () => {
    render(<ImportSshConfigDialog onClose={onClose} onImported={onImported} />);

    await waitFor(() => {
      expect(screen.getByText('foo')).toBeDefined();
    });
    expect(screen.getByText('bar')).toBeDefined();
    expect(screen.getByText('already added')).toBeDefined();

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes[0].checked).toBe(true); // foo: not yet imported
    expect(checkboxes[1].checked).toBe(false); // bar: already imported
    expect(checkboxes[1].disabled).toBe(true);
  });

  it('shows an empty state when there are no candidates', async () => {
    mockApi.getSshConfigHosts.mockResolvedValue([]);
    render(<ImportSshConfigDialog onClose={onClose} onImported={onImported} />);

    await waitFor(() => {
      expect(screen.getByText('No hosts found in ~/.ssh/config.')).toBeDefined();
    });
  });

  it('imports the selected aliases and closes on success', async () => {
    render(<ImportSshConfigDialog onClose={onClose} onImported={onImported} />);

    await waitFor(() => {
      expect(screen.getByText('foo')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Import Selected (1)'));

    await waitFor(() => {
      expect(mockApi.importSshConfigHosts).toHaveBeenCalledWith(['foo']);
    });
    expect(onImported).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'h-new', name: 'foo' }),
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an error and stays open when the import fails', async () => {
    mockApi.importSshConfigHosts.mockRejectedValue(new Error('boom'));
    render(<ImportSshConfigDialog onClose={onClose} onImported={onImported} />);

    await waitFor(() => {
      expect(screen.getByText('foo')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Import Selected (1)'));

    await waitFor(() => {
      expect(screen.getByText('boom')).toBeDefined();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('toggling a checkbox updates the selected count', async () => {
    render(<ImportSshConfigDialog onClose={onClose} onImported={onImported} />);

    await waitFor(() => {
      expect(screen.getByText('foo')).toBeDefined();
    });
    fireEvent.click(screen.getByText('foo'));

    expect(screen.getByText('Import Selected (0)')).toBeDefined();
  });
});
