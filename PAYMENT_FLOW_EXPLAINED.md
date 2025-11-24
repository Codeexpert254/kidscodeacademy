# Payment.jsx Walkthrough

This file handles the complete booking and payment flow for tutoring sessions. It's split into two main components:

## Component Structure

### 1. **Main Component: `Payment`** (Lines 1-180)

This is the main page that users see. It handles the booking form.

#### State Variables:

```javascript
const [formData, setFormData] = useState({...})    // Stores form input (parent name, email, etc.)
const [message, setMessage] = useState("")         // Shows success/error messages
const [loading, setLoading] = useState(false)      // Shows loading spinner during submission
const [bookingId, setBookingId] = useState(null)   // Stores the ID returned after booking
const [showPaymentOptions, setShowPaymentOptions] = useState(false) // Toggle between booking and payment screens
```

#### Key Function: `handleChange`

```javascript
const handleChange = (e) => {
  setFormData({ ...formData, [e.target.name]: e.target.value });
};
```

**What it does**: Updates the `formData` state whenever user types in a form field.

- Takes the current state
- Updates only the field that changed
- Keeps all other fields unchanged

#### Key Function: `handleSubmit`

```javascript
const handleSubmit = async (e) => {
  // Step 1: POST booking data to server
  const res = await axios.post(
    "https://kidscodeacademy.onrender.com/api/book-session",
    formData
  );

  // Step 2: If successful, extract booking ID
  if (res.data && res.data.id) {
    setBookingId(res.data.id); // Save booking ID
    setShowPaymentOptions(true); // Switch to payment screen
    // Reset form for next booking
  }
};
```

**What happens**:

1. User clicks "Book Session" button
2. Form data is sent to backend (`/api/book-session`)
3. Backend creates booking in database and returns booking ID
4. UI switches to show payment options
5. Form is cleared

#### The UI Logic:

```javascript
{
  !showPaymentOptions ? (
    <Form onSubmit={handleSubmit}>{/* Show booking form */}</Form>
  ) : (
    <PaymentMethodSelector bookingId={bookingId} amount={6000} />
  );
}
```

**What it does**:

- If `showPaymentOptions` is `false` → Show booking form
- If `showPaymentOptions` is `true` → Show payment method selector

---

### 2. **Sub-Component: `PaymentMethodSelector`** (Lines 182-382)

This component appears after successful booking and lets user choose how to pay.

#### State Variables:

```javascript
const [paymentMethod, setPaymentMethod] = useState("stripe"); // Which method user selected
const [loading, setLoading] = useState(false); // Loading state
const [phone, setPhone] = useState(""); // M-Pesa phone number
const [message, setMessage] = useState(""); // Messages
const [paypalOrderId, setPaypalOrderId] = useState(null); // Store PayPal order ID
```

#### Payment Method 1: Stripe (Card)

```javascript
const handleStripePayment = async () => {
  // Create URLs for after payment
  const success_url = `...?payment_status=success&booking_id=${bookingId}`;
  const cancel_url = `...?payment_status=canceled&booking_id=${bookingId}`;

  // Ask server to create Stripe Checkout session
  const res = await axios.post("/api/pay/stripe/create-session", {
    amount, // $60.00 in cents (6000)
    success_url, // Where to redirect after payment
    cancel_url, // Where to redirect if canceled
    bookingId, // Link payment to booking
  });

  // Redirect user to Stripe Checkout page
  window.location.href = res.data.url;
};
```

**Flow**:

1. User clicks "Pay with Card"
2. Server creates a Stripe Checkout session
3. Browser redirects to Stripe's payment page
4. User enters card details (on Stripe's secure page, not yours!)
5. After payment, redirects back with success/cancel status

#### Payment Method 2: PayPal

```javascript
const handlePayPalPayment = async () => {
  // Create PayPal order
  const res = await axios.post("/api/pay/paypal/create-order", {
    amount,
    bookingId,
  });

  // Open PayPal approval page in new tab
  setPaypalOrderId(res.data.orderId);
  window.open(res.data.approvalUrl, "_blank");
};

const handlePayPalCapture = async () => {
  // After user approves in PayPal, capture the payment
  const res = await axios.post("/api/pay/paypal/capture", {
    orderId: paypalOrderId,
    bookingId,
  });
};
```

**Flow**:

1. User clicks "Create PayPal Order"
2. Server creates order via PayPal API, returns approval URL
3. New tab opens with PayPal approval page
4. User logs in and approves
5. User returns to your app
6. User clicks "Confirm PayPal Payment"
7. Server captures the approved payment

#### Payment Method 3: M-Pesa

```javascript
const handleMPesaPayment = async () => {
  // User enters phone number first
  const res = await axios.post("/api/pay/mpesa", {
    amount: Math.floor(amount / 100), // Convert $60 to 600 KES
    phone, // 2547XXXXXXXX
    bookingId,
  });
};
```

**Flow**:

1. User enters phone number (Kenya mobile)
2. User clicks "Send M-Pesa STK"
3. Server sends STK push to phone
4. User gets prompt on phone to enter PIN
5. After successful payment, server gets callback with payment confirmation
6. Booking is marked as paid

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER FILLS FORM                          │
│  - Parent Name, Child Name, Email, Session Type, Date, Time │
└───────────────────────┬─────────────────────────────────────┘
                        │ Click "Book Session"
                        ↓
        ┌───────────────────────────────────┐
        │  handleSubmit()                    │
        │  POST /api/book-session            │
        │  Server creates booking in DB      │
        └───────────────┬─────────────────────┘
                        │
                        ↓ Returns bookingId
        ┌───────────────────────────────────┐
        │ Show PaymentMethodSelector         │
        │ (Booking form hidden)              │
        └───────────────┬─────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ↓               ↓               ↓
    [Stripe]        [PayPal]         [M-Pesa]
        │               │               │
    Redirect to    Open new tab    Send STK to
    Stripe         + Approval URL   Phone
```

---

## Key Concepts Explained

### "Conditional Rendering"

```javascript
{
  !showPaymentOptions ? <Form /> : <PaymentMethodSelector />;
}
```

Switches between two screens based on a boolean state.

### "Async/Await"

```javascript
const res = await axios.post(...)  // Wait for server response
```

Waits for the server to respond before continuing.

### "State Management"

```javascript
setBookingId(res.data.id); // Store booking ID in React state
// Later: can use bookingId in payment methods
```

Keeps data in memory that multiple functions need to access.

### "State Lifting"

```javascript
<PaymentMethodSelector bookingId={bookingId} amount={6000} />
```

Parent component passes `bookingId` to child so child can use it.

---

## What Each Payment Method Requires

| Method     | What You Need                          | User Flow                                                       |
| ---------- | -------------------------------------- | --------------------------------------------------------------- |
| **Stripe** | STRIPE_SECRET_KEY in .env              | Click Pay → Redirected → Pay on Stripe page → Redirect back     |
| **PayPal** | PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET | Create Order → Open approval URL in new tab → Approve → Confirm |
| **M-Pesa** | Daraja credentials, Kenyan phone       | Enter phone → Send STK → Confirm on phone with PIN → Auto-book  |

---

## Summary

1. **Booking Phase**: User fills form → Clicks "Book Session" → Session saved (no payment yet)
2. **Payment Phase**: User chooses payment method → Completes payment → Session is confirmed as paid
3. **Backend Integration**: Each payment method calls different server endpoints that handle the payment provider's API

This two-step approach means booking is separate from payment, so users aren't blocked if payment fails.
