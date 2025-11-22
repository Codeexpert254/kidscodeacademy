# M-Pesa Payment Flow - Complete Breakdown

## Overview

The M-Pesa payment process involves **3 parties**: Your Frontend (React), Your Backend (Node.js/Express), and Safaricom (M-Pesa/Daraja).

---

## Step-by-Step Flow

### **STEP 1: User Initiates Payment** (Frontend - Payment.jsx)

**Location**: `client/src/components/Payment.jsx` (Lines 280-300)

```javascript
const handleMPesaPayment = async () => {
  // User must enter phone number first
  if (!phone) {
    setMessage("Please enter phone number");
    return;
  }

  setLoading(true);

  try {
    // SEND REQUEST TO BACKEND
    const res = await axios.post("http://localhost:5000/api/pay/mpesa", {
      amount: Math.floor(amount / 100), // Convert $60 to 600 KES
      phone, // User's phone: 2547XXXXXXXX
      bookingId, // Link to booking created earlier
    });

    if (res.data && res.data.success) {
      // Show message to user
      setMessage(
        `M-Pesa STK Push sent. Confirm on your phone (${phone}). Your session will be booked after payment.`
      );
    }
  } catch (error) {
    setMessage(error.message || "Error initiating M-Pesa payment");
  } finally {
    setLoading(false);
  }
};
```

**What happens**:

- User enters phone number (e.g., `254712345678`)
- Clicks "Send M-Pesa STK" button
- Frontend sends request to backend with:
  - `amount`: 600 (KES)
  - `phone`: User's phone number
  - `bookingId`: ID from the booking created earlier
- UI shows loading spinner

---

### **STEP 2: Backend Initiates STK Push** (Backend - index.js)

**Location**: `server/index.js` (Lines 199-250)

```javascript
app.post("/api/pay/mpesa", async (req, res) => {
  const { amount, phone, bookingId } = req.body; // Get data from frontend

  if (!bookingId) return res.status(400).json({ error: "bookingId required" });

  try {
    // STEP 2A: Get access token from Safaricom
    const token = await getMpesaAccessToken();

    // STEP 2B: Prepare credentials
    const shortcode = process.env.MPESA_SHORTCODE; // Your till number
    const passkey = process.env.MPESA_PASSKEY; // Your passkey

    // STEP 2C: Generate security credentials
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
      "base64"
    );

    // STEP 2D: Prepare M-Pesa STK Push request
    const body = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount, // 600 KES
      PartyA: phone, // Customer phone
      PartyB: shortcode, // Your till
      PhoneNumber: phone,
      CallBackURL: process.env.MPESA_CALLBACK_URL, // Where M-Pesa sends confirmation
      AccountReference: `BOOKING_${bookingId}`, // Reference to identify booking
      TransactionDesc: `Tutoring session ${bookingId}`,
    };

    // STEP 2E: Send to M-Pesa Daraja API
    const resp = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", // Sandbox URL
      body,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // STEP 2F: Send response back to frontend
    res.json({ success: true, data: resp.data });
  } catch (err) {
    console.error(
      "M-Pesa Error:",
      err.response ? err.response.data : err.message
    );
    res.status(500).json({
      error: "Failed to initiate M-Pesa request",
      details: err.response ? err.response.data : err.message,
    });
  }
});
```

**What happens on backend**:

1. **Get Access Token**: Backend authenticates with Safaricom using credentials from `.env`
2. **Prepare Request**: Creates encrypted password and timestamp
3. **Send STK Push**: Calls Safaricom API to send STK prompt to user's phone
4. **Return Success**: Sends back to frontend that STK was sent

---

### **STEP 3: User Receives STK Prompt** (On User's Phone)

At this point:

- User's phone gets a popup asking to enter M-Pesa PIN
- Backend is waiting for Safaricom to send callback
- Frontend is showing message: "M-Pesa STK Push sent..."

```
Phone Screen:
┌─────────────────────────────┐
│  M-Pesa                     │
│  Enter PIN                  │
│  Amount: 600 KES            │
│  Recipient: Kids Coding     │
│                             │
│  [PIN INPUT FIELD]          │
│  [OK]  [CANCEL]             │
└─────────────────────────────┘
```

