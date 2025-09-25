// frontend/src/socket.js
import { io } from "socket.io-client";

let socket;

export const getSocket = (token) => {
  if (!socket) {
    socket = io("http://localhost:4000", { auth: { token } });
  }
  return socket;
};
