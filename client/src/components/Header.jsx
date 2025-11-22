import React from "react";
import { Navbar, Nav, Container } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import "./Header.css";
import kids_logo from "../img/kids_logo.png";

const Header = () => {
  return (
    <Navbar bg="primary" variant="dark" expand="lg">
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand>
            {" "}
            <img src={kids_logo} alt="Kids logo" className="header-logo" />
          </Navbar.Brand>
        </LinkContainer>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <LinkContainer to="/payment">
              <Nav.Link>Book Sessions</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/tutoring">
              <Nav.Link>Online Tutoring</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/upload">
              <Nav.Link>Videos</Nav.Link>
            </LinkContainer>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
