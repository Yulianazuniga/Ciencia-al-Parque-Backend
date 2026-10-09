import { createServer } from "node:http";
import { Server } from "socket.io";
import app from "./app.js";
import { PORT } from "./config/config.js";
import { connectDB } from "./database/database.js";
import { registerStatsSocket } from "./estadisticas/sockets/stats.socket.js";
import { FRONTEND_DEV_URL, FRONTEND_STG_URL, FRONTEND_PROD_URL } from "./config/token.js";

const origenes = [FRONTEND_DEV_URL, FRONTEND_STG_URL, FRONTEND_PROD_URL].filter(Boolean);

async function main() {
  try {
    await connectDB();

    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: { origin: origenes.length ? origenes : true, credentials: true }
    });

    registerStatsSocket(io);

    httpServer.listen(PORT, () => console.log(`Server on port ${PORT}`));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
