import { io } from "socket.io-client";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

let socket;

export const getSocket = (token) => {
  if (!socket) {
    socket = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Socket connected with ID:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("Socket disconnected");
  }
};
