const { io } = require("socket.io-client");

console.log("?? Attempting connection to http://localhost:3001...\n");

const socket = io("http://localhost:3001", {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 3,
  timeout: 10000
});

socket.on("connect", () => {
  console.log("? Connected:", socket.id);
  console.log("   Transport:", socket.io.engine.transport.name);
  
  socket.emit("auth:login", { userId: "test-user-1", username: "TestUser" });
  socket.emit("grid:join", "grid:forum");
});

socket.on("auth:success", (data) => {
  console.log("? Auth success:", data);
});

socket.on("grid:joined", (data) => {
  console.log("? Joined room:", data);
});

socket.on("connect_error", (err) => {
  console.error("? Connection Error:");
  console.error("   Message:", err.message);
  console.error("   Description:", err.description);
  console.error("   Context:", err.context);
  console.error("   Type:", err.type);
  console.error("   Full error:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
});

socket.on("error", (err) => {
  console.error("? Socket Error:", err);
});

socket.io.on("error", (err) => {
  console.error("? Manager Error:", err);
});

socket.io.on("reconnect_attempt", (attempt) => {
  console.log("?? Reconnect attempt:", attempt);
});

socket.io.on("reconnect_failed", () => {
  console.error("? Reconnection failed");
});

socket.on("disconnect", (reason) => {
  console.log("?? Disconnected:", reason);
});

setTimeout(() => {
  console.log("\n?? Final Status:");
  console.log("   Connected:", socket.connected);
  console.log("   Disconnected:", socket.disconnected);
  console.log("\n? Test complete, disconnecting...");
  socket.disconnect();
  process.exit(0);
}, 8000);
