import React, { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:4000"); // Replace with backend URL

export default function VideoCall() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const [roomId] = useState("playground-room"); // fixed room for now

  useEffect(() => {
    async function startCall() {
      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create RTCPeerConnection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Show remote stream
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            candidate: event.candidate,
            to: currentPeerIdRef.current,
          });
        }
      };

      // Join room
      socket.emit("join-room", roomId);

      // When a new user joins → send them an offer
      socket.on("user-joined", async (peerId) => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        currentPeerIdRef.current = peerId;

        socket.emit("offer", { offer, to: peerId });
      });

      // Handle receiving an offer
      socket.on("offer", async ({ offer, from }) => {
        currentPeerIdRef.current = from;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { answer, to: from });
      });

      // Handle receiving an answer
      socket.on("answer", async ({ answer }) => {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      // Handle receiving ICE candidates
      socket.on("ice-candidate", async ({ candidate }) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ICE candidate", err);
        }
      });
    }

    const currentPeerIdRef = { current: null };
    startCall();

    return () => {
      socket.disconnect();
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [roomId]);

  return (
    <div className="flex flex-col items-center p-4 bg-gray-900 min-h-screen text-white">
      {/* Local video */}
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className="rounded-xl border-2 border-blue-400 w-80 h-56 bg-black mb-4"
      />
      <p>You</p>

      {/* Remote video */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="rounded-xl border-2 border-green-400 w-80 h-56 bg-black mt-4"
      />
      <p>Remote</p>
    </div>
  );
}