---

### **STEP 4: Safaricom Sends Callback** (Backend Callback Handler)

**Location**: `server/index.js` (Lines 255-340)

After user enters PIN and payment succeeds, **Safaricom sends a callback** to your server:

```javascript
app.post("/api/mpesa/callback", express.json(), async (req, res) => {
  try {
    // STEP 4A: Extract callback data from Safaricom
    const body = req.body;
    const stk = body?.Body?.stkCallback;

    if (!stk) {
      return res.status(200).json({ received: true });
    }

    // STEP 4B: Check if payment was successful
    const resultCode = stk.ResultCode; // 0 = success, anything else = failure

    // STEP 4C: Extract payment details from callback
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

    // STEP 4D: If payment successful (resultCode = 0)
    if (resultCode === 0) {
      // Find the booking we created
      const findQuery = `SELECT * FROM pending_sessions WHERE phone = ? AND amount = ? AND processed = false`;
      db.query(findQuery, [phone, amount], (err, results) => {
        if (results && results.length) {
          const pending = results[0];

          // Mark booking as paid
          const insertSession = `INSERT INTO sessions (parent_name, child_name, email, session_type, date, time) VALUES (?, ?, ?, ?, ?, ?)`;
          db.query(
            insertSession,
            [
              pending.parent_name,
              pending.child_name,
              pending.email,
              pending.session_type,
              pending.date,
              pending.time,
            ],
            (err2) => {
              console.log("Session booked successfully");
            }
          );

          // Mark as processed so we don't process twice
          db.query(
            `UPDATE pending_sessions SET processed = true WHERE id = ?`,
            [pending.id]
          );

          // Store payment record for history
          const payInsert = `INSERT INTO payments (pending_session_id, provider, provider_ref, status) VALUES (?, ?, ?, ?)`;
          db.query(payInsert, [pending.id, "mpesa", mpesaReceipt, "success"]);
        }
      });
    } else {
      console.log("M-Pesa payment failed or cancelled");
    }

    // Respond quickly to Safaricom (they need 200 response)
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    console.error("Error in mpesa callback handler:", err);
  }
});
```

**What happens**:

1. **Safaricom calls your callback URL** with payment status
2. **Backend extracts payment details**: Amount, Receipt Number, Phone
3. **Backend validates** payment was successful
4. **Backend books the session** - inserts into `sessions` table
5. **Backend records payment** - stores in `payments` table for history
6. **Backend responds** with 200 OK to Safaricom (important!)

---

## Complete Flow Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                           │
│  User enters phone: 254712345678                                   │
│  Clicks "Send M-Pesa STK"                                          │
└───────────────────────┬──────────────────────────────────────────┘
                        │
                        │ POST /api/pay/mpesa
                        │ { amount: 600, phone, bookingId }
                        ↓
┌────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                               │
│  1. Get access token from Safaricom                                │
│  2. Prepare encrypted password and credentials                     │
│  3. Send STK Push request to Safaricom                             │
│  4. Return success to frontend                                     │
└───────────────────────┬──────────────────────────────────────────┘
                        │
                        │ Returns: { success: true }
                        ↓
┌────────────────────────────────────────────────────────────────────┐
│                       FRONTEND (React)                             │
│  Shows message: "M-Pesa STK Push sent..."                          │
│  setLoading(false)                                                 │
└────────────────────────────────────────────────────────────────────┘


        ║                                                    ║
        ║    USER'S PHONE - STK PROMPT APPEARS               ║
        ║    ┌─────────────────────────────┐               ║
        ║    │ Enter M-Pesa PIN            │               ║
        ║    │ Amount: 600 KES             │               ║
        ║    │ Recipient: Kids Coding      │               ║
        ║    └─────────────────────────────┘               ║
        ║                                                    ║
        ║    USER ENTERS PIN AND CONFIRMS                   ║
        ║                                                    ║
        ╚════════════════════════════════════════════════════╝


