const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");
const stripe = process.env.STRIPE_SECRET_KEY
  ? require("stripe")(process.env.STRIPE_SECRET_KEY)
  : null;
const axios = require("axios");
const paypal = require("@paypal/checkout-server-sdk");
const socketIo = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "kids_coding",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL database");
  }
});

// Ensure auxiliary tables exist: pending_sessions and payments
const createPending = `CREATE TABLE IF NOT EXISTS pending_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_name VARCHAR(255),
  child_name VARCHAR(255),
  email VARCHAR(255),
  session_type VARCHAR(100),
  date DATE,
  time TIME,
  phone VARCHAR(50),
  amount INT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

const createPayments = `CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pending_session_id INT,
  provider VARCHAR(50),
  provider_ref VARCHAR(255),
  status VARCHAR(50),
  raw_response JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

const createRooms = `CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(64) PRIMARY KEY,
  booking_id INT,
  tutor_id INT,
  status VARCHAR(50) DEFAULT 'pending',
  secret_token VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME
);`;

db.query(createRooms, (err) => {
  if (err) console.error("Failed to ensure rooms table:", err);
  else console.log("Ensured rooms table exists");
});

db.query(createPending, (err) => {
  if (err) console.error("Failed to ensure pending_sessions table:", err);
  else console.log("Ensured pending_sessions table exists");
});

db.query(createPayments, (err) => {
  if (err) console.error("Failed to ensure payments table:", err);
  else console.log("Ensured payments table exists");
});

// Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Routes
app.post("/api/upload-video", upload.single("video"), (req, res) => {
  const { title, description } = req.body;
  const videoPath = req.file.path;

  const query =
    "INSERT INTO videos (title, description, path) VALUES (?, ?, ?)";
  db.query(query, [title, description, videoPath], (err, result) => {
    if (err) {
      res.status(500).json({ error: "Failed to upload video" });
    } else {
      res.json({ message: "Video uploaded successfully", id: result.insertId });
    }
  });
});

app.get("/api/videos", (req, res) => {
  const query = "SELECT * FROM videos";
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: "Failed to fetch videos" });
    } else {
      res.json(results);
    }
  });
});

app.post("/api/create-payment-intent", async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: "Stripe not configured" });
  }

  const { amount, currency } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------- PayPal integration (server-side) --------------------
function createPayPalClient() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const environment =
    process.env.PAYPAL_ENV === "live"
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret);
  return new paypal.core.PayPalHttpClient(environment);
}

app.post("/api/pay/paypal/create-order", async (req, res) => {
  const client = createPayPalClient();
  if (!client) return res.status(500).json({ error: "PayPal not configured" });
  const { amount, bookingId } = req.body;
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      { amount: { currency_code: "USD", value: (amount / 100).toFixed(2) } },
    ],
    metadata: { bookingId: bookingId || "" },
  });
  try {
    const order = await client.execute(request);
    const approval = order.result.links.find((l) => l.rel === "approve");
    res.json({
      approvalUrl: approval ? approval.href : null,
      orderId: order.result.id,
    });
  } catch (err) {
    console.error("PayPal create order error:", err);
    res.status(500).json({ error: "Failed to create PayPal order" });
  }
});

app.post("/api/pay/paypal/capture", async (req, res) => {
  const client = createPayPalClient();
  if (!client) return res.status(500).json({ error: "PayPal not configured" });
  const { orderId, bookingId } = req.body;
  if (!orderId) return res.status(400).json({ error: "orderId required" });
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  try {
    const capture = await client.execute(request);
    res.json({ status: capture.result.status, result: capture.result });
  } catch (err) {
    console.error("PayPal capture error:", err);
    res.status(500).json({ error: "Failed to capture PayPal order" });
  }
});

