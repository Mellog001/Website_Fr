-- ============================================
-- EduConnect Database Initialization Script
-- Engine: MySQL 8.0+
-- ============================================

CREATE DATABASE IF NOT EXISTS educonnect;
USE educonnect;

-- ============================================
-- USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('STUDENT', 'TUTOR', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL DEFAULT NULL,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TUTOR PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS tutor_profiles (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  bio TEXT NULL,
  qualifications JSON NOT NULL DEFAULT ('[]'),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at DATETIME NULL DEFAULT NULL,
  verified_by_id VARCHAR(36) NULL,
  competency_score DECIMAL(5,2) NULL,
  competency_status ENUM('PENDING', 'PASSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tutor_profiles_user_id (user_id),
  INDEX idx_tutor_profiles_is_verified (is_verified),
  CONSTRAINT fk_tutor_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SUBJECTS
-- ============================================
CREATE TABLE IF NOT EXISTS subjects (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_subjects_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- COURSES
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  subject_id VARCHAR(36) NOT NULL,
  tutor_id VARCHAR(36) NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  image_url VARCHAR(1024) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_courses_subject_id (subject_id),
  INDEX idx_courses_tutor_id (tutor_id),
  INDEX idx_courses_is_published (is_published),
  CONSTRAINT fk_courses_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
  CONSTRAINT fk_courses_tutor FOREIGN KEY (tutor_id) REFERENCES tutor_profiles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ALTER TABLE courses ADD COLUMN image_url VARCHAR(1024) NULL;

-- ============================================
-- MODULES
-- ============================================
CREATE TABLE IF NOT EXISTS modules (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  course_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  `order` INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_modules_course_id (course_id),
  INDEX idx_modules_order (`order`),
  CONSTRAINT fk_modules_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MATERIALS
-- ============================================
CREATE TABLE IF NOT EXISTS materials (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  module_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  file_url VARCHAR(1024) NOT NULL,
  file_key VARCHAR(512) NOT NULL,
  file_type VARCHAR(255) NOT NULL,
  size INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_materials_module_id (module_id),
  CONSTRAINT fk_materials_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ENROLLMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS enrollments (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  course_id VARCHAR(36) NOT NULL,
  progress DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  status ENUM('ACTIVE', 'COMPLETED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_enrollments_student_course (student_id, course_id),
  INDEX idx_enrollments_student_id (student_id),
  INDEX idx_enrollments_course_id (course_id),
  CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  course_id VARCHAR(36) NOT NULL,
  enrollment_id VARCHAR(36) NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('PENDING', 'SUCCESSFUL', 'FAILED') NOT NULL DEFAULT 'PENDING',
  checkout_request_id VARCHAR(255) NOT NULL UNIQUE,
  merchant_request_id VARCHAR(255) NOT NULL,
  mpesa_receipt_number VARCHAR(255) NULL UNIQUE,
  phone_number VARCHAR(20) NOT NULL,
  paid_at DATETIME NULL DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payments_checkout_request_id (checkout_request_id),
  INDEX idx_payments_student_id (student_id),
  INDEX idx_payments_course_id (course_id),
  CONSTRAINT fk_payments_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ASSESSMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS assessments (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  module_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  max_score INT NOT NULL,
  file_url VARCHAR(1024) NULL,
  file_key VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_assessments_module_id (module_id),
  CONSTRAINT fk_assessments_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SUBMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS submissions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  assessment_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  file_url VARCHAR(1024) NOT NULL,
  file_key VARCHAR(512) NOT NULL,
  score DECIMAL(5,2) NULL,
  graded_by_id VARCHAR(36) NULL,
  feedback TEXT NULL,
  status ENUM('SUBMITTED', 'GRADED') NOT NULL DEFAULT 'SUBMITTED',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_submissions_assessment_id (assessment_id),
  INDEX idx_submissions_student_id (student_id),
  CONSTRAINT fk_submissions_assessment FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  CONSTRAINT fk_submissions_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_submissions_grader FOREIGN KEY (graded_by_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TUTOR COMPETENCY TESTS
-- ============================================
CREATE TABLE IF NOT EXISTS tutor_competency_tests (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tutor_profile_id VARCHAR(36) NOT NULL,
  subject_id VARCHAR(36) NOT NULL,
  score DECIMAL(5,2) NULL,
  status ENUM('PENDING', 'PASSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  submission_file_url VARCHAR(1024) NOT NULL,
  submission_file_key VARCHAR(512) NOT NULL,
  graded_by_id VARCHAR(36) NULL,
  feedback TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_competency_tests_tutor (tutor_profile_id),
  INDEX idx_competency_tests_subject (subject_id),
  CONSTRAINT fk_competency_tests_tutor FOREIGN KEY (tutor_profile_id) REFERENCES tutor_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_competency_tests_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  tutor_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NULL,
  course_id VARCHAR(36) NULL,
  scheduled_at DATETIME NOT NULL,
  duration_minutes INT NOT NULL,
  meeting_link VARCHAR(1024) NOT NULL,
  status ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sessions_tutor_id (tutor_id),
  INDEX idx_sessions_student_id (student_id),
  INDEX idx_sessions_scheduled_at (scheduled_at),
  CONSTRAINT fk_sessions_tutor FOREIGN KEY (tutor_id) REFERENCES tutor_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_sessions_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_sessions_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- REFRESH TOKENS  (replaces Redis session store)
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token_id VARCHAR(36) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_refresh_tokens_user_id (user_id),
  INDEX idx_refresh_tokens_token_id (token_id),
  INDEX idx_refresh_tokens_expires_at (expires_at),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VERIFICATION TOKENS (Email Verification & Password Reset)
-- ============================================
CREATE TABLE IF NOT EXISTS verification_tokens (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(255) NOT NULL,
  type ENUM('EMAIL_VERIFICATION', 'PASSWORD_RESET') NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_verification_tokens_user_id (user_id),
  INDEX idx_verification_tokens_token (token),
  INDEX idx_verification_tokens_expires_at (expires_at),
  CONSTRAINT fk_verification_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SCHEDULED JOBS  (replaces BullMQ / Redis queues)
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  queue_name VARCHAR(100) NOT NULL,
  job_name VARCHAR(100) NOT NULL,
  payload JSON NOT NULL,
  status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  run_at DATETIME NOT NULL,
  error_message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scheduled_jobs_poll (queue_name, status, run_at),
  INDEX idx_scheduled_jobs_run_at (run_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- First, check current status values
SELECT COLUMN_TYPE FROM information_schema.COLUMNS 
WHERE TABLE_NAME = 'enrollments' AND COLUMN_NAME = 'status';

-- If needed, update the ENUM to include PENDING
ALTER TABLE enrollments MODIFY COLUMN status ENUM('PENDING', 'ACTIVE', 'COMPLETED', 'DROPPED', 'REJECTED') DEFAULT 'PENDING';