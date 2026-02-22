// src/router/ProtectedUserRoute.jsx
import { Navigate, Outlet, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/authContext'

export default function ProtectedUserRoute({ children }) {
  const { loading, user } = useAuth()
  const [searchParams] = useSearchParams()
  const userIdFromQuery = searchParams.get('user_id')
  
  // Mostrar loading mientras se autentica
  if (loading) return null
  
  // Redirigir al login si no hay usuario autenticado
  if (!user) return <Navigate to="/" replace />
  
  // Verificar que el user_id en la query corresponde al usuario autenticado
  if (!userIdFromQuery || userIdFromQuery !== user.id) {
    console.warn(`Intento de acceso no autorizado: Usuario ${user.id} intentó acceder con user_id=${userIdFromQuery}`)
    swal("Acceso no autorizado", "No tienes permiso para acceder a esta página.", "error");
    return <Navigate to="/" replace />
  }
  
  return children ?? <Outlet />
}