// -------------------- M-Pesa (Safaricom Daraja) integration --------------------
// Uses MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY
// async function getMpesaAccessToken() {
//   const key = process.env.MPESA_CONSUMER_KEY;
//   const secret = process.env.MPESA_CONSUMER_SECRET;
//   if (!key || !secret) throw new Error("M-Pesa credentials missing");
//   const auth = Buffer.from(`${key}:${secret}`).toString("base64");
//   const url =
//     process.env.MPESA_ENV === "production"
//       ? "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
//       : "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
//   const resp = await axios.get(url, {
//     headers: { Authorization: `Basic ${auth}` },
//   });
//   return resp.data.access_token;
// }
async function getMpesaAccessToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");

  const url =
    process.env.MPESA_ENV === "production"
      ? "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
      : "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

  const resp = await axios.get(url, {
    headers: { Authorization: `Basic ${auth}` },
  });

  console.log("✅ Fresh M-Pesa access token fetched:", resp.data);
  return resp.data.access_token;
}

// app.post("/api/pay/mpesa", async (req, res) => {
//   const { amount, phone, bookingId } = req.body;
//   if (!bookingId) return res.status(400).json({ error: "bookingId required" });
//   try {
//     const token = await getMpesaAccessToken();
//     const shortcode = process.env.MPESA_SHORTCODE || "";
//     const passkey = process.env.MPESA_PASSKEY || "";
//     if (!shortcode || !passkey)
//       return res
//         .status(500)
//         .json({ error: "M-Pesa shortcode/passkey not configured" });
//     const timestamp = new Date()
//       .toISOString()
//       .replace(/[^0-9]/g, "")
//       .slice(0, 14);
//     const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
//       "base64"
//     );

//     const url =
//       process.env.MPESA_ENV === "production"
//         ? "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
//         : "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

//     const body = {
//       BusinessShortCode: shortcode,
//       Password: password,
//       Timestamp: timestamp,
//       TransactionType: "CustomerPayBillOnline",
//       Amount: amount || 600, // in Kenyan Shillings
//       PartyA: phone,
//       PartyB: shortcode,
//       PhoneNumber: phone,
//       CallBackURL:
//         process.env.MPESA_CALLBACK_URL ||
//         `${
//           process.env.SERVER_BASE_URL || "http://your-server.example"
//         }/api/mpesa/callback`,
//       AccountReference: `BOOKING_${bookingId}`,
//       TransactionDesc: `Tutoring session ${bookingId}`,
//     };

//     const resp = await axios.post(url, body, {
//       headers: { Authorization: `Bearer ${token}` },
//     });

//     res.json({ success: true, data: resp.data });
//   } catch (err) {
//     console.error(
//       "M-Pesa error:",
//       err.response ? err.response.data : err.message
//     );
//     res.status(500).json({ error: "Failed to initiate M-Pesa request" });
//   }
//   console.log("📦 M-Pesa Environment:", process.env.MPESA_ENV);
//   console.log("📡 STK Push URL:", url);
// });

app.post("/api/pay/mpesa", async (req, res) => {
  const { amount, phone, bookingId } = req.body;
  if (!bookingId) return res.status(400).json({ error: "bookingId required" });

  try {
    const token = await getMpesaAccessToken();

    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    if (!shortcode || !passkey)
      return res
        .status(500)
        .json({ error: "M-Pesa shortcode/passkey not configured" });

    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
      "base64"
    );

    // STK Push URL
    const url =
      process.env.MPESA_ENV === "production"
        ? "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        : "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

    const body = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: `BOOKING_${bookingId}`,
      TransactionDesc: `Tutoring session ${bookingId}`,
    };

    const resp = await axios.post(url, body, {
      headers: { Authorization: `Bearer ${token}` },
    });

    res.json({ success: true, data: resp.data });
  } catch (err) {
    console.error(
      "M-Pesa error:",
      err.response ? err.response.data : err.message
    );
    res.status(500).json({ error: "Failed to initiate M-Pesa request" });
  }
});

