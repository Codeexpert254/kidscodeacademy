import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
} from "react-bootstrap";
import axios from "axios";
import "./Payment.css";

const Payment = () => {
  const [formData, setFormData] = useState({
    parentName: "",
    childName: "",
    email: "",
    sessionType: "",
    date: "",
    time: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Step 1: Book the session (without payment)
      const res = await axios.post(
        "https://kidscodeacademy.onrender.com/api/book-session",
        formData
      );

      if (res.data && res.data.id) {
        setBookingId(res.data.id);
        // create a tutoring room for this booking so tutor/student can join
        try {
          const roomResp = await axios.post(
            "https://kidscodeacademy.onrender.com/api/rooms",
            {
              bookingId: res.data.id,
              expiresInMinutes: 120,
            }
          );
          if (roomResp.data && roomResp.data.roomId)
            setRoomId(roomResp.data.roomId);
        } catch (err) {
          console.warn("Failed to auto-create room:", err?.message || err);
        }
        setMessage("Session booked successfully! Now proceed to payment.");
        setShowPaymentOptions(true);
        // Reset form
        setFormData({
          parentName: "",
          childName: "",
          email: "",
          sessionType: "",
          date: "",
          time: "",
        });
      } else {
        throw new Error("Booking failed");
      }
    } catch (error) {
      setMessage(error.message || "Error booking session. Please try again.");
      console.error("Booking error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card>
            <Card.Body>
              <Card.Title className="text-primary text-center">
                📚 Book a Tutoring Session
              </Card.Title>
              {message && (
                <Alert
                  variant={message.includes("success") ? "success" : "danger"}
                >
                  {message}
                </Alert>
              )}

              {!showPaymentOptions ? (
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Parent Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="parentName"
                          value={formData.parentName}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Child Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="childName"
                          value={formData.childName}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Session Type</Form.Label>
                    <Form.Select
                      name="sessionType"
                      value={formData.sessionType}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select session type</option>
                      <option value="Introduction to Coding">
                        Introduction to Coding
                      </option>
                      <option value="Python Basics">Python Basics</option>
                      <option value="Web Development">Web Development</option>
                      <option value="Game Development">Game Development</option>
                      <option value="Advanced Programming">
                        Advanced Programming
                      </option>
                    </Form.Select>
                  </Form.Group>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Date</Form.Label>
                        <Form.Control
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Time</Form.Label>
                        <Form.Control
                          type="time"
                          name="time"
                          value={formData.time}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <div className="text-center">
                    <p className="text-muted">
                      Session fee (5 Sessions): $1.00
                    </p>
                    <Button
                      type="submit"
                      variant="success"
                      size="lg"
                      disabled={loading}
                    >
                      {loading ? "Booking..." : "Book Session"}
                    </Button>
                  </div>
                </Form>
              ) : (
                <>
                  <PaymentMethodSelector bookingId={bookingId} amount={1} />
                  {roomId && (
                    <div className="mt-3 text-center">
                      <p>
                        Room created: <strong>{roomId}</strong>
                      </p>
                      <a
                        className="btn btn-outline-primary"
                        href={`/session/${roomId}`}
                      >
                        Join Session
                      </a>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

// Payment method selector component
const PaymentMethodSelector = ({ bookingId, amount }) => {
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [paypalOrderId, setPaypalOrderId] = useState(null);

  const handleStripePayment = async () => {
    setLoading(true);
    try {
      const success_url = `${window.location.origin}/?payment_status=success&booking_id=${bookingId}`;
      const cancel_url = `${window.location.origin}/?payment_status=canceled&booking_id=${bookingId}`;
      const res = await axios.post(
        "https://kidscodeacademy.onrender.com/api/pay/stripe/create-session",
        { amount, success_url, cancel_url, bookingId }
      );
      if (res.data && res.data.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error("Failed to create Stripe session");
      }
    } catch (error) {
      setMessage(error.message || "Error initiating Stripe payment");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalPayment = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        "https://kidscodeacademy.onrender.com/api/pay/paypal/create-order",
        { amount, bookingId }
      );
      if (res.data && res.data.approvalUrl) {
        setPaypalOrderId(res.data.orderId);
        window.open(res.data.approvalUrl, "_blank");
        setMessage(
          "PayPal window opened. After approval, click 'Confirm PayPal Payment' below."
        );
      } else {
        throw new Error("Failed to create PayPal order");
      }
    } catch (error) {
      setMessage(error.message || "Error creating PayPal order");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalCapture = async () => {
    if (!paypalOrderId) {
      setMessage("No PayPal order found");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        "https://kidscodeacademy.onrender.com/api/pay/paypal/capture",
        { orderId: paypalOrderId, bookingId }
      );
      if (res.data && res.data.status === "COMPLETED") {
        setMessage("PayPal payment successful! Your session is confirmed.");
      } else {
        throw new Error("PayPal payment not completed");
      }
    } catch (error) {
      setMessage(error.message || "Error capturing PayPal payment");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMPesaPayment = async () => {
    if (!phone) {
      setMessage("Please enter phone number");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        "https://kidscodeacademy.onrender.com/api/pay/mpesa",
        {
          amount: Math.floor(amount / 1), // Convert cents to KES
          phone,
          bookingId,
        }
      );
      if (res.data && res.data.success) {
        setMessage(
          `M-Pesa STK Push sent. Confirm on your phone (${phone}). Your session will be booked after payment.`
        );
      } else {
        throw new Error(res.data.error || "M-Pesa request failed");
      }
    } catch (error) {
      setMessage(error.message || "Error initiating M-Pesa payment");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h5 className="mb-4">Choose Payment Method</h5>
      {message && (
        <Alert variant={message.includes("successful") ? "success" : "info"}>
          {message}
        </Alert>
      )}
      <Form.Group className="mb-4">
        <Form.Label>Payment Method</Form.Label>
        <Form.Select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="stripe">💳 Card (Stripe)</option>
          <option value="paypal">🅿️ PayPal</option>
          <option value="mpesa">📱 M-Pesa</option>
        </Form.Select>
      </Form.Group>

      {paymentMethod === "mpesa" && (
        <Form.Group className="mb-3">
          <Form.Label>Phone Number (2547XXXXXXXX)</Form.Label>
          <Form.Control
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="2547XXXXXXXX"
          />
        </Form.Group>
      )}

      <div className="text-center">
        <p className="text-muted mb-3">
          Amount to pay: ${(amount / 1).toFixed(2)}
        </p>
        {paymentMethod === "stripe" && (
          <Button
            variant="primary"
            size="lg"
            onClick={handleStripePayment}
            disabled={loading}
          >
            {loading ? "Processing..." : "Pay with Card"}
          </Button>
        )}
        {paymentMethod === "paypal" && (
          <>
            <Button
              variant="primary"
              size="lg"
              onClick={handlePayPalPayment}
              disabled={loading || paypalOrderId}
              className="me-2"
            >
              {loading ? "Processing..." : "Create PayPal Order"}
            </Button>
            {paypalOrderId && (
              <Button
                variant="success"
                size="lg"
                onClick={handlePayPalCapture}
                disabled={loading}
              >
                {loading ? "Processing..." : "Confirm PayPal Payment"}
              </Button>
            )}
          </>
        )}
        {paymentMethod === "mpesa" && (
          <Button
            variant="primary"
            size="lg"
            onClick={handleMPesaPayment}
            disabled={loading}
          >
            {loading ? "Processing..." : "Send M-Pesa STK"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Payment;
