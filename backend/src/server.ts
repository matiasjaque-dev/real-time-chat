import { createServer } from "http";
import { app } from "./app";
import { setupSocket } from "./config/socket";
import { registerChatGateway } from "./modules/chat/chat.gateway";

const PORT = process.env.PORT || 4000;

const httpServer = createServer(app);

export const io = setupSocket(httpServer);
registerChatGateway(io);

httpServer.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
