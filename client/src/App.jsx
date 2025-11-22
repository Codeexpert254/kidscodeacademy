import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import Header from "./components/Header.jsx";
import Home from "./components/Home.jsx";
import VideoUpload from "./components/VideoUpload.jsx";
import Payment from "./components/Payment.jsx";
import Tutoring from "./components/Tutoring.jsx";
import Session from "./components/Session.jsx";
import Footer from "./components/Footer.jsx";

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<VideoUpload />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/tutoring" element={<Tutoring />} />
          <Route path="/session" element={<Session />} />
          <Route path="/session/:roomId" element={<Session />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
