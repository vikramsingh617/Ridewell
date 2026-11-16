# RideWell — MERN car rental marketplace

A functional full-stack marketplace starter with a premium responsive React UI and Express/MongoDB API.

## Included
- Customer and host registration/login (bcrypt password hashing, JWT authentication)
- Role-based access control for customer, host and admin
- Approved vehicle catalogue with city/category/transmission/seat/price filters
- Host vehicle submission workflow with admin approval queue
- Booking requests with server-side price snapshots and date-overlap checks
- Booking lifecycle: PENDING → CONFIRMED → PICKUP_PENDING → ACTIVE → RETURN_PENDING → COMPLETED
- Customer/host booking views and admin overview metrics
- Reviews model scaffold, security headers, API rate limit, Zod request validation

## Requirements
- Node.js 20+
- MongoDB 6+ (local or Atlas)

## Run locally
1. Start MongoDB.
2. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` and a long random `JWT_SECRET`.
3. From this directory run:
   ```bash
   npm install
   npm --prefix server install
   npm --prefix client install
   npm run dev
   ```
4. Web app: http://localhost:5173 · API health: http://localhost:5000/api/health

## Create the first admin
Register a normal account, then promote its role directly in MongoDB (do not expose public admin registration):
```js
db.users.updateOne({ email: "admin@yourdomain.com" }, { $set: { role: "admin" } })
```

## Important production work before launch
This code is a working MVP foundation, not a certified production payments/insurance/KYC system. Do not accept real money yet. Add and verify a payment provider (Razorpay/Stripe) with signed webhooks, idempotency keys, refund and payout reconciliation; implement secure KYC document storage and manual/third-party verification; add pickup/return inspection evidence and dispute workflows; use MongoDB transactions or an atomic reservation/locking strategy for high-concurrency booking creation; add email/SMS OTP, refresh-token rotation, audit logs, monitoring, backups, tests, CI/CD, HTTPS, secrets management and legal/insurance compliance for your operating region.

Booking overlap validation is implemented at the API level for MVP use. For high-traffic production booking, move reservation creation to a transaction/atomic inventory-lock strategy to eliminate race windows under simultaneous requests.
