// src/router/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/authContext'

export default function ProtectedRoute({ children }) {
  const { loading, user } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  return children ?? <Outlet />
}