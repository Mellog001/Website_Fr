# 🚀 EduConnect Backend - Postman Test Plan

This document outlines a comprehensive Postman test strategy to validate all backend modules, endpoints, role-based access controls, and integrations.

## 🛠 1. Environment Setup

Before executing the endpoints, configure a Postman Environment (e.g., `EduConnect Dev`) with the following variables:

| Variable | Initial Value | Description |
| :--- | :--- | :--- |
| `baseUrl` | `http://localhost:5000/api/v1` | The base URL of the API |
| `accessToken` | *(Leave empty)* | JWT Access Token (Auto-populated by Login script) |
| `refreshToken`| *(Leave empty)* | JWT Refresh Token (Auto-populated by Login script) |
| `tutorId` | *(Leave empty)* | ID of a registered Tutor profile |
| `courseId` | *(Leave empty)* | ID of a created course |
| `moduleId` | *(Leave empty)* | ID of a created module |
| `assessmentId`| *(Leave empty)* | ID of a created assessment |
| `submissionId`| *(Leave empty)* | ID of a student's submission |
| `fileKey` | *(Leave empty)* | Returned from the Storage Upload endpoint |

### Global Authorization Settings
For all protected endpoints (except Auth public routes), configure the collection's Authorization tab:
* **Type**: Bearer Token
* **Token**: `{{accessToken}}`

---

## 🔐 2. Authentication & Users (`/auth`)

These endpoints manage user identities and sessions.

### 2.1 Register New User
* **Method**: `POST`
* **Endpoint**: `{{baseUrl}}/auth/register`
* **Body (JSON)**:
  ```json
  {
    "email": "student@example.com",
    "password": "Password123",
    "role": "STUDENT" // or "TUTOR"
  }
  ```
* **Expected Response**: `200 OK` (Returns the verification token in backend console/email. Account created).

### 2.2 Login
* **Method**: `POST`
* **Endpoint**: `{{baseUrl}}/auth/login`
* **Body (JSON)**:
  ```json
  {
    "email": "student@example.com",
    "password": "Password123"
  }
  ```
* **Postman Test Script** *(To auto-save tokens)*:
  ```javascript
  if (pm.response.code === 200) {
      var data = pm.response.json().data;
      pm.environment.set("accessToken", data.accessToken);
      pm.environment.set("refreshToken", data.refreshToken);
  }
  ```

### 2.3 Get Current User Profile
* **Method**: `GET`
* **Endpoint**: `{{baseUrl}}/auth/me`
* **Expected Response**: `200 OK` (Returns user ID, email, role, and verification status).

### 2.4 Refresh Token
* **Method**: `POST`
* **Endpoint**: `{{baseUrl}}/auth/refresh`
* **Body (JSON)**:
  ```json
  {
    "refreshToken": "{{refreshToken}}"
  }
  ```

### 2.5 Change Password (Authenticated)
* **Method**: `PUT`
* **Endpoint**: `{{baseUrl}}/auth/change-password`
* **Body (JSON)**:
  ```json
  {
    "oldPassword": "Password123",
    "newPassword": "NewPassword456"
  }
  ```

### 2.6 Logout
* **Method**: `POST`
* **Endpoint**: `{{baseUrl}}/auth/logout`
* **Body (JSON)**:
  ```json
  {
    "refreshToken": "{{refreshToken}}"
  }
  ```

---

## 👩‍🏫 3. Tutor Profiles (`/tutors`)

Endpoints for tutor verification and competency tracking.

### 3.1 Get Public Tutors List
* **Method**: `GET`
* **Endpoint**: `{{baseUrl}}/tutors/public`

### 3.2 Get Own Tutor Profile
* **Method**: `GET`
* **Endpoint**: `{{baseUrl}}/tutors/profile`
* **Headers**: `Authorization: Bearer {{accessToken}}` (Must be logged in as TUTOR)

### 3.3 Update Tutor Profile
* **Method**: `PUT`
* **Endpoint**: `{{baseUrl}}/tutors/profile`
* **Body (JSON)**:
  ```json
  {
    "bio": "Expert mathematics tutor with 10 years of experience.",
    "qualifications": ["https://link-to-degree.com/cert.pdf"]
  }
  ```

### 3.4 Request Competency Test
* **Method**: `POST`
* **Endpoint**: `{{baseUrl}}/tutors/competency-tests`
* **Body (JSON)**:
  ```json
  {
    "subjectId": "{{subjectId}}",
    "submissionFileUrl": "http://localhost:5000/uploads/test.pdf",
    "submissionFileKey": "{{fileKey}}"
  }
  ```

---

## 📚 4. Courses & Curriculum (`/courses`)

Endpoints for creating and browsing courses.

### 4.1 Create Subject (Admin Only)
* **Method**: `POST`
* **Endpoint**: `{{baseUrl}}/courses/subjects`
* **Body (JSON)**:
  ```json
  {
    "name": "Advanced Calculus",
    "code": "MATH301",
    "description": "Limits, derivatives, integrals, and the fundamental theorem of calculus."
    "f560f3b3-4419-4899-a9ac-b78bf0cbd597"
  }
  ```

