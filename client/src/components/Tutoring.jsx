import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  ListGroup,
} from "react-bootstrap";
import io from "socket.io-client";
import "./Tutoring.css";

const Tutoring = () => {
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    const newSocket = io("https://kidscodeacademy.onrender.com");
    setSocket(newSocket);

    newSocket.on("connect", () => {
      setIsConnected(true);
      setAlertMessage("Connected to tutoring session!");
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      setAlertMessage("Disconnected from tutoring session.");
    });

    newSocket.on("receive-message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => newSocket.close();
  }, []);

  const joinRoom = () => {
    if (roomId && socket) {
      socket.emit("join-room", roomId);
      setAlertMessage(`Joined room: ${roomId}`);
    }
  };

  const sendMessage = () => {
    if (message && socket && roomId) {
      const messageData = {
        roomId,
        message,
        sender: "Student", // In a real app, this would be the user's name
        timestamp: new Date().toISOString(),
      };
      socket.emit("send-message", messageData);
      setMessages((prev) => [...prev, messageData]);
      setMessage("");
    }
  };

  return (
    <Container className="mt-5">
      <Row>
        <Col md={8}>
          <Card>
            <Card.Body>
              <Card.Title className="text-primary">
                💬 Online Tutoring Session
              </Card.Title>
              {alertMessage && (
                <Alert variant={isConnected ? "success" : "warning"}>
                  {alertMessage}
                </Alert>
              )}
              {!isConnected && (
                <Alert variant="info">
                  Please wait while we connect you to the tutoring session...
                </Alert>
              )}
              <Form.Group className="mb-3">
                <Form.Label>Session Room ID</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter room ID provided by tutor"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                />
                <Button onClick={joinRoom} variant="secondary" className="mt-2">
                  Join Room
                </Button>
              </Form.Group>
              <div
                style={{
                  height: "300px",
                  overflowY: "scroll",
                  border: "1px solid #ccc",
                  padding: "10px",
                  marginBottom: "10px",
                }}
              >
                {messages.map((msg, index) => (
                  <div key={index} className="mb-2">
                    <strong>{msg.sender}:</strong> {msg.message}
                    <small className="text-muted ms-2">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </small>
                  </div>
                ))}
              </div>
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
              </Form.Group>
              <Button
                onClick={sendMessage}
                variant="primary"
                disabled={!isConnected || !roomId}
              >
                Send Message
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title className="text-secondary">
                📚 Tutoring Tips
              </Card.Title>
              <ListGroup variant="flush">
                <ListGroup.Item>Be prepared with questions</ListGroup.Item>
                <ListGroup.Item>Take notes during the session</ListGroup.Item>
                <ListGroup.Item>Practice what you learn</ListGroup.Item>
                <ListGroup.Item>
                  Ask for clarification when needed
                </ListGroup.Item>
                <ListGroup.Item>Have fun learning!</ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
          <Card className="mt-3">
            <Card.Body>
              <Card.Title className="text-secondary">
                🎯 Learning Goals
              </Card.Title>
              <ul>
                <li>Understand basic programming concepts</li>
                <li>Write simple programs</li>
                <li>Debug code effectively</li>
                <li>Think like a programmer</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Tutoring;
