# Background Processing

Use:
Redis + BullMQ

Queues:

notifications
payments
uploads
cleanup

Jobs:

- Pending payment reconciliation
- Upload cleanup
- Email notifications
- Tutor verification notifications
- Assessment reminders

Requirements:

Retries
Dead letter queues
Monitoring