### 4.2 Get Course Catalog
* **Method**: `GET`
* **Endpoint**: `{{baseUrl}}/courses/catalog?page=1&limit=10&sortBy=price_desc`

### 4.3 Create Course Draft (Verified Tutor Only)
* **Method**: `POST`
* **Endpoint**: `{{baseUrl}}/courses`
* **Body (JSON)**:
  ```json
  {
    "title": "Mastering Calculus",
    "description": "Comprehensive guide to Math.",
    "price": 29.99,
    "subjectId": "{{subjectId}}"
  }
  ```

### 4.4 Add Module to Course
* **Method**: `POST`
* **Endpoint**: `{{baseUrl}}/courses/modules`
* **Body (JSON)**:
  ```json
  {
    "courseId": "{{courseId}}",
    "title": "Module 1: Limits",
    "order": 1
  }
  ```

### 4.5 Get Course Details
* **Method**: `GET`
* **Endpoint**: `{{baseUrl}}/courses/{{courseId}}`

---

## 📝 5. Assessments & Submissions (`/assessments`)

### 5.1 Create Assessment (Tutor Only)
* **Method**: `POST`
* **Endpoint**: `{{baseUrl}}/assessments`
* **Body (JSON)**:
  ```json
  {
    "moduleId": "{{moduleId}}",
    "title": "Calculus Midterm",
    "description": "Solve all 10 problems.",
    "maxScore": 100
  }
  ```

### 5.2 Submit Assessment (Student Only)
* **Method**: `POST`
* **Endpoint**: `{{baseUrl}}/assessments/{{assessmentId}}/submissions`
* **Body (JSON)**:
  ```json
  {
    "fileUrl": "http://localhost:5000/uploads/my-answers.pdf",
    "fileKey": "{{fileKey}}"
  }
  ```

### 5.3 Grade Submission (Tutor Only)
* **Method**: `POST`
* **Endpoint**: `{{baseUrl}}/assessments/submissions/{{submissionId}}/grade`
* **Body (JSON)**:
  ```json
  {
    "score": 95,
    "feedback": "Excellent work on the derivatives section!"
  }
  ```

### 5.4 Get My Submissions (Student Only)
* **Method**: `GET`
* **Endpoint**: `{{baseUrl}}/assessments/my-submissions`

---

## 📁 6. Storage & Materials (`/storage`)

### 6.1 Initialize File Upload
* **Method**: `POST`
* **Endpoint**: `{{baseUrl}}/storage/upload`
* **Body (JSON)**:
  ```json
  {
    "fileName": "assignment.pdf",
    "fileType": "application/pdf",
    "fileSize": 1024000,
    "folder": "submissions"
  }
  ```
* **Note**: Capturing `fileKey` from this response is required for the actual upload and subsequent linking.

### 6.2 Upload Binary File
* **Method**: `PUT`
* **Endpoint**: `{{baseUrl}}/storage/upload/{{fileKey}}`
* **Headers**: `Content-Type: application/pdf`
* **Body (Binary)**: Select a PDF file from your computer.

### 6.3 Download Protected Material
* **Method**: `GET`
* **Endpoint**: `{{baseUrl}}/storage/download/{{materialId}}`

---

## 💳 7. M-Pesa Payments (`/payments`)

### 7.1 Trigger STK Push (Student Only)
* **Method**: `POST`
* **Endpoint**: `{{baseUrl}}/payments/stk-push`
* **Body (JSON)**:
  ```json
  {
    "courseId": "{{courseId}}",
    "phoneNumber": "254712345678"
  }
  ```

### 7.2 Safaricom Webhook Callback (Simulated)
* **Method**: `POST`
* **Endpoint**: `{{baseUrl}}/payments/mpesa-callback?token=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`
* **Body (JSON)**: *(Use the standard Daraja API STK Push Callback payload)*

---

## 🛡️ 8. Admin Controls (`/admin`)

### 8.1 List Users
* **Method**: `GET`
* **Endpoint**: `{{baseUrl}}/admin/users`

### 8.2 Suspend User
* **Method**: `POST`
* **Endpoint**: `{{baseUrl}}/admin/users/{{userId}}/suspend`
* **Body (JSON)**:
  ```json
  {
    "isSuspended": true
  }
  ```

### 8.3 Verify Tutor
* **Method**: `POST`
* **Endpoint**: `{{baseUrl}}/tutors/{{profileId}}/verify`
* **Body (JSON)**:
  ```json
  {
    "isVerified": true
  }
  ```

---

## 📊 9. Analytics (`/analytics`)

### 9.1 Admin Analytics
* **Method**: `GET`
* **Endpoint**: `{{baseUrl}}/analytics/admin`

### 9.2 Tutor Analytics
* **Method**: `GET`
* **Endpoint**: `{{baseUrl}}/analytics/tutor`
