/**
 * Logger minimal à niveaux (debug/info/warn/error), utilisable côté serveur
 * ET client. Remplace les appels bruts à `console.*` conformément à
 * `.claude/rules/code-style.md` (« console.log interdit en production —
 * utiliser logger.info/warn/error »).
 *
 * S'appuie sur `console` sous le capot (Vercel capture stdout/stderr) :
 * error → console.error, warn → console.warn, info/debug → console.log.
 * `debug` est muet en production. `meta`, s'il est fourni, est sérialisé
 * (JSON.stringify, fallback String) et ajouté en fin de ligne.
 */
/* eslint-disable no-console */

type Level = 'debug' | 'info' | 'warn' | 'error';

function serialize(meta: unknown): string {
  if (typeof meta === 'string') return meta;
  if (meta instanceof Error) return meta.stack ?? `${meta.name}: ${meta.message}`;
  try {
    return JSON.stringify(meta, (_key, value) =>
      value instanceof Error
        ? { name: value.name, message: value.message, stack: value.stack }
        : value,
    );
  } catch {
    return String(meta);
  }
}

function emit(level: Level, message: string, meta?: unknown): void {
  if (level === 'debug' && process.env.NODE_ENV === 'production') return;
  const line = `[${level}] ${message}`;
  const write = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (meta === undefined) write(line);
  else write(line, serialize(meta));
}

export const logger = {
  debug: (message: string, meta?: unknown) => emit('debug', message, meta),
  info: (message: string, meta?: unknown) => emit('info', message, meta),
  warn: (message: string, meta?: unknown) => emit('warn', message, meta),
  error: (message: string, meta?: unknown) => emit('error', message, meta),
};
