# M-Pesa Integration

Provider:
Safaricom Daraja API

Features:

- STK Push
- Callback Processing
- Payment Reconciliation

Flow:

1 Create payment record
2 Initiate STK Push
3 Store checkoutRequestId
4 Receive callback
5 Confirm payment
6 Create enrollment
7 Unlock first module

Requirements:

- Idempotency
- Retry logic
- BullMQ reconciliation jobs
- Webhook verification
- Audit logging

Generate:

mpesa.service.ts
callback handlers
reconciliation workers
tests