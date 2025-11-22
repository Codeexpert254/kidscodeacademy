import React, { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const Session = () => {
  const params = useParams();
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);

  // Basic STUN server for dev; replace with TURN in production
  const iceServers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  useEffect(() => {
    // if room id provided in URL params, prefill and auto-join
    if (params?.roomId) {
      setRoomId(params.roomId);
      // small timeout to allow refs to initialize
      setTimeout(() => {
        joinRoom(params.roomId).catch((e) =>
          console.error("Auto-join failed:", e)
        );
      }, 200);
    }

    return () => {
      // cleanup on unmount
      leaveRoom();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startLocalStream = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error("Failed to get local media:", err);
      throw err;
    }
  };

  const createPeer = (remoteSocketId) => {
    const pc = new RTCPeerConnection(iceServers);
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit("ice-candidate", {
          to: remoteSocketId,
          candidate: e.candidate,
        });
      }
    };
    pc.ontrack = (e) => {
      if (remoteVideoRef.current)
        remoteVideoRef.current.srcObject = e.streams[0];
    };
    // add local tracks
    const localStream = localStreamRef.current;
    if (localStream) {
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
    }
    return pc;
  };

  const joinRoom = async (explicitRoomId) => {
    const rId = explicitRoomId || roomId;
    if (!rId) return alert("Enter room ID");
    try {
      await startLocalStream();
    } catch (err) {
      // Provide clearer guidance when media access fails
      const name = err && err.name ? err.name : "UnknownError";
      console.error("startLocalStream failed:", err);
      if (name === "NotAllowedError" || name === "SecurityError") {
        alert(
          "Camera/microphone access was denied. Please allow access and try again."
        );
      } else if (name === "NotFoundError") {
        alert(
          "No camera or microphone found. Please connect a device and try again."
        );
      } else {
        alert("Failed to access camera/microphone: " + (err.message || name));
      }
      return;
    }
    socketRef.current = io(SERVER_URL);

    socketRef.current.on("connect", () => {
      console.log("socket connected", socketRef.current.id);
      socketRef.current.emit("join-room", { roomId: rId }, async (res) => {
        if (res && res.error) {
          console.error("join-room error:", res.error);
          return alert(res.error);
        }
        setJoined(true);
        // if there are others, initiate offer to each
        const others = res.others || [];
        for (const otherId of others) {
          // create peer and offer
          const pc = createPeer(otherId);
          pcRef.current = pc;
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current.emit("offer", { to: otherId, offer });
          } catch (err) {
            console.error("Offer failed:", err);
          }
        }
      });
    });

    socketRef.current.on("user-joined", async ({ socketId }) => {
      // someone else joined; create peer and be ready to receive offer/answer
      console.log("user-joined", socketId);
    });

    socketRef.current.on("offer", async ({ from, offer }) => {
      console.log("received offer from", from);
      const pc = createPeer(from);
      pcRef.current = pc;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current.emit("answer", { to: from, answer });
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    });

    socketRef.current.on("answer", async ({ from, answer }) => {
      console.log("received answer from", from);
      try {
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      } catch (err) {
        console.error("Error setting remote description from answer:", err);
      }
    });

    socketRef.current.on("ice-candidate", async ({ from, candidate }) => {
      try {
        if (pcRef.current && candidate)
          await pcRef.current.addIceCandidate(candidate);
      } catch (err) {
        console.error("Error adding remote ice candidate:", err);
      }
    });

    socketRef.current.on("receive-message", (data) => {
      setMessages((m) => [...m, data]);
    });
  };

  // Ensure the local video element is attached to the stream once it exists
  useEffect(() => {
    if (localStreamRef.current && localVideoRef.current) {
      try {
        localVideoRef.current.srcObject = localStreamRef.current;
      } catch (err) {
        console.warn("Failed to attach local stream to video element:", err);
      }
    }
  }, [joined]);

  const leaveRoom = () => {
    try {
      if (socketRef.current && roomId)
        socketRef.current.emit("leave-room", roomId);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setJoined(false);
    } catch (err) {
      console.error("leaveRoom error", err);
    }
  };

  return (
    <div className="container mt-4">
      <h3>Online Tutoring Session</h3>
      {!joined ? (
        <div>
          <div className="mb-2">
            <label>Room ID</label>
            <input
              className="form-control"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room id"
            />
          </div>
          <button className="btn btn-primary" onClick={() => joinRoom()}>
            Join Room
          </button>
        </div>
      ) : (
        <div>
          <div className="d-flex gap-3">
            <div>
              <p>Local</p>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{ width: 240, height: 180, background: "#000" }}
              />
            </div>
            <div>
              <p>Remote</p>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{ width: 360, height: 270, background: "#000" }}
              />
            </div>
          </div>
          <div className="mt-3">
            <button className="btn btn-danger me-2" onClick={leaveRoom}>
              Leave
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Session;
