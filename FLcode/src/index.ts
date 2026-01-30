import http from 'http';
import { app } from './server';

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`FLcode server listening on http://0.0.0.0:${PORT}`);
  console.log(`  - 用户端: http://localhost:${PORT}/`);
  console.log(`  - 管理端: http://localhost:${PORT}/admin`);
});

