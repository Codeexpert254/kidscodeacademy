import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer mt-5 py-4">
      <Container>
        <Row>
          <Col md={4}>
            <h5>Kids Code Academy</h5>
            <p>Making coding fun and accessible for kids everywhere!</p>
          </Col>
          <Col md={4}>
            <h5>Quick Links</h5>
            <ul className="list-unstyled">
              <li>
                <a href="/" className="text-white">
                  Home
                </a>
              </li>
              <li>
                <a href="/upload" className="text-white">
                  Videos
                </a>
              </li>
              <li>
                <a href="/payment" className="text-white">
                  Book Sessions
                </a>
              </li>
              <li>
                <a href="/tutoring" className="text-white">
                  Tutoring
                </a>
              </li>
            </ul>
          </Col>
          <Col md={4}>
            <h5>Contact Us</h5>
            <p>📧 info@kidscodeacademy.com</p>
            <p>📞 (+254) 707 529 079</p>
            <p>📍 Nairobi, Kenya</p>
          </Col>
        </Row>
        <Row className="mt-3">
          <Col className="text-center">
            <p>&copy; 2024 Kids Code Academy. All rights reserved. 🚀</p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
