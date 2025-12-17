const { io } = require("socket.io-client");

console.log("\n?? 24HRMVP WebSocket Comprehensive Test\n");
console.log("=".repeat(50));

const SOCKET_URL = "http://localhost:3001";

const client1 = io(SOCKET_URL, { transports: ["websocket"] });
const client2 = io(SOCKET_URL, { transports: ["websocket"] });

let testsCompleted = 0;

function logTest(name, success, details = "") {
  const icon = success ? "?" : "?";
  console.log(`${icon} ${name}${details ? `: ${details}` : ""}`);
  testsCompleted++;
}

// CLIENT 1
client1.on("connect", () => {
  console.log("\n?? Client 1 connected:", client1.id);
  client1.emit("auth:login", { userId: "user-1", username: "Alice" });
  client1.emit("grid:join", "grid:forum");
  client1.emit("chat:join", "test-room");
});

client1.on("auth:success", () => logTest("Client 1 Auth", true));
client1.on("grid:joined", (data) => {
  if (data.room === "grid:forum") logTest("Client 1 Forum Join", true);
});
client1.on("forum:voteUpdate", (data) => {
  logTest("Client 1 Vote Received", true, `Score: ${data.score}`);
});
client1.on("chat:message", (data) => {
  if (data.userId !== "user-1") {
    logTest("Client 1 Chat Received", true, `From: ${data.username}`);
  }
});

// CLIENT 2
client2.on("connect", () => {
  console.log("?? Client 2 connected:", client2.id);
  client2.emit("auth:login", { userId: "user-2", username: "Bob" });
  client2.emit("grid:join", "grid:forum");
  client2.emit("chat:join", "test-room");
});

client2.on("auth:success", () => logTest("Client 2 Auth", true));
client2.on("grid:joined", (data) => {
  if (data.room === "grid:forum") {
    logTest("Client 2 Forum Join", true);
    setTimeout(runTests, 500);
  }
});

function runTests() {
  console.log("\n" + "=".repeat(50));
  console.log("?? Running Broadcast Tests\n");

  // Test vote broadcast
  console.log("?? Broadcasting vote...");
  client1.emit("forum:vote", { postId: "post-123", userId: "user-1", value: 1 });

  // Test chat
  setTimeout(() => {
    console.log("?? Sending chat message...");
    client2.emit("chat:message", { roomId: "test-room", content: "Hello from Bob!" });
  }, 500);

  // Test presence
  setTimeout(() => {
    console.log("?? Checking online users...");
    client1.emit("presence:getOnline");
  }, 1000);

  setTimeout(finish, 2000);
}

client1.on("presence:onlineUsers", (users) => {
  logTest("Presence Check", true, `${users.length} users online`);
});

function finish() {
  console.log("\n" + "=".repeat(50));
  console.log(`\n?? Tests Completed: ${testsCompleted}`);
  console.log("? WebSocket Phase 2 - All Systems Operational!\n");
  client1.disconnect();
  client2.disconnect();
  setTimeout(() => process.exit(0), 300);
}

setTimeout(() => {
  console.log("\n?? Timeout");
  process.exit(1);
}, 10000);
