import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { Session } from '../types';
import { LOGS_DIR, persistence } from './persistenceManager';

export interface TranscriptSink {
  write(data: string): void;
  close(): Promise<void>;
}

export type TranscriptSinkFactory = (
  file: string,
  onError: (error: Error) => void,
) => TranscriptSink;

interface ActiveTranscript {
  sessionId: string;
  generation: number;
  file: string;
  sink: TranscriptSink;
}

class FileTranscriptSink implements TranscriptSink {
  private readonly stream: fs.WriteStream;
  private readonly closed: Promise<void>;
  private ending = false;

  constructor(file: string, onError: (error: Error) => void) {
    const fd = fs.openSync(file, 'wx', 0o600);
    try {
      if (process.platform !== 'win32') fs.fchmodSync(fd, 0o600);
      this.stream = fs.createWriteStream(file, {
        fd,
        autoClose: true,
        encoding: 'utf8',
      });
    } catch (error) {
      fs.closeSync(fd);
      throw error;
    }

    this.closed = new Promise(resolve => {
      this.stream.once('close', resolve);
    });
    this.stream.on('error', onError);
  }

  write(data: string): void {
    if (!this.ending) this.stream.write(data);
  }

  async close(): Promise<void> {
    if (!this.ending) {
      this.ending = true;
      this.stream.end();
    }
    await this.closed;
  }
}

function defaultSinkFactory(file: string, onError: (error: Error) => void): TranscriptSink {
  return new FileTranscriptSink(file, onError);
}

function safeSessionId(sessionId: string): string {
  return sessionId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'session';
}

function fileTimestamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export class SessionTranscriptLogger {
  private readonly active = new Map<string, ActiveTranscript>();
  private readonly pending = new Set<Promise<void>>();

  constructor(private readonly sinkFactory: TranscriptSinkFactory = defaultSinkFactory) {}

  private enabled(): boolean {
    try {
      return persistence.loadApp().app.session_logging?.enabled === true;
    } catch (error) {
      console.error('Could not read session logging configuration:', error);
      return false;
    }
  }

  private track(operation: Promise<void>): void {
    const tracked = operation
      .catch(error => console.error('Session transcript operation failed:', error))
      .finally(() => this.pending.delete(tracked));
    this.pending.add(tracked);
  }

  private audit(event: Record<string, unknown>): void {
    this.track(persistence.appendEvent(event));
  }

  start(session: Session, generation: number): string | undefined {
    this.stop(session.id, undefined, 'relaunch');
    if (!this.enabled()) return undefined;

    const directory = path.join(LOGS_DIR, 'sessions');
    const id = safeSessionId(session.id);
    const nonce = crypto.randomBytes(4).toString('hex');
    const file = path.join(directory, `session-${id}-${fileTimestamp()}-g${generation}-${nonce}.log`);

    try {
      fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
      if (process.platform !== 'win32') fs.chmodSync(directory, 0o700);

      const onError = (error: Error): void => {
        this.fail(session.id, generation, file, error);
      };
      const sink = this.sinkFactory(file, onError);
      const active = { sessionId: session.id, generation, file, sink };
      this.active.set(session.id, active);

      this.audit({
        type: 'session_transcript_started',
        session_id: session.id,
        launch_generation: generation,
        path: file,
      });
      this.write(session.id, generation, `[webmux transcript started ${new Date().toISOString()} session=${id} launch=${generation}]\r\n`);
      if (!this.active.has(session.id)) return undefined;
      console.log(`Transcript logging started for session ${session.id}: ${file}`);
      return file;
    } catch (error) {
      console.error(`Failed to start transcript logging for session ${session.id}:`, error);
      this.audit({
        type: 'session_transcript_error',
        session_id: session.id,
        launch_generation: generation,
        path: file,
        error: (error as Error).message,
      });
      return undefined;
    }
  }

  write(sessionId: string, generation: number, data: string): void {
    const active = this.active.get(sessionId);
    if (!active || active.generation !== generation) return;
    try {
      active.sink.write(data);
    } catch (error) {
      this.fail(sessionId, generation, active.file, error as Error);
    }
  }

  stop(sessionId: string, generation: number | undefined, reason: string): void {
    const active = this.active.get(sessionId);
    if (!active || (generation !== undefined && active.generation !== generation)) return;
    this.active.delete(sessionId);

    try {
      active.sink.write(`[webmux transcript stopped ${new Date().toISOString()} reason=${reason}]\r\n`);
    } catch (error) {
      console.error(`Failed to finish transcript logging for session ${sessionId}:`, error);
    }
    this.track(active.sink.close());
    this.audit({
      type: 'session_transcript_stopped',
      session_id: sessionId,
      launch_generation: active.generation,
      path: active.file,
      reason,
    });
  }

  private fail(sessionId: string, generation: number, file: string, error: Error): void {
    const active = this.active.get(sessionId);
    if (!active || active.generation !== generation || active.file !== file) return;
    this.active.delete(sessionId);
    console.error(`Transcript logging failed for session ${sessionId}:`, error);
    this.track(active.sink.close());
    this.audit({
      type: 'session_transcript_error',
      session_id: sessionId,
      launch_generation: generation,
      path: file,
      error: error.message,
    });
    this.audit({
      type: 'session_transcript_stopped',
      session_id: sessionId,
      launch_generation: generation,
      path: file,
      reason: 'write_error',
    });
  }

  async stopAll(reason: string): Promise<void> {
    for (const sessionId of Array.from(this.active.keys())) {
      this.stop(sessionId, undefined, reason);
    }
    while (this.pending.size > 0) {
      await Promise.all(Array.from(this.pending));
    }
  }
}