// M-Pesa callback endpoint
app.post("/api/mpesa/callback", express.json(), async (req, res) => {
  try {
    const body = req.body;
    // Daraja sends structure under Body.stkCallback
    const stk = body?.Body?.stkCallback;
    if (!stk) {
      console.log("Received non-stk callback", body);
      return res.status(200).json({ received: true });
    }
    const resultCode = stk.ResultCode;
    const callbackMeta = stk.CallbackMetadata || {};
    const items = callbackMeta.Item || [];
    let amount = null,
      mpesaReceipt = null,
      phone = null;
    for (const it of items) {
      if (it.Name === "Amount") amount = it.Value;
      if (it.Name === "MpesaReceiptNumber") mpesaReceipt = it.Value;
      if (it.Name === "PhoneNumber") phone = it.Value;
    }

    if (resultCode === 0) {
      // find pending session by phone and amount (best-effort match)
      const findQuery = `SELECT * FROM pending_sessions WHERE phone = ? AND amount = ? AND processed = false ORDER BY created_at DESC LIMIT 1`;
      db.query(findQuery, [phone, amount], (err, results) => {
        if (err) {
          console.error("Error finding pending session:", err);
        } else if (results && results.length) {
          const pending = results[0];
          // insert into sessions
          const insertSession = `INSERT INTO sessions (parent_name, child_name, email, session_type, date, time) VALUES (?, ?, ?, ?, ?, ?)`;
          const params = [
            pending.parent_name,
            pending.child_name,
            pending.email,
            pending.session_type,
            pending.date,
            pending.time,
          ];
          db.query(insertSession, params, (err2, res2) => {
            if (err2)
              console.error(
                "Failed to insert session after mpesa callback:",
                err2
              );
            else
              console.log(
                "Session booked from mpesa callback, id:",
                res2.insertId
              );
          });

          // mark pending processed
          db.query(
            `UPDATE pending_sessions SET processed = true WHERE id = ?`,
            [pending.id],
            (err3) => {
              if (err3)
                console.error("Failed to mark pending as processed:", err3);
            }
          );

          // store payment record
          const payInsert = `INSERT INTO payments (pending_session_id, provider, provider_ref, status, raw_response) VALUES (?, ?, ?, ?, ?)`;
          db.query(
            payInsert,
            [
              pending.id,
              "mpesa",
              mpesaReceipt || stk.CheckoutRequestID,
              "success",
              JSON.stringify(body),
            ],
            (err4) => {
              if (err4) console.error("Failed to insert payment record:", err4);
            }
          );
        } else {
          console.log("No matching pending session found for mpesa callback", {
            phone,
            amount,
          });
        }
      });
    } else {
      console.log("M-Pesa stk push failed or cancelled", stk);
    }

    // Daraja expects a 200 response quickly
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    console.error("Error in mpesa callback handler:", err);
    res.status(500).json({ error: "server error" });
  }
});

// -------------------- Card (placeholder) --------------------
app.post("/api/pay/card", async (req, res) => {
  // WARNING: This endpoint is a demonstration placeholder only. Do NOT use in production.
  // Use a PCI-compliant provider (Braintree, PayPal, Adyen, Stripe) or tokenization.
  const { amount, card } = req.body;
  console.log("Card payment attempt", { amount, card });
  // Simulate a successful charge in development
  if (!card || !card.number)
    return res.status(400).json({ error: "Card details required" });
  // In production you'd send card data to a payment gateway here.
  res.json({ success: true, message: "Simulated card payment accepted" });
});

// -------------------- Stripe Checkout (card) --------------------
app.post("/api/pay/stripe/create-session", async (req, res) => {
  if (!stripe) return res.status(500).json({ error: "Stripe not configured" });
  const { amount, success_url, cancel_url, bookingId } = req.body;
  if (!amount || !success_url)
    return res.status(400).json({ error: "amount and success_url required" });
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      metadata: { bookingId: bookingId || "" },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Tutoring sessions (5)" },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url,
      cancel_url: cancel_url || success_url,
    });
    res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error("Stripe create session error:", err);
    res.status(500).json({ error: "Failed to create Stripe session" });
  }
});

app.post("/api/pay/stripe/verify", async (req, res) => {
  if (!stripe) return res.status(500).json({ error: "Stripe not configured" });
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    // payment_status can be 'paid' when completed
    const paid =
      session.payment_status === "paid" ||
      session.payment_status === "complete";
    res.json({ paid, session });
  } catch (err) {
    console.error("Stripe verify error:", err);
    res.status(500).json({ error: "Failed to verify Stripe session" });
  }
});

app.post("/api/book-session", (req, res) => {
  const { parentName, childName, email, sessionType, date, time } = req.body;

  const query =
    "INSERT INTO sessions (parent_name, child_name, email, session_type, date, time) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(
    query,
    [parentName, childName, email, sessionType, date, time],
    (err, result) => {
      if (err) {
        res.status(500).json({ error: "Failed to book session" });
      } else {
        res.json({
          message: "Session booked successfully",
          id: result.insertId,
        });
      }
    }
  );
});

