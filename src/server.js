import net from 'net';
import { config } from './config/config.js';
import initServer from './init/index.js';
import { onConnection } from './events/onConnection.js';

const server = net.createServer(onConnection);

initServer()
  .then(() => {
    server.listen(config.server.port, config.server.host, () => {
      console.log(`서버가 ${config.server.host}:${config.server.port}에서 실행되었습니다.`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
