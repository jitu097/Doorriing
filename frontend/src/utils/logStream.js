const LOG_STREAM_ENABLED = import.meta.env.VITE_LOG_STREAM_ENABLED === 'true';
const LOG_STREAM_URL = import.meta.env.VITE_LOG_STREAM_URL;
const LOG_STREAM_TOKEN = import.meta.env.VITE_LOG_STREAM_TOKEN;

const formatLogPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { level: 'log', message: String(payload || '') };
  }

  const level = String(payload.level || 'log').toLowerCase();
  return {
    level,
    message: payload.message || '',
    source: payload.source || 'server',
    timestamp: payload.timestamp,
  };
};

export const startLogStream = () => {
  if (!LOG_STREAM_ENABLED || !LOG_STREAM_URL) {
    return null;
  }

  let url;
  try {
    url = new URL(LOG_STREAM_URL);
  } catch (error) {
    console.warn('[log-stream] Invalid URL', error);
    return null;
  }

  if (LOG_STREAM_TOKEN) {
    url.searchParams.set('token', LOG_STREAM_TOKEN);
  }

  const socket = new WebSocket(url.toString());

  socket.addEventListener('message', (event) => {
    try {
      const payload = JSON.parse(event.data);
      const entry = formatLogPayload(payload);
      const logFn = console[entry.level] || console.log;
      logFn(`[${entry.source}] ${entry.message}`);
    } catch (error) {
      console.warn('[log-stream] Failed to parse log message', error);
    }
  });

  socket.addEventListener('error', () => {
    console.warn('[log-stream] Connection error');
  });

  socket.addEventListener('close', () => {
    console.warn('[log-stream] Connection closed');
  });

  return socket;
};
