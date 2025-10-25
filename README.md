# Remote Work Collaboration Suite

A full-stack, browser-based platform designed to streamline collaboration among remote and hybrid teams. This suite integrates real-time document editing, video conferencing, whiteboarding, task management, and team chat into a single cohesive application, eliminating the need to switch between multiple tools.

🔗 [Live Demo](https://remote-collab-gules.vercel.app) 

---

## 🚀 Project Overview

The **Remote Work Collaboration Suite** provides a unified solution for distributed teams, enhancing productivity and communication through the following core modules:

### 📝 Real-Time Document Collaboration
- Collaborative editor powered by **Yjs (CRDT)** and **WebSocket (y-websocket)**.  
- Real-time synchronization and conflict resolution.  
- Periodic data persistence to **PostgreSQL**.

### 📹 Video Conferencing
- Peer-to-peer video and audio calls using **WebRTC**.  
- Signaling server with **Socket.io** for session management.  
- Group video calls with room-based architecture.

### 🖊 Collaborative Whiteboard
- Interactive digital whiteboard built with **Excalidraw** or **Fabric.js**.  
- Real-time synchronization via **Socket.io**.  
- Features include drawing, shapes, colors, erasers, and export functionality.

### 📋 Task Boards
- Kanban-style task boards for project management.  
- Real-time updates pushed to all connected clients via **WebSockets**.  
- Data stored in **PostgreSQL**.

### 💬 Integrated Team Chat
- Persistent chat module for real-time communication.  
- Built using **Socket.io** for live messages and **PostgreSQL** for message history.  
- Supports text, emojis, and notifications.

### 🔐 Authentication & User Management
- Secure authentication with **JWT** or **Supabase**.  
- Role-based access control.  
- Online/offline presence tracking using **Redis**.

---

## 🧰 Tech Stack

- **Frontend**: React, Tailwind CSS, Excalidraw/Fabric.js  
- **Backend**: Node.js, Express, Socket.io, Yjs, WebRTC  
- **Database**: PostgreSQL  
- **Authentication**: JWT or Supabase  
- **Real-Time Sync**: Yjs, WebSocket (y-websocket), Socket.io  
- **Presence Management**: Redis  
- **Deployment**: Vercel (Frontend), Docker (Backend)  

---

## 📦 Installation

### Prerequisites
- Node.js (v16+)  
- PostgreSQL  
- Redis (for presence management)

### Backend Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/Ashwin-RH/remote-collab.git
   cd remote-collab/backend


2. Install Dependecies:
   ```bash
   npm install
3.Configure environment variables:

DB_HOST, DB_USER, DB_PASS, DB_NAME

REDIS_HOST, REDIS_PORT

JWT_SECRET
4. Run the backend server:
   ```bash
   npm start
```

### Frontend Setup

1.Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2.Install dependencies:
   ```bash
   npm install
   ```

3.Run the frontend development server:
   ```bash
npm start
```

### Testing

- **Unit & Integration Tests**: Jest for backend services.
- **End-to-End Tests**: Cypress for frontend testing.
- **Real-Time Collaboration**: Manual testing with multiple users to ensure synchronization.


### Deployment

- **Frontend**: Deployed on Vercel for seamless CI/CD integration.
- **Backend**: Dockerized for easy deployment on any platform.
- **WebRTC Signaling Server**: Configured with TURN/STUN servers for reliable peer-to-peer connections.
