import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import HowItWorks from './pages/HowItWorks'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Encounter from './pages/Encounter'
import History from './pages/History'
import Patients from './pages/Patients'
import UsageDashboard from './pages/UsageDashboard'

function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })

  const handleAuth = (u) => setUser(u)

  const handleLogout = () => setUser(null)

  const showNavbar = Boolean(user)

  return (
    <BrowserRouter>
      {showNavbar && <Navbar user={user} onLogout={handleLogout} />}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Auth mode="login" onAuth={handleAuth} />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Auth mode="register" onAuth={handleAuth} />} />
        <Route path="/dashboard" element={<ProtectedRoute user={user}><Dashboard user={user} /></ProtectedRoute>} />
        <Route path="/encounter/:id" element={<ProtectedRoute user={user}><Encounter /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute user={user}><History /></ProtectedRoute>} />
        <Route path="/patients" element={<ProtectedRoute user={user}><Patients /></ProtectedRoute>} />
        <Route path="/usage" element={<ProtectedRoute user={user}><UsageDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
