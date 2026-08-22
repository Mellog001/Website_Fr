"use strict";
// ============================================
// Shared Enum Types (replaces @prisma/client enums)
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionStatus = exports.SubmissionStatus = exports.PaymentStatus = exports.EnrollmentStatus = exports.CompetencyStatus = exports.UserRole = void 0;
exports.UserRole = {
    STUDENT: 'STUDENT',
    TUTOR: 'TUTOR',
    ADMIN: 'ADMIN',
};
exports.CompetencyStatus = {
    PENDING: 'PENDING',
    PASSED: 'PASSED',
    FAILED: 'FAILED',
};
exports.EnrollmentStatus = {
    ACTIVE: 'ACTIVE',
    COMPLETED: 'COMPLETED',
};
exports.PaymentStatus = {
    PENDING: 'PENDING',
    SUCCESSFUL: 'SUCCESSFUL',
    FAILED: 'FAILED',
};
exports.SubmissionStatus = {
    SUBMITTED: 'SUBMITTED',
    GRADED: 'GRADED',
};
exports.SessionStatus = {
    SCHEDULED: 'SCHEDULED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
};
//# sourceMappingURL=enums.js.map