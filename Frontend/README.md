# 🎓 EduConnect 

Frontend application for EduConnect, a tutoring platform connecting students with verified tutors. Built with modern web technologies for a responsive and interactive learning experience.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Backend Integration](#backend-integration)
- [Getting Started](#getting-started)
- [Development](#development)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [User Roles](#user-roles)

## 🎯 Overview

EduConnect  is a modern, responsive web application that enables:

- **Students** to discover and enroll in courses, access learning materials, submit assessments, and track their progress
- **Tutors** to create and manage courses, upload educational materials, grade submissions, and schedule tutoring sessions
- **Admins** to manage platform content, verify tutors, monitor analytics, and oversee system health

## ✨ Features

### Student Features
- 🔐 User registration and authentication
- 📚 Browse and filter courses by subject and tutor
- 💳 Secure payment via M-Pesa
- 📖 Access course materials and modules
- ✍️ Submit assignments and assessments
- 📊 Track learning progress and performance
- 🎥 Join tutoring sessions
- 📱 Responsive design for all devices

### Tutor Features
- 📋 Complete registration and verification process
- ✅ Upload qualifications and certifications
- 🧪 Take and pass competency tests
- 📝 Create and publish courses
- 📤 Upload learning materials (videos, documents, PDFs)
- ✏️ Grade student submissions
- 🗓️ Schedule and manage tutoring sessions
- 📈 View student progress and analytics

### Admin Features
- ✓ Verify tutor qualifications and competency
- 📊 Review competency test scores
- 🏷️ Manage course subjects and categories
- 💰 Monitor platform revenue and transactions
- 📉 View detailed analytics and reports
- 🛠️ Manage platform settings and configurations
- 👥 Manage user accounts and permissions

## 🛠️ Technology Stack

- **Frontend Framework**: [Your chosen framework - React/Vue/Angular]
- **Styling**: [CSS Framework - Tailwind/Bootstrap/Material UI]
- **HTTP Client**: Axios
- **State Management**: [Redux/Context API/Vuex]
- **Authentication**: JWT (Access & Refresh tokens)
- **Build Tool**: [Webpack/Vite]
- **Package Manager**: npm
- **Testing**: [Jest/Vitest]
- **Type Safety**: TypeScript (optional but recommended)

## 📁 Project Structure

```
Frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── common/      # Shared components (Header, Footer, Nav)
│   │   ├── auth/        # Authentication-related components
│   │   ├── student/     # Student-specific components
│   │   ├── tutor/       # Tutor-specific components
│   │   └── admin/       # Admin-specific components
│   ├── pages/           # Page components
│   │   ├── auth/        # Login, Register pages
│   │   ├── student/     # Student dashboard, courses, etc
│   │   ├── tutor/       # Tutor dashboard, course management
│   │   └── admin/       # Admin dashboard and management
│   ├── services/        # API service calls
│   │   ├── auth.js      # Authentication API calls
│   │   ├── courses.js   # Course API calls
│   │   ├── enrollments.js
│   │   ├── payments.js
│   │   └── admin.js
│   ├── hooks/           # Custom React hooks
│   ├── context/         # State management context
│   ├── styles/          # Global styles
│   ├── utils/           # Utility functions
│   │   ├── axios.js     # Axios instance with interceptors
│   │   ├── constants.js # API endpoints and constants
│   │   └── validators.js
│   ├── App.jsx          # Main app component
│   └── index.js         # Entry point
├── tests/               # Test files
├── .env.example         # Environment variables template
├── package.json
└── README.md
```

## 🔌 Backend Integration

This frontend connects to the EduConnect backend API running at `http://localhost:3000` (configurable).

### Key Backend Modules
- **Auth**: User registration, login, token refresh
- **Students**: Student profile and progress
- **Tutors**: Tutor profiles and qualifications
- **Courses**: Course listing, details, creation
- **Enrollments**: Student course enrollment
- **Payments**: M-Pesa payment processing
- **Assessments**: Assessment and submission management
- **Admin**: Platform administration and analytics

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mellog001/Website_Fr.git
   cd Website_Fr/Frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables**
   ```env
   REACT_APP_API_URL=http://localhost:3000/api/v1
   REACT_APP_MPESA_PUBLIC_KEY=your_mpesa_key
   REACT_APP_SESSION_TIMEOUT=3600
   ```

5. **Start the development server**
   ```bash
   npm start
   ```

The frontend will be available at `http://localhost:3000` (or as configured).

## 💻 Development

### Available Scripts

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm test:cov

# Lint code
npm run lint

# Format code
npm run format
```

## 🔗 API Endpoints

All API calls use base URL: `http://localhost:3000/api/v1`

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh-token` - Refresh access token
- `POST /auth/logout` - Logout user

### Students
- `GET /students/profile` - Get student profile
- `GET /students/courses` - Get enrolled courses
- `GET /students/progress` - Get learning progress
- `POST /students/profile` - Update student profile

### Courses
- `GET /courses` - List all courses
- `GET /courses/:id` - Get course details
- `GET /courses/:id/materials` - Get course materials
- `POST /courses` - Create course (Tutor only)

### Enrollments
- `POST /enrollments` - Enroll in course
- `GET /enrollments` - Get student enrollments
- `DELETE /enrollments/:id` - Unenroll from course

### Payments
- `POST /payments/initiate` - Initiate M-Pesa payment
- `GET /payments/:id` - Get payment status
- `POST /payments/confirm` - Confirm payment

### Assessments
- `GET /assessments` - Get assessments
- `POST /submissions` - Submit assessment
- `GET /submissions/:id` - Get submission details

### Admin
- `GET /admin/tutors/pending` - Get pending tutor verifications
- `POST /admin/tutors/:id/verify` - Verify tutor
- `GET /admin/analytics` - Get platform analytics

See [API Documentation](#) for complete endpoint specifications.

## 🔐 Authentication

The frontend uses JWT (JSON Web Tokens) for authentication:

### Token Management
- **Access Token**: Short-lived token (15 minutes) in memory or session storage
- **Refresh Token**: Long-lived token (7 days) in secure httpOnly cookie

### Implementation
```javascript
// Login stores tokens
// Axios interceptor automatically adds Access Token to requests
// If 401 error, automatically refreshes token
// Failed refresh redirects to login
```

### Protected Routes
- Student dashboard: requires student role
- Tutor dashboard: requires tutor role
- Admin panel: requires admin role

## 👥 User Roles

### Student
- Access: Browse courses, enroll, submit assessments
- Permissions: View own profile and progress

### Tutor
- Access: Create courses, upload materials, grade submissions
- Requirements: Verified qualification and passed competency test

### Admin
- Access: Full platform access
- Permissions: Manage users, verify tutors, view analytics

## 📝 Development Guidelines

### Component Structure
```javascript
// Functional components with hooks
// Props validation
// Proper error handling
// Loading states
// Accessibility considerations
```

### API Service Pattern
```javascript
// src/services/courses.js
export const courseService = {
  getAll: (page, filters) => api.get('/courses', { params: { page, ...filters } }),
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
};
```

### Error Handling
- User-friendly error messages
- Proper HTTP status code handling
- Network error recovery
- Form validation errors

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm test:watch

# Coverage report
npm test:cov
```

Test structure:
- Unit tests for utilities and services
- Component tests for UI components
- Integration tests for user flows

## 📦 Dependencies

Key dependencies:
- `axios` - HTTP client for API calls
- `react-router-dom` - Client-side routing
- `@reduxjs/toolkit` - State management
- `tailwindcss` - Utility-first CSS
- `react-hook-form` - Form management
- `zod` - Schema validation


