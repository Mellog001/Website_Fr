"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorsService = void 0;
const uuid_1 = require("uuid");
const enums_1 = require("../../types/enums");
const database_1 = __importDefault(require("../../config/database"));
const app_error_1 = require("../../common/errors/app-error");
const logger_1 = require("../../config/logger");
class TutorsService {
    /**
     * Fetch tutor profile by User ID
     */
    async getProfile(userId) {
        const [rows] = await database_1.default.execute(`SELECT tp.*, u.id AS user_id_ref, u.email, u.role
       FROM tutor_profiles tp
       JOIN users u ON u.id = tp.user_id
       WHERE tp.user_id = ?`, [userId]);
        if (rows.length === 0) {
            throw app_error_1.AppError.notFound('Tutor profile not found.');
        }
        const row = rows[0];
        return {
            ...row,
            user: {
                id: row.user_id_ref,
                email: row.email,
                role: row.role,
            },
        };
    }
    /**
     * Fetch a paginated list of all verified tutors (Public)
     */
    async getPublicTutors(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const [rows] = await database_1.default.execute(`SELECT tp.id, tp.bio, tp.qualifications, tp.competency_score, tp.verified_at,
              u.id AS user_id_ref, u.email
       FROM tutor_profiles tp
       JOIN users u ON u.id = tp.user_id
       WHERE tp.is_verified = TRUE AND tp.competency_status = 'PASSED'
       ORDER BY tp.verified_at DESC
       LIMIT ? OFFSET ?`, [limit.toString(), offset.toString()] // Using string conversion to avoid mysql2 prepared statement issues with numbers in some configurations
        );
        const [countRows] = await database_1.default.execute(`SELECT COUNT(*) as total
       FROM tutor_profiles tp
       WHERE tp.is_verified = TRUE AND tp.competency_status = 'PASSED'`);
        const total = countRows[0].total;
        const data = rows.map((r) => ({
            id: r.id,
            bio: r.bio,
            qualifications: r.qualifications,
            competencyScore: r.competency_score,
            verifiedAt: r.verified_at,
            user: {
                id: r.user_id_ref,
                // In a real app, you might want to mask the email or only show public names
                email: r.email,
            },
        }));
        return {
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Fetch detailed profile of a single verified tutor (Public)
     */
    async getPublicTutorById(profileId) {
        const [rows] = await database_1.default.execute(`SELECT tp.id, tp.bio, tp.qualifications, tp.competency_score, tp.verified_at,
              u.id AS user_id_ref, u.email
       FROM tutor_profiles tp
       JOIN users u ON u.id = tp.user_id
       WHERE tp.id = ? AND tp.is_verified = TRUE AND tp.competency_status = 'PASSED'`, [profileId]);
        if (rows.length === 0) {
            throw app_error_1.AppError.notFound('Verified tutor not found.');
        }
        const row = rows[0];
        return {
            id: row.id,
            bio: row.bio,
            qualifications: row.qualifications,
            competencyScore: row.competency_score,
            verifiedAt: row.verified_at,
            user: {
                id: row.user_id_ref,
                email: row.email,
            },
        };
    }
    /**
     * Update tutor bio and qualifications
     */
    async updateProfile(userId, data) {
        const [existing] = await database_1.default.execute('SELECT id FROM tutor_profiles WHERE user_id = ?', [userId]);
        if (existing.length === 0) {
            throw app_error_1.AppError.notFound('Tutor profile not found.');
        }
        const fields = [];
        const values = [];
        if (data.bio !== undefined) {
            fields.push('bio = ?');
            values.push(data.bio);
        }
        if (data.qualifications !== undefined) {
            fields.push('qualifications = ?');
            values.push(JSON.stringify(data.qualifications));
        }
        if (fields.length > 0) {
            values.push(userId);
            await database_1.default.execute(`UPDATE tutor_profiles SET ${fields.join(', ')} WHERE user_id = ?`, values);
        }
        const [updated] = await database_1.default.execute('SELECT * FROM tutor_profiles WHERE user_id = ?', [userId]);
        logger_1.logger.info(`📝 Tutor profile updated for user ${userId}`);
        return updated[0];
    }
    /**
     * Request a tutor competency test for a specific subject
     */
    async requestCompetencyTest(userId, subjectId, submissionFileUrl, submissionFileKey) {
        const [profileRows] = await database_1.default.execute('SELECT id FROM tutor_profiles WHERE user_id = ?', [userId]);
        if (profileRows.length === 0) {
            throw app_error_1.AppError.notFound('Tutor profile not found. Complete profile details first.');
        }
        const profile = profileRows[0];
        // Verify Subject exists
        const [subjectRows] = await database_1.default.execute('SELECT id, name, code FROM subjects WHERE id = ?', [subjectId]);
        if (subjectRows.length === 0) {
            throw app_error_1.AppError.notFound('Subject not found.');
        }
        // Check for any ongoing PENDING test for this subject
        const [pendingRows] = await database_1.default.execute('SELECT id FROM tutor_competency_tests WHERE tutor_profile_id = ? AND subject_id = ? AND status = ?', [profile.id, subjectId, enums_1.CompetencyStatus.PENDING]);
        if (pendingRows.length > 0) {
            throw app_error_1.AppError.conflict('You already have a pending evaluation for this subject.');
        }
        const testId = (0, uuid_1.v4)();
        await database_1.default.execute('INSERT INTO tutor_competency_tests (id, tutor_profile_id, subject_id, status, submission_file_url, submission_file_key) VALUES (?, ?, ?, ?, ?, ?)', [testId, profile.id, subjectId, enums_1.CompetencyStatus.PENDING, submissionFileUrl, submissionFileKey]);
        const test = {
            id: testId,
            tutorProfileId: profile.id,
            subjectId,
            status: enums_1.CompetencyStatus.PENDING,
            submissionFileUrl,
            subject: { name: subjectRows[0].name, code: subjectRows[0].code },
        };
        logger_1.logger.info(`📝 Competency test requested by Tutor ${profile.id} for Subject ${subjectRows[0].name}`);
        return test;
    }
    /**
     * List all competency tests based on user roles
     */
    async listCompetencyTests(userId, role) {
        if (role === enums_1.UserRole.ADMIN) {
            // Admins see all tests
            const [rows] = await database_1.default.execute(`SELECT tct.*, 
                tp.user_id AS tutor_user_id, u.email AS tutor_email,
                s.name AS subject_name, s.code AS subject_code
         FROM tutor_competency_tests tct
         JOIN tutor_profiles tp ON tp.id = tct.tutor_profile_id
         JOIN users u ON u.id = tp.user_id
         JOIN subjects s ON s.id = tct.subject_id
         ORDER BY tct.created_at DESC`);
            return rows.map((r) => ({
                ...r,
                tutorProfile: {
                    id: r.tutor_profile_id,
                    userId: r.tutor_user_id,
                    user: { email: r.tutor_email },
                },
                subject: { name: r.subject_name, code: r.subject_code },
            }));
        }
        else {
            // Tutors only see their own tests
            const [profileRows] = await database_1.default.execute('SELECT id FROM tutor_profiles WHERE user_id = ?', [userId]);
            if (profileRows.length === 0) {
                throw app_error_1.AppError.notFound('Tutor profile not found.');
            }
            const [rows] = await database_1.default.execute(`SELECT tct.*, s.name AS subject_name, s.code AS subject_code
         FROM tutor_competency_tests tct
         JOIN subjects s ON s.id = tct.subject_id
         WHERE tct.tutor_profile_id = ?
         ORDER BY tct.created_at DESC`, [profileRows[0].id]);
            return rows.map((r) => ({
                ...r,
                subject: { name: r.subject_name, code: r.subject_code },
            }));
        }
    }
    /**
     * Grade a pending competency test (Admin only)
     */
    async gradeCompetencyTest(adminUserId, testId, score, status, feedback) {
        const [testRows] = await database_1.default.execute('SELECT * FROM tutor_competency_tests WHERE id = ?', [testId]);
        if (testRows.length === 0) {
            throw app_error_1.AppError.notFound('Competency test not found.');
        }
        const test = testRows[0];
        if (test.status !== enums_1.CompetencyStatus.PENDING) {
            throw app_error_1.AppError.conflict('This competency test has already been graded.');
        }
        // Perform atomic update: grade the test and update the tutor profile status
        const connection = await database_1.default.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('UPDATE tutor_competency_tests SET score = ?, status = ?, feedback = ?, graded_by_id = ? WHERE id = ?', [score, status, feedback, adminUserId, testId]);
            // Update Tutor Profile overall status
            await connection.execute('UPDATE tutor_profiles SET competency_score = ?, competency_status = ? WHERE id = ?', [score, status, test.tutor_profile_id]);
            await connection.commit();
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
        // Fetch graded test
        const [gradedRows] = await database_1.default.execute('SELECT * FROM tutor_competency_tests WHERE id = ?', [testId]);
        logger_1.logger.info(`🎓 Competency test ${testId} graded [${status}] with score ${score}% by Admin ${adminUserId}`);
        return gradedRows[0];
    }
    /**
     * Verify/Approve a tutor profile (Admin only)
     */
    async verifyTutor(adminUserId, profileId, isVerified) {
        const [profileRows] = await database_1.default.execute('SELECT * FROM tutor_profiles WHERE id = ?', [profileId]);
        if (profileRows.length === 0) {
            throw app_error_1.AppError.notFound('Tutor profile not found.');
        }
        const profile = profileRows[0];
        if (isVerified && profile.competency_status !== enums_1.CompetencyStatus.PASSED) {
            throw app_error_1.AppError.badRequest('Cannot verify tutor. Tutor must pass a competency test first.');
        }
        await database_1.default.execute('UPDATE tutor_profiles SET is_verified = ?, verified_at = ?, verified_by_id = ? WHERE id = ?', [isVerified, isVerified ? new Date() : null, isVerified ? adminUserId : null, profileId]);
        const [updated] = await database_1.default.execute('SELECT * FROM tutor_profiles WHERE id = ?', [profileId]);
        logger_1.logger.info(`🛡️ Tutor verification status set to ${isVerified} for Profile ${profileId} by Admin ${adminUserId}`);
        return updated[0];
    }
}
exports.TutorsService = TutorsService;
exports.default = TutorsService;
//# sourceMappingURL=tutors.service.js.map