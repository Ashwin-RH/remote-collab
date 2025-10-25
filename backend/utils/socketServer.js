// socketServer.js
let io;

export const initIO = async (server) => {
  const { Server } = await import("socket.io");
  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });
  return io;
};


export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

export default getIO;
