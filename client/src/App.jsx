import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Public Pages
import Home from './pages/Home';
import ExamList from './pages/ExamList';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';
import NotFound from './pages/NotFound';

// Protected Role Dashboards & Modules
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import QuestionBank from './pages/QuestionBank';
import ExamBuilder from './pages/ExamBuilder';
import TakeExam from './pages/TakeExam';
import ExamResult from './pages/ExamResult';
import ManualGrading from './pages/ManualGrading';
import ExamAnalytics from './pages/ExamAnalytics';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen bg-[#fafafa] text-gray-900 font-['Inter',sans-serif]">
          <Navbar />
          <main className="flex-grow">
            <ErrorBoundary>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/exams" element={<ExamList />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-otp" element={<VerifyOTP />} />

                {/* Protected Role-Based Routes */}
                <Route
                  path="/student"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/teacher"
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <TeacherDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Per-Exam Analytics Studio (Admins & Teachers) */}
                <Route
                  path="/admin/analytics/:examId"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                      <ExamAnalytics />
                    </ProtectedRoute>
                  }
                />

                {/* Interactive Exam Engine Workspace */}
                <Route
                  path="/take-exam/:examId"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
                      <TakeExam />
                    </ProtectedRoute>
                  }
                />

                {/* Student Results & Answer Comparison Review */}
                <Route
                  path="/results/:attemptId"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
                      <ExamResult />
                    </ProtectedRoute>
                  }
                />

                {/* Teacher Manual Essay Grading Studio */}
                <Route
                  path="/grading"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                      <ManualGrading />
                    </ProtectedRoute>
                  }
                />

                {/* Question Bank (Teachers & Admins) */}
                <Route
                  path="/question-bank"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                      <QuestionBank />
                    </ProtectedRoute>
                  }
                />

                {/* Exam Builder Studio (Teachers & Admins) */}
                <Route
                  path="/exam-builder"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                      <ExamBuilder />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/exam-builder/:id"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                      <ExamBuilder />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}
