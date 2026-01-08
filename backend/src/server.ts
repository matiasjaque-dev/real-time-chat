import { createServer } from "http";
import { app } from "./app";

const PORT = process.env.PORT || 4000;

const httpServer = createServer(app);

httpServer.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
