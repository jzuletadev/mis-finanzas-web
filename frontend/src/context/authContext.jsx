// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../utils/api'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

const clearStoredTokens = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
}

export function AuthProvider({ children }) {
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState(null)

    // Función para limpiar completamente el estado de autenticación
    const clearAuthState = () => {
        setUser(null)
        setLoading(false)
        clearStoredTokens()
    }

    // Función para actualizar el estado después de un login exitoso
    const refreshUserData = async () => {
        try {
            setLoading(true)

            const { ok, data } = await apiGet('/auth/validate')

            if (!ok || !data?.ok) {
                clearAuthState()
                return false
            }

            // Obtener info extendida del usuario
            const me = await apiGet('/users/me');
            if (me.ok && me.data?.ok) {
                setUser(me.data);
                setLoading(false)
                return true
            } else {
                clearAuthState()
                return false
            }
        } catch (error) {
            console.error('Error refreshing user data:', error)
            clearAuthState()
            return false
        }
    }

    useEffect(() => {
        let isMounted = true; // Flag para evitar race conditions

        (async () => {
            try {
                setLoading(true)

                const { ok, data } = await apiGet('/auth/validate')

                if (!isMounted) return

                if (!ok || !data?.ok) {
                    clearAuthState()
                    setLoading(false)
                    return
                }

                const me = await apiGet('/users/me');

                if (!isMounted) return

                if (me.ok && me.data?.ok) {
                    setUser(me.data);
                } else {
                    clearAuthState()
                }
            } catch (error) {
                if (!isMounted) return
                console.error('Auth validation error:', error)
                clearAuthState()
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        })()

        // Cleanup function para prevenir race conditions
        return () => {
            isMounted = false
        }
    }, [])

    const logout = async () => {
        try {
            clearAuthState()
            await apiGet('/auth/logout')
            await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
            console.error('Error during logout:', error)
            clearAuthState()
        } finally {
            navigate('/', { replace: true })
        }
    }

    return (
        <AuthCtx.Provider
            value={{
                loading,
                user,
                setUser,
                logout,
                refreshUserData
            }}
        >
            {children}
        </AuthCtx.Provider>
    )
}