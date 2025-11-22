import React from "react";
import { Container, Row, Col, Card, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import "./Home.css";

const Home = () => {
  return (
    <Container className="mt-5 playful-bg rainbow-bg">
      <Row className="text-center mb-5">
        <Col>
          <h1
            className="display-4 text-primary bounce"
            style={{
              fontSize: "3.5rem",
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
              animation: "bounce 2s infinite",
            }}
          >
            Welcome to Kids Code Academy! 🚀
          </h1>
          <p
            className="lead"
            style={{ fontSize: "1.5rem", fontWeight: "bold" }}
          >
            Learn coding and programming in a fun, playful way!
          </p>
        </Col>
      </Row>
      <Row>
        <Col md={4} className="mb-4">
          <Card className="h-100 float">
            <Card.Body className="text-center">
              <Card.Title style={{ fontSize: "2rem", color: "#FF6B6B" }}>
                📹 Video Library
              </Card.Title>
              <Card.Text style={{ fontSize: "1.1rem" }}>
                Watch educational videos about coding, programming, and computer
                science.
              </Card.Text>
              <Link to="/upload">
                <Button variant="primary" size="lg">
                  Explore Videos
                </Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100 float">
            <Card.Body className="text-center">
              <Card.Title style={{ fontSize: "2rem", color: "#4ECDC4" }}>
                💳 Book Sessions
              </Card.Title>
              <Card.Text style={{ fontSize: "1.1rem" }}>
                Schedule one-on-one tutoring sessions with our expert
                instructors.
              </Card.Text>
              <Link to="/payment">
                <Button variant="secondary" size="lg">
                  Book Now
                </Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100 float">
            <Card.Body className="text-center">
              <Card.Title style={{ fontSize: "2rem", color: "#51CF66" }}>
                💬 Online Tutoring
              </Card.Title>
              <Card.Text style={{ fontSize: "1.1rem" }}>
                Join live interactive sessions and learn coding in real-time.
              </Card.Text>
              <Link to="/tutoring">
                <Button variant="success" size="lg">
                  Start Learning
                </Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row className="mt-5">
        <Col>
          <h2
            className="text-center text-primary mb-4 bounce"
            style={{ fontSize: "2.5rem", animation: "bounce 2s infinite" }}
          >
            Why Choose Kids Code Academy?
          </h2>
          <div className="row">
            <div className="col-md-6 mb-3">
              <div className="d-flex align-items-center">
                <span style={{ fontSize: "2rem", marginRight: "15px" }}>
                  🎨
                </span>
                <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                  Fun and colorful interface designed for kids
                </span>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="d-flex align-items-center">
                <span style={{ fontSize: "2rem", marginRight: "15px" }}>
                  👨‍🏫
                </span>
                <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                  Experienced tutors passionate about teaching
                </span>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="d-flex align-items-center">
                <span style={{ fontSize: "2rem", marginRight: "15px" }}>
                  📚
                </span>
                <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                  Comprehensive curriculum covering various programming
                  languages
                </span>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="d-flex align-items-center">
                <span style={{ fontSize: "2rem", marginRight: "15px" }}>
                  🏆
                </span>
                <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                  Interactive projects and games to reinforce learning
                </span>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="d-flex align-items-center">
                <span style={{ fontSize: "2rem", marginRight: "15px" }}>
                  🌟
                </span>
                <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                  Safe and secure online environment
                </span>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="d-flex align-items-center">
                <span style={{ fontSize: "2rem", marginRight: "15px" }}>
                  🎯
                </span>
                <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                  Personalized learning paths for every child
                </span>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;
