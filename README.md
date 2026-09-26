# 🎓 Exam Portal - Full Stack MERN Application

A high-performance online examination architecture designed for seamless proctoring, automated evaluation, real-time candidate analytics, and role-based access control (Student, Teacher, Admin). Built with **React 18, Vite, Tailwind CSS, Node.js, Express, and MongoDB Mongoose**.

---

## 📁 Directory Structure

```text
online-examination-portal/
├── client/                     # Frontend Application (React + Vite + Tailwind CSS)
│   ├── public/
│   ├── src/
│   │   ├── components/        # UI Components (Navbar, Footer, Modals, Cards)
│   │   ├── context/           # React Context (AuthContext)
│   │   ├── hooks/             # Custom Hooks (useHealthCheck, etc.)
│   │   ├── pages/             # Pages (Home, AdminDashboard, TeacherDashboard, StudentDashboard, TakeExam)
│   │   ├── utils/             # Helpers & API utilities (api.js)
│   │   ├── App.jsx            # Main App Router & Layout
│   │   └── main.jsx           # Entry Point
│   ├── .env.example           # Client environment template
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                     # Backend REST API Server (Node.js + Express + MongoDB)
│   ├── src/
│   │   ├── config/            # DB setup & Mongoose connection (db.js)
│   │   ├── controllers/       # Route Controllers (auth, admin, exam, question, attempt, course)
│   │   ├── middleware/        # Auth (JWT), Admin check, Error Handling
│   │   ├── models/            # Mongoose Schemas (User, Course, Exam, Question, Attempt)
│   │   ├── routes/            # Express API Routes
│   │   └── services/          # Services (emailService, pdfParserService, reminderScheduler)
│   ├── .env.example           # Backend environment template
│   ├── server.js              # Express Application Entry Point
│   └── package.json
│
├── .gitignore
├── README.md                   # Documentation
└── package.json                # Root package for running client & server concurrently
```

---

## 🚀 Quick Start Guide (Local Development)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **yarn**
- **MongoDB**: Local instance (`mongodb://localhost:27017/exam-portal`) or a free MongoDB Atlas cloud cluster

### 2. Installation
Install all dependencies for root, client, and server with one command:

```bash
npm run install-all
```

Or manually install:
```bash
# Root dependencies
npm install

# Server dependencies
cd server && npm install

# Client dependencies
cd ../client && npm install
```

---

### 3. Local Environment Setup

#### Backend Setup (`/server`)
Create `server/.env` based on `server/.env.example`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/exam-portal
JWT_SECRET=your_super_secret_jwt_key_2026
JWT_EXPIRE=30d
CLIENT_URL=http://localhost:5173
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
ANTHROPIC_API_KEY=sk-ant-api03-xxx (optional)
```

#### Frontend Setup (`/client`)
Create `client/.env.local` based on `client/.env.example`:
```env
VITE_API_URL=http://localhost:5000
```

---

### 4. Running Locally

Start both client and server concurrently:
```bash
npm run dev
```
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API Server**: [http://localhost:5000](http://localhost:5000)

---

## 🌐 API Endpoint Reference

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Health status, uptime, DB state, system info | Public |
| `POST` | `/api/auth/register` | User registration (Student / Teacher) | Public |
| `POST` | `/api/auth/login` | User login & JWT issuance | Public |
| `GET` | `/api/auth/me` | Current authenticated user profile | Private |
| `GET` | `/api/admin/overview` | Platform-wide analytics overview | Admin Only |
| `GET` | `/api/admin/users` | List, search, filter, block, or delete users | Admin Only |
| `GET` | `/api/exams` | Fetch active/available exams | Private |
| `POST` | `/api/exams` | Create a new exam | Teacher/Admin |
| `POST` | `/api/attempts/start/:examId` | Initialize exam attempt & proctoring session | Student |
| `POST` | `/api/attempts/:id/submit` | Finalize & auto-grade exam submission | Student |

---

## 🎨 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, React Router DOM v6, Recharts, Framer Motion
- **Backend**: Node.js, Express.js, MongoDB Atlas, Mongoose ODM, JWT, Nodemailer, PDFKit, Helmet, CORS, Morgan

---

## 🌐 Production Deployment Guide

### 1. Database Setup: MongoDB Atlas
1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free shared M0 cluster.
3. Under **Database Access**, create a user with read/write access.
4. Under **Network Access**, add IP `0.0.0.0/0` (allows incoming connections from Render).
5. Copy your connection string:
   `mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/exam_portal?retryWrites=true&w=majority`

---

### 2. Backend Deployment: Render
1. Push your code to GitHub.
2. Sign in to [Render](https://render.com/) and click **New +** -> **Web Service**.
3. Connect your repository.
4. Configure settings:
   - **Name**: `exam-portal-api`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Add Environment Variables under **Environment**:
   | Key | Value / Note |
   | :--- | :--- |
   | `PORT` | `5000` (or leave empty, Render assigns automatically) |
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | Your MongoDB Atlas connection string |
   | `JWT_SECRET` | A secure random 32+ character string |
   | `JWT_EXPIRE` | `30d` |
   | `CLIENT_URL` | Your Vercel frontend URL, e.g. `https://exam-portal.vercel.app` |
   | `EMAIL_USER` | Your Gmail address (for OTP & exam reminders) |
   | `EMAIL_PASS` | Gmail App Password |
   | `ANTHROPIC_API_KEY` | Optional: Anthropic API key for AI document parsing |
6. Deploy the service and note your deployed URL (e.g., `https://exam-portal-api.onrender.com`).

---

### 3. Frontend Deployment: Vercel
1. Sign in to [Vercel](https://vercel.com/) and click **Add New** -> **Project**.
2. Select your GitHub repository.
3. Set **Framework Preset** to `Vite`.
4. Set **Root Directory** to `client`.
5. Add Environment Variable:
   - `VITE_API_URL`: `https://exam-portal-api.onrender.com` (Your Render Backend URL)
6. Click **Deploy**. Vercel will build and distribute your frontend globally!
