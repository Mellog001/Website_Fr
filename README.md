# 🎓 EduConnect

**EduConnect** is an online tutoring platform that connects students with tutors for interactive learning. Students can browse courses, enroll and pay via M-Pesa, and access course materials — while tutors can create courses, manage content, and track enrollments.

## ✨ Features

- **Authentication** — Secure signup/login with email verification and JWT-based sessions
- **Role-based access** — Separate experiences for Students, Tutors, and Admins
- **Course catalog** — Browse, search, and filter published courses by subject
- **Course management** — Tutors can create, edit, publish/unpublish courses and upload cover images
- **Course materials** — Modules and learning materials organized per course
- **M-Pesa integration** — Students enroll and pay via Safaricom's Daraja API (STK push)
- **Admin dashboard** — Platform oversight and tutor verification
- **Email notifications** — Verification emails and account notifications via SMTP

## 🛠️ Tech Stack

**Frontend**
- HTML5, CSS3, vanilla JavaScript
- No framework — lightweight, fast-loading portal pages

**Backend**
- Node.js + Express
- TypeScript
- MySQL (via `mysql2`)
- JWT authentication (`jsonwebtoken`, `bcryptjs`)
- `nodemailer` for transactional email
- `multer` for file uploads
- `winston` for logging
- `zod` for request validation

## 📁 Project Structure

```
Website_Fr/
├── Frontend/
│   └── Portal/          # HTML pages, CSS, and client-side JS
│       ├── CSS/
│       ├── js/
│       ├── index.html
│       ├── login.html
│       ├── signup.html
│       ├── dashboard.html
│       ├── courses.html
│       ├── tutor-courses.html
│       └── admin-dashboard.html
└── server/
    ├── src/
    │   ├── features/     # Auth, courses, tutors, payments, admin, etc.
    │   ├── config/       # Database, env, logger config
    │   ├── common/       # Middleware, error handling, shared services
    │   ├── db/           # Schema (init.sql) and seed scripts
    │   └── jobs/         # Background job processing
    ├── tests/
    └── package.json
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MySQL](https://dev.mysql.com/downloads/) (v8+)
- A code editor (e.g. [VS Code](https://code.visualstudio.com/))
- [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension (or any static file server) for the frontend

### 1. Clone the repository

```bash
git clone https://github.com/Mellog001/Website_Fr.git
cd Website_Fr
```

### 2. Set up the backend

```bash
cd server
npm install
```

Create a `.env` file in the `server` folder with the following variables:

```env
# Server
PORT=5000
NODE_ENV=development

# Database (MySQL)
DATABASE_URL="mysql://<user>:<password>@localhost:3306/educonnect"

# JWT Secrets
JWT_ACCESS_SECRET="your_access_secret"
JWT_REFRESH_SECRET="your_refresh_secret"

# M-Pesa Daraja (sandbox)
MPESA_CONSUMER_KEY="your_consumer_key"
MPESA_CONSUMER_SECRET="your_consumer_secret"
MPESA_SHORTCODE="174379"
MPESA_PASSKEY="your_passkey"
MPESA_CALLBACK_URL="https://your-callback-url/api/v1/payments/mpesa-callback"
MPESA_ENVIRONMENT="sandbox"

# SMTP (email)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"
EMAIL_FROM="your_email@gmail.com"
```

> ⚠️ Never commit your real `.env` file. It's already excluded via `.gitignore`.

### 3. Set up the database

Create the database and load the schema:

```bash
mysql -u root -p -e "CREATE DATABASE educonnect;"
mysql -u root -p educonnect < src/db/init.sql
```

### 4. Run the backend

```bash
npm run dev
```

The API will be running at `http://localhost:5000`.

### 5. Run the frontend

Open `Frontend/Portal/index.html` with Live Server (or any static server) — it will typically run at `http://127.0.0.1:5500`.

## 📜 Available Scripts (backend)

| Command | Description |
|---|---|
| `npm run dev` | Start the backend in development mode with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run the compiled production build |
| `npm test` | Run the test suite |
| `npm run test:cov` | Run tests with coverage report |

## 🗺️ Roadmap

- [ ] Tutor course material upload page (`course-details.html`)
- [ ] Student progress tracking
- [ ] Assessment and submission workflow
- [ ] Production deployment and custom domain


## 📄 License

This project is currently unlicensed. All rights reserved by the author.
