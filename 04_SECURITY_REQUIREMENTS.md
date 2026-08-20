# Security Requirements

Implement:

## Authentication

- JWT RS256
- Refresh token rotation
- Password hashing with bcrypt cost 12

## Authorization

Middleware:
authenticate
authorize

Roles:
- STUDENT
- TUTOR
- ADMIN

## Protection

- Rate limiting
- Request validation
- Input sanitization
- SQL injection prevention
- XSS protection
- Secure headers

## Audit Logging

Track:

- Login attempts
- Payments
- Admin actions
- Tutor approvals