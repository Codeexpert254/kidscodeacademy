# Server payment configuration and testing

This file explains environment variables and quick test instructions for payments (Stripe, PayPal, M-Pesa).

## Required environment variables

Copy `.env.example` to `.env` and fill values.

- STRIPE_SECRET_KEY - Your Stripe secret key (test mode OK for development).
- PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET - PayPal sandbox credentials.
- PAYPAL_ENV - `sandbox` or `live`.
- MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET - Safaricom Daraja credentials (sandbox).
- MPESA_SHORTCODE, MPESA_PASSKEY - Provided by Safaricom for your app.
- MPESA_ENV - `sandbox` (default) or `production`.
- MPESA_CALLBACK_URL - Public URL (ngrok) for Daraja to POST payment results to `/api/mpesa/callback`.
- SERVER_BASE_URL - public base URL for your server (used as fallback for callbacks).

## How the flows work

- Stripe (card)

  - Client calls `/api/pay/stripe/create-session` and is redirected to Stripe Checkout.
  - After payment, Stripe redirects back with `?session_id=...&provider=stripe`.
  - Client verifies the session with `/api/pay/stripe/verify` and then calls `/api/book-session` to create the booking.

- PayPal

  - Client calls `/api/pay/paypal/create-order` which creates an order and returns an approval URL.
  - Client opens that URL and approves payment.
  - Client calls `/api/pay/paypal/capture` to capture the order; on success the client calls `/api/book-session`.

- M-Pesa (Daraja STK Push)
  - Client calls `/api/pay/mpesa` with `booking` data and phone number.
  - Server creates a `pending_sessions` row and initiates the STK Push using the pending id in `AccountReference`.
  - Daraja sends a callback to `/api/mpesa/callback`. The server attempts a best-effort match by `phone` and `amount`, marks the pending session processed, inserts a session into `sessions`, and inserts a `payments` record.

## Testing tips

- Stripe: use your test secret key and a test card (4242 4242 4242 4242 with any future expiry and any CVC). After checkout you'll be redirected back to the app.

- PayPal: use sandbox credentials and sandbox buyer accounts. The code opens the approval URL in a new tab; approve, then press "Confirm PayPal Payment" in the app.

- M-Pesa: Daraja sandbox requires a publicly reachable callback URL. Use `ngrok http 5000` and set `MPESA_CALLBACK_URL` to the forwarded URL + `/api/mpesa/callback`. Use sandbox credentials and the STK Push simulator provided by Safaricom.

## Notes & security

- Card handling uses Stripe Checkout which keeps you out of raw card handling and is PCI-friendly.
- The previous `api/pay/card` endpoint remains as a placeholder and should not be used in production.
- For production, ensure HTTPS, secure env storage, and proper verification of callbacks (e.g., validate signatures when supported).

If you'd like, I can wire PayPal in-page buttons instead of the current open-new-tab flow, or integrate webhooks for automatic booking instead of client-confirmation.