// Create a new tutoring room (called after booking or by tutor)
app.post("/api/rooms", (req, res) => {
  const { bookingId, tutorId, expiresInMinutes } = req.body;
  // generate short random id
  const id = require("crypto").randomBytes(6).toString("hex");
  const expiresAt = expiresInMinutes
    ? new Date(Date.now() + expiresInMinutes * 60000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ")
    : null;
  const insert = `INSERT INTO rooms (id, booking_id, tutor_id, expires_at) VALUES (?, ?, ?, ?)`;
  db.query(
    insert,
    [id, bookingId || null, tutorId || null, expiresAt],
    (err) => {
      if (err) {
        console.error("Failed to create room:", err);
        return res.status(500).json({ error: "Failed to create room" });
      }
      res.json({ roomId: id });
    }
  );
});

// Get room info
app.get("/api/rooms/:id", (req, res) => {
  const { id } = req.params;
  const q = `SELECT * FROM rooms WHERE id = ?`;
  db.query(q, [id], (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch room" });
    if (!results || results.length === 0)
      return res.status(404).json({ error: "Room not found" });
    res.json(results[0]);
  });
});

// List rooms (admin/debug). Restrict or paginate in production.
app.get("/api/rooms", (req, res) => {
  const q = `SELECT * FROM rooms ORDER BY created_at DESC LIMIT 500`;
  db.query(q, (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch rooms" });
    res.json(results || []);
  });
});

app.get("/api/booking/:id", (req, res) => {
  const { id } = req.params;
  const query = "SELECT * FROM sessions WHERE id = ?";
  db.query(query, [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: "Failed to fetch booking" });
    } else if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ error: "Booking not found" });
    }
  });
});

app.post("/api/payment-confirmed/:bookingId", (req, res) => {
  const { bookingId } = req.params;
  const { provider, transactionId } = req.body;

  // Update sessions table to mark as paid
  const query =
    "UPDATE sessions SET payment_status = 'paid', payment_provider = ?, payment_ref = ? WHERE id = ?";
  db.query(query, [provider, transactionId || "", bookingId], (err, result) => {
    if (err) {
      console.error("Failed to mark payment confirmed:", err);
      res.status(500).json({ error: "Failed to confirm payment" });
    } else {
      res.json({ message: "Payment confirmed", bookingId });
    }
  });
});

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Socket.io for real-time tutoring
const io = socketIo(server);

io.on("connection", (socket) => {
  console.log("A user connected");

  // Join a signaling room. payload: { roomId }
  socket.on("join-room", async (payload, cb) => {
    try {
      const roomId = typeof payload === "string" ? payload : payload.roomId;
      if (!roomId) return cb && cb({ error: "roomId required" });
      socket.join(roomId);
      // list other socket ids in the room
      const clients = io.sockets.adapter.rooms.get(roomId) || new Set();
      const others = [...clients].filter((id) => id !== socket.id);
      // notify others a new user joined
      socket.to(roomId).emit("user-joined", { socketId: socket.id });
      // return the list of other socket ids to the joiner
      cb && cb({ joined: true, others });
    } catch (err) {
      console.error("join-room error:", err);
      cb && cb({ error: "server error" });
    }
  });

  // Signaling forwarding
  socket.on("offer", (data) => {
    // data: { to, offer }
    if (data && data.to)
      io.to(data.to).emit("offer", { from: socket.id, offer: data.offer });
  });

  socket.on("answer", (data) => {
    // data: { to, answer }
    if (data && data.to)
      io.to(data.to).emit("answer", { from: socket.id, answer: data.answer });
  });

  socket.on("ice-candidate", (data) => {
    // data: { to, candidate }
    if (data && data.to)
      io.to(data.to).emit("ice-candidate", {
        from: socket.id,
        candidate: data.candidate,
      });
  });

  socket.on("send-message", (data) => {
    io.to(data.roomId).emit("receive-message", data);
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", { socketId: socket.id });
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
  });
});