┌────────────────────────────────────────────────────────────────────┐
│                    SAFARICOM (M-Pesa)                              │
│  Processes payment                                                  │
│  Sends CALLBACK to your server                                     │
└───────────────────────┬──────────────────────────────────────────┘
                        │
                        │ POST /api/mpesa/callback
                        │ { Body: { stkCallback: { ... } } }
                        ↓
┌────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                               │
│  1. Receive callback from Safaricom                                │
│  2. Extract payment details (amount, receipt, phone)               │
│  3. Check if resultCode = 0 (success)                              │
│  4. Find matching booking                                          │
│  5. Insert into sessions table (BOOKING CONFIRMED!)                │
│  6. Record payment in payments table                               │
│  7. Return 200 OK to Safaricom                                     │
└────────────────────────────────────────────────────────────────────┘


DATABASE STATE AFTER PAYMENT:

sessions table:
┌────┬────────────┬───────────┬─────────┬──────────────┬────────┬─────────┐
│ id │ parent_name│ child_name│  email  │ session_type │  date  │  time   │
├────┼────────────┼───────────┼─────────┼──────────────┼────────┼─────────┤
│ 5  │ John Doe   │ Jane Doe  │ j@...   │ Python ...   │ 2025.. │ 10:00   │ ✓ BOOKED
└────┴────────────┴───────────┴─────────┴──────────────┴────────┴─────────┘

payments table:
┌────┬────────────────┬──────────┬─────────────┬────────┐
│ id │ session_id     │ provider │ provider_ref│ status │
├────┼────────────────┼──────────┼─────────────┼────────┤
│ 8  │ 5              │ mpesa    │ RECEIPT123  │success │ ✓ PAID
└────┴────────────────┴──────────┴─────────────┴────────┘
```

---

## Environment Variables Needed (in `.env`)

```bash
# M-Pesa Daraja credentials (from Safaricom)
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=174379  # Your till number
MPESA_PASSKEY=your_passkey

# Callback URL (where Safaricom sends payment confirmation)
MPESA_CALLBACK_URL=https://your-public-url/api/mpesa/callback

# Environment (sandbox for testing, production for live)
MPESA_ENV=sandbox
```

---

## Where Success Message Should Show

**Currently**: Message shows BEFORE payment is confirmed. This is because:

1. Frontend sends STK request
2. Backend responds immediately with "success: true"
3. Frontend shows message

**What should happen** (recommended improvement):

After Safaricom callback confirms payment, you need to **notify the frontend**. Options:

### Option A: Polling (Simple)

```javascript
// Frontend polls after sending STK
setInterval(async () => {
  const booking = await axios.get(`/api/booking/${bookingId}`);
  if (booking.payment_status === "paid") {
    setMessage("✓ Payment successful! Session confirmed!");
  }
}, 2000); // Check every 2 seconds
```

### Option B: WebSockets (Real-time)

```javascript
// Backend sends real-time update when callback received
socket.emit("payment-confirmed", { bookingId, status: "success" });

// Frontend listens
socket.on("payment-confirmed", (data) => {
  setMessage("✓ Payment successful!");
});
```

### Option C: Server-Sent Events (Streaming)

```javascript
// Frontend listens for payment updates
const eventSource = new EventSource(`/api/payment-status/${bookingId}`);
eventSource.onmessage = (event) => {
  setMessage("✓ Payment confirmed!");
};
```

---

## Summary

| Stage             | Location                       | What Happens                                            |
| ----------------- | ------------------------------ | ------------------------------------------------------- |
| **1. User Input** | Payment.jsx                    | User enters phone, clicks button                        |
| **2. STK Push**   | index.js `/api/pay/mpesa`      | Backend sends to Safaricom                              |
| **3. On Phone**   | User's phone                   | STK prompt appears                                      |
| **4. Payment**    | M-Pesa (Safaricom)             | User enters PIN, pays                                   |
| **5. Callback**   | index.js `/api/mpesa/callback` | Backend receives confirmation                           |
| **6. Booking**    | Database                       | Session marked as paid                                  |
| **7. UI Update**  | Payment.jsx                    | ❌ **Currently Missing** - Need to add real-time update |

The flow works, but you're missing **step 7** - notifying the frontend when payment is confirmed!
