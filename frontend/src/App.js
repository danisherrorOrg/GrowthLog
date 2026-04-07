import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';
import './styles/markdown.css';

import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DailyLog from './pages/DailyLog';
import AllLogs from './pages/AllLogs';
import Categories from './pages/Categories';
import Goals from './pages/Goals';
import GoalDetail from './pages/GoalDetail';
import CategoryDetail from './pages/CategoryDetail';
import Manifestations from './pages/Manifestations';
import ManifestationDetail from './pages/ManifestationDetail';
import Snapshots from './pages/Snapshots';
import SnapshotDetail from './pages/SnapshotDetail';
import Growth from './pages/Growth';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import VerifyEmail from './pages/VerifyEmail';
import CalendarTimeline from './pages/CalendarTimeline';
import Todos from './pages/Todos';
import Quotes from './pages/Quotes';
import Books from './pages/Books';
import BookDetail from './pages/BookDetail';
import Reframes from './pages/Reframes';
import ActivityLog from './pages/ActivityLog';
import Thoughts from './pages/Thoughts';


function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🌱</div>
        <p style={{ color: 'rgba(13,13,13,0.4)', fontSize: 14 }}>Loading GrowthLog...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'DM Sans, sans-serif', fontSize: 14 } }} />
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/u/:userId" element={<PublicProfile />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="log" element={<DailyLog />} />
            <Route path="history" element={<AllLogs />} />
            <Route path="categories" element={<Categories />} />
            <Route path="categories/:categoryId" element={<CategoryDetail />} />
            <Route path="goals" element={<Goals />} />
            <Route path="goals/:goalId" element={<GoalDetail />} />
            <Route path="manifestations" element={<Manifestations />} />
            <Route path="manifestations/:manifestationId" element={<ManifestationDetail />} />
            <Route path="snapshots" element={<Snapshots />} />
            <Route path="snapshots/:snapshotId" element={<SnapshotDetail />} />
            <Route path="timeline" element={<CalendarTimeline />} />
            <Route path="todos" element={<Todos />} />
            <Route path="quotes" element={<Quotes />} />
            <Route path="books" element={<Books />} />
            <Route path="books/:bookId" element={<BookDetail />} />
            <Route path="reframes" element={<Reframes />} />
            <Route path="activity" element={<ActivityLog />} />
            <Route path="thoughts" element={<Thoughts />} />
            <Route path="growth" element={<Growth />} />
            <Route path="profile" element={<Profile />} />
            <Route path="verify/:token" element={<VerifyEmail />} />

          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
