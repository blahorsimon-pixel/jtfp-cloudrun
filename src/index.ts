import http from 'http';
import { app } from './server';
import { config } from './config/index';

const server = http.createServer(app);

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`H5 Mall server listening on http://0.0.0.0:${config.port}`);
  // PM2 cluster 模式：通知 ready 后才开始接流量（零停机 reload）
  if (typeof process.send === 'function') {
    process.send('ready');
  }
});

