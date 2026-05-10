import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';
import './styles/markdown.css';

import Login from './pages/Login';
import Register from './pages/Register';
import HistoryHub from './pages/HistoryHub';
import TemporalHub from './pages/TemporalHub';
import KnowledgeVault from './pages/KnowledgeVault';
import HealthHub from './pages/HealthHub';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DailyLog from './pages/DailyLog';
import Categories from './pages/Categories';
import Goals from './pages/Goals';
import GoalDetail from './pages/GoalDetail';
import CategoryDetail from './pages/CategoryDetail';
import Manifestations from './pages/Manifestations';
import ManifestationDetail from './pages/ManifestationDetail';
import SnapshotDetail from './pages/SnapshotDetail';
import Growth from './pages/Growth';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import VerifyEmail from './pages/VerifyEmail';
import Todos from './pages/Todos';
import BookDetail from './pages/BookDetail';
import Reframes from './pages/Reframes';
import Thoughts from './pages/Thoughts';
import Insights from './pages/Insights';
import GrowthHub from './pages/GrowthHub';
import LifeCanvas from './pages/LifeCanvas';
import LotusBlossom from './pages/LotusBlossom';
import LotusList from './pages/LotusList';
import Reviews from './pages/Reviews';
import TaskCheckins from './pages/TaskCheckins';
import TaskCheckinDetail from './pages/TaskCheckinDetail';


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
            <Route path="history" element={<HistoryHub />} />
            <Route path="categories" element={<Categories />} />
            <Route path="categories/:categoryId" element={<CategoryDetail />} />
            <Route path="goals" element={<Goals />} />
            <Route path="goals/:goalId" element={<GoalDetail />} />
            <Route path="manifestations" element={<Manifestations />} />
            <Route path="manifestations/:manifestationId" element={<ManifestationDetail />} />
            <Route path="temporal" element={<TemporalHub />} />
            <Route path="snapshots" element={<Navigate to="/temporal?tab=snapshots" />} />
            <Route path="time-capsule" element={<Navigate to="/temporal?tab=timecapsule" />} />
            <Route path="snapshots/:snapshotId" element={<SnapshotDetail />} />
            <Route path="todos" element={<Todos />} />
            <Route path="knowledge" element={<KnowledgeVault />} />
            <Route path="health" element={<HealthHub />} />
            <Route path="books/:bookId" element={<BookDetail />} />
            <Route path="reframes" element={<Reframes />} />
            <Route path="thoughts" element={<Thoughts />} />
            <Route path="insights" element={<Insights />} />
            <Route path="growth-hub" element={<GrowthHub />} />
            <Route path="life-canvas" element={<LifeCanvas />} />
            <Route path="lotus" element={<LotusList />} />
            <Route path="lotus/:id" element={<LotusBlossom />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="checkins" element={<TaskCheckins />} />
            <Route path="checkins/:checkinId" element={<TaskCheckinDetail />} />
            <Route path="growth" element={<Growth />} />

            <Route path="profile" element={<Profile />} />
            <Route path="verify/:token" element={<VerifyEmail />} />

          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
