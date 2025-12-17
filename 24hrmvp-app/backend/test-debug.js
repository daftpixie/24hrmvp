const { io } = require("socket.io-client");

console.log("\n🔍 WebSocket Debug Test\n");

const socket = io("http://localhost:3001", { 
  transports: ["websocket", "polling"] 
});

// Log ALL events
socket.onAny((event, ...args) => {
  console.log(`📨 Event: ${event}`, JSON.stringify(args, null, 2));
});

socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);
  
  // Test auth
  console.log("\n📤 Sending auth:login...");
  socket.emit("auth:login", { userId: "debug-user", username: "DebugUser" });
  
  // Test room join
  setTimeout(() => {
    console.log("📤 Sending grid:join...");
    socket.emit("grid:join", "grid:forum");
  }, 500);
  
  // Test vote
  setTimeout(() => {
    console.log("📤 Sending forum:vote...");
    socket.emit("forum:vote", { postId: "test-post", userId: "debug-user", value: 1 });
  }, 1000);
  
  // Finish
  setTimeout(() => {
    console.log("\n✅ Debug test complete");
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on("connect_error", (err) => {
  console.error("❌ Connection error:", err.message);
});

socket.on("disconnect", (reason) => {
  console.log("🔌 Disconnected:", reason);
});

setTimeout(() => {
  console.log("⚠️ Timeout after 10s");
  process.exit(1);
}, 10000);
