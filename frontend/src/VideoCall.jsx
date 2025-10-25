import {
  Clock1,
  Hand,
  LogOut,
  Mic,
  MicOff,
  ScreenShare,
  ScreenShareOff,
  Video,
  VideoOff,
} from "lucide-react";
import React, { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";
import Timer from "./Timer";

import { Workspace } from "../../backend/models/Workspace";
export default function VideoCall({ workspaceId, user, socket }) {
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnections = useRef({});
  const audioAnalyzers = useRef({});
  const socketRef = useRef(null);

  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [spotlightId, setSpotlightId] = useState(null);
  const [callStartTime, setCallStartTime] = useState(null);
  const [raisedHands, setRaisedHands] = useState({});

 

  useEffect(() => {
    if (!workspaceId) return;
    console.log("workspaceId:", workspaceId);


    const socket = io("http://localhost:4000", {
      auth: { token: localStorage.getItem("token") },
    });
    socketRef.current = socket;

    async function startCall() {
      try {
        console.log("🎬 Starting call...");

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log("✅ Got stream:", stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setCallStartTime(Date.now());
        setupAudioLevelDetection("you", stream);

        socket.emit("join-room", workspaceId);

        socket.on("user-joined", async (peerId) => {
          await createAndOffer(peerId, stream);
        });

        socket.on("offer", async ({ offer, from }) => {
          await handleOffer(from, offer, stream);
        });

        socket.on("answer", async ({ answer, from }) => {
          const pc = peerConnections.current[from];
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on("ice-candidate", async ({ candidate, from }) => {
          const pc = peerConnections.current[from];
          if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        });
      } catch (err) {
        console.error("Media permissions denied or error:", err);
      }
    }

    const createAndOffer = async (peerId, stream) => {
      const pc = createPeerConnection(peerId);
      peerConnections.current[peerId] = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("offer", { offer, to: peerId });
    };

    const handleOffer = async (peerId, offer, stream) => {
      const pc = createPeerConnection(peerId);
      peerConnections.current[peerId] = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit("answer", { answer, to: peerId });
    };

    const createPeerConnection = (peerId) => {
      const pc = new RTCPeerConnection();

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
        setupAudioLevelDetection(peerId, stream);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit("ice-candidate", { candidate: event.candidate, to: peerId });
        }
      };

      return pc;
    };

    const setupAudioLevelDetection = (id, stream) => {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 512;
      audioAnalyzers.current[id] = { analyser, id };
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      let lastSpotlight = 0;
      const detect = () => {
        analyser.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        if (volume > 20 && Date.now() - lastSpotlight > 1000) {
          setSpotlightId(id);
          lastSpotlight = Date.now();
        }
        requestAnimationFrame(detect);
      };
      detect();
    };

    startCall();

    return () => leaveCall();
  }, [workspaceId]);

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsMuted((prev) => !prev);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsCameraOn((prev) => !prev);
  };

  const toggleScreenShare = async () => {
    if (!localStreamRef.current) return;
    if (!screenSharing) {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const videoTrack = screenStream.getVideoTracks()[0];
      Object.values(peerConnections.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        sender?.replaceTrack(videoTrack);
      });
      videoTrack.onended = () => toggleScreenShare();
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
      setScreenSharing(true);
    } else {
      const stream = localStreamRef.current;
      Object.values(peerConnections.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        sender?.replaceTrack(stream.getVideoTracks()[0]);
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setScreenSharing(false);
    }
  };

  const raiseHand = () => {
    setRaisedHands((prev) => ({ ...prev, you: !prev.you }));
  };

  const leaveCall = () => {
    // Stop local tracks
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    // Close peers
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    // Stop audio analyzers
    Object.values(audioAnalyzers.current).forEach(({ analyser }) => analyser.disconnect?.());
    audioAnalyzers.current = {};
    setRemoteStreams({});
    setCallStartTime(null);
    // Leave socket room & disconnect
    socketRef.current?.emit("workspace:leave", workspaceId);
    socketRef.current?.disconnect();
  };

  const participantEntries = Object.entries(remoteStreams);
  const displayEntries = spotlightId
    ? participantEntries.filter(([id]) => id === spotlightId)
    : participantEntries;

  return (
    <div className="relative flex flex-col h-full w-full bg-[#020617] border-2 border-gray-400 rounded-xl overflow-hidden">
      <h3 className="font-bold absolute mt-2 mx-4 mb-1 z-50 text-center border-2 border-gray-600 rounded-xl w-30 text-gray-400 hover:text-gray-300 duration-500 cursor-default">
       Video call
      </h3>
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(circle 500px at 50% 300px, rgba(16,185,129,0.35), transparent)`,
        }}
      />
      {callStartTime && <Timer startTime={callStartTime} />}


      <div className="relative mt-10 z-10 flex flex-wrap justify-center gap-3 px-3 py-2.5 flex-1 overflow-auto">
        
        <div className={`relative flex-shrink-0 ${spotlightId === "you" ? "w-56 h-40" : "w-40 h-28"}`}>
          <video ref={localVideoRef} autoPlay muted playsInline className="rounded-xl border-2 border-blue-400 w-full h-full bg-black" />
          <p className="absolute bottom-1 left-1 text-white text-xs rounded-xl bg-gray-800/60 px-1">
            You {isMuted ? "(Muted)" : ""}
          </p>
        </div>

        {displayEntries.map(([peerId, stream]) => (
          <div key={peerId} className={`relative flex-shrink-0 ${spotlightId === peerId ? "w-56 h-40" : "w-40 h-28"}`}>
            <video autoPlay playsInline ref={(vid) => vid && (vid.srcObject = stream)} className="rounded-xl w-full h-full bg-black" />
            <p className="absolute bottom-1 left-1 text-white text-xs rounded-md bg-gray-800/60 px-1">
              {peerId} {raisedHands[peerId] ? "✋" : ""}
            </p>
          </div>
        ))}
      </div>

      <div className="relative z-20 flex items-center left-1/2 -translate-x-1/2 justify-center w-70 rounded-2xl mb-3 gap-2 px-1 py-1.5 bg-transparent hover:bg-gray-900/40 hover:shadow-2xl hover:shadow-white/20 duration-1000 will-change-transform backdrop-blur-md">
        <button onClick={toggleMute} className="p-2 rounded-2xl hover:rounded-xl bg-gray-700 hover:bg-gray-600/60 hover:scale-110 duration-300 transition-all will-change-transform cursor-pointer">
          {isMuted ? <MicOff className="text-amber-500" /> : <Mic className="text-green-500" />}
        </button>
        <button onClick={toggleCamera} className="p-2 rounded-2xl hover:rounded-xl bg-gray-700 hover:bg-gray-600/60 hover:scale-110 duration-300 cursor-pointer">
          {isCameraOn ? <Video /> : <VideoOff />}
        </button>
        <button onClick={toggleScreenShare} className="p-2 rounded-2xl hover:rounded-xl bg-gray-700 hover:bg-gray-600/60 hover:scale-110 duration-300 cursor-pointer">
          {screenSharing ? <ScreenShareOff /> : <ScreenShare />}
        </button>
        <button onClick={raiseHand} className="p-2 rounded-2xl hover:rounded-xl bg-gray-700 hover:bg-gray-600/60 hover:scale-110 text-yellow-500 duration-300 cursor-pointer">
          <Hand size={25} />
        </button>
        <button onClick={leaveCall} className="p-2 rounded-2xl hover:rounded-xl bg-gray-700 hover:bg-gray-600/60 hover:text-red-600 hover:scale-110 duration-300 cursor-pointer">
          <LogOut />
        </button>
      </div>
    </div>
  );
}
