import React from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
import "./VideoUpload.css";

const VideoUpload = () => {
  // Sample video data - replace with your actual recorded videos
  const videos = [
    {
      id: 1,
      title: "Introduction to Coding for Kids",
      description: "Learn the basics of programming in a fun and easy way!",
      videoUrl: "/videos/intro-to-coding.mp4", // Replace with your actual video paths
      thumbnail: "/images/video1-thumb.jpg",
      duration: "5:30",
    },
    {
      id: 2,
      title: "Variables and Data Types",
      description: "Understanding how to store and use information in code.",
      videoUrl: "/videos/variables-data-types.mp4",
      thumbnail: "/images/video2-thumb.jpg",
      duration: "7:15",
    },
    {
      id: 3,
      title: "Loops and Repetition",
      description: "Make your code do the same thing over and over again!",
      videoUrl: "/videos/loops-repetition.mp4",
      thumbnail: "/images/video3-thumb.jpg",
      duration: "6:45",
    },
    {
      id: 4,
      title: "Functions and Reusability",
      description: "Write code once and use it many times.",
      videoUrl: "/videos/functions-reusability.mp4",
      thumbnail: "/images/video4-thumb.jpg",
      duration: "8:20",
    },
    {
      id: 5,
      title: "Building Your First Game",
      description: "Put it all together to create an interactive game!",
      videoUrl: "/videos/first-game.mp4",
      thumbnail: "/images/video5-thumb.jpg",
      duration: "12:30",
    },
    {
      id: 6,
      title: "Debugging and Problem Solving",
      description: "Learn how to find and fix errors in your code.",
      videoUrl: "/videos/debugging-problem-solving.mp4",
      thumbnail: "/images/video6-thumb.jpg",
      duration: "9:10",
    },
  ];

  return (
    <Container className="mt-5">
      <Row className="mb-4">
        <Col>
          <h1 className="text-center text-primary mb-4">
            🎥 Educational Videos
          </h1>
          <p className="text-center lead">
            Watch our specially recorded coding tutorials designed just for
            kids!
          </p>
        </Col>
      </Row>
      <Row>
        {videos.map((video) => (
          <Col md={6} lg={4} key={video.id} className="mb-4">
            <Card className="h-100">
              <div className="ratio ratio-16x9">
                <video
                  controls
                  poster={video.thumbnail}
                  className="rounded"
                  preload="metadata"
                >
                  <source src={video.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <Card.Body>
                <Card.Title className="text-primary">{video.title}</Card.Title>
                <Card.Text>{video.description}</Card.Text>
                <small className="text-muted">Duration: {video.duration}</small>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default VideoUpload;
