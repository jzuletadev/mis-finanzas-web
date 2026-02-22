// src/views/UserLogin.jsx – autenticación contra la base de datos
import React, { useState } from 'react'
import styled from 'styled-components'
import swal from 'sweetalert'
import { useNavigate } from 'react-router-dom'

import Button from '../components/button'

import { apiPost } from '../utils/api'
import { useAuth } from '../context/authContext'

const UserLogin = () => {
    const navigate = useNavigate()

    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)


    const { refreshUserData } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        if (!username || !password) {
            setLoading(false)
            return swal('Error', 'Ingresa nombre de usuario y contraseña', 'error')
        }

        try {

            const { ok, data } = await apiPost('/auth/login', {
                username: username, password: password
            });

            if (!ok || !data || data.ok !== true) {
                const msg = (data && (data.error || data.message)) || 'Credenciales inválidas'
                swal('Error', msg, 'error')
                setLoading(false)
                return
            }

            // Éxito: los JWT ya están en cookies HttpOnly por Set-Cookie.
            // También guardamos tokens en localStorage para compatibilidad móvil
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
            }
            if (data.refresh_token) {
                localStorage.setItem('refresh_token', data.refresh_token);
            }

            const u = data.user || {}

            swal({
                title: `¡Bienvenido ${u.username ?? ''}!`,
                icon: 'success',
                button: 'Continuar'
            }).then(async () => {
                // Actualizar el estado del authContext antes de navegar
                const success = await refreshUserData()
                setLoading(false)

                if (success) {
                    navigate(`/dashboard?user_id=${u.id}`)
                } else {
                    swal('Error', 'Error al cargar datos del usuario. Intenta nuevamente.', 'error')
                }
            })
        } catch (err) {
            setLoading(false)
            swal('Error', err.message || 'Ocurrió un problema', 'error')
        }
    }

    return (
        <StyledWrapper>
            <div className="login-container">
                <div className="login-card">

                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Nombre de Usuario</label>
                            <div className="input-container">
                                <span className="input-icon"></span>
                                <input
                                    placeholder="Ingresa tu nombre de usuario"
                                    className="form-input"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    autoComplete="username"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Contraseña</label>
                            <div className="input-container">
                                <span className="input-icon"></span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="*********"
                                    className="form-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    disabled={loading}
                                />
                            </div>
                            <div className="checkbox-container">
                                <input
                                    type="checkbox"
                                    id="show-password"
                                    checked={showPassword}
                                    onChange={(e) => setShowPassword(e.target.checked)}
                                    disabled={loading}
                                    className="password-checkbox"
                                />
                                <label htmlFor="show-password" className="checkbox-label">
                                    Mostrar contraseña
                                </label>
                            </div>
                        </div>

                        <div className="login-footer">

                            <Button
                                type="submit"
                                label={loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                                color="#4CAF50"
                                className="login-button"
                                disabled={loading}
                            />
                        </div>
                    </form>
                </div>
            </div>
        </StyledWrapper>
    )
}

const StyledWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif;
  position: relative;
  
  .login-container {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 420px;
  }

  .login-card {
    background: white;
    border-radius: 16px;
    padding: 30px 40px;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.08),
      0 8px 32px rgba(0, 0, 0, 0.04);
    border: 1px solid #e2e8f0;
    transition: all 0.3s ease;
  }

  .login-card:hover {
    box-shadow:
      0 25px 80px rgba(0, 0, 0, 0.12),
      0 12px 40px rgba(0, 0, 0, 0.06);
  }

  .logo-section {
    text-align: center;
    margin-bottom: 20px;
  }

  .login-image {
    width: 250px;
    height: 220px;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease;
  }

  .login-image:hover {
    transform: scale(1.02);
  }

  .company-name {
    margin: 0 0 8px 0;
    font-size: 3rem;
    font-weight: 800;
    color: #1e293b;
    letter-spacing: -0.8px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .company-subtitle {
    margin: 0;
    font-size: 0.95rem;
    color: #64748b;
    font-weight: 500;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }

  .form-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 6px;
  }

  .input-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-icon {
    position: absolute;
    left: 16px;
    z-index: 2;
    font-size: 1rem;
    color: #64748b;
    font-weight: 600;
  }

  .form-input {
    width: 100%;
    padding: 14px 16px 14px 44px;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.95rem;
    font-weight: 400;
    background: #fafbfc;
    transition: all 0.3s ease;
    font-family: inherit;
    color: #1e293b;
  }

  .form-input:focus {
    outline: none;
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-input:disabled {
    background: #f1f5f9;
    cursor: not-allowed;
    opacity: 0.7;
  }

  .form-input::placeholder {
    color: #94a3b8;
    font-weight: 400;
  }

  .checkbox-container {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    margin-bottom: 4px;
  }

  .password-checkbox {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #3b82f6;
  }

  .checkbox-label {
    font-size: 0.875rem;
    color: #64748b;
    cursor: pointer;
    user-select: none;
    font-weight: 500;
  }

  .checkbox-label:hover {
    color: #3b82f6;
  }

  .password-checkbox:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .password-checkbox:disabled + .checkbox-label {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .login-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    margin-top: 8px;
  }

  .attempts-warning {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    background: #fef3cd;
    border-radius: 10px;
    border: 1px solid #f59e0b;
    animation: fadeIn 0.3s ease-in-out;
  }

  .warning-icon {
    font-size: 0.9rem;
    color: #d97706;
  }

  .warning-text {
    font-size: 0.85rem;
    color: #d97706;
    font-weight: 600;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Responsive Design */
  @media (max-width: 1024px) and (min-width: 769px) {
    .login-container {
      margin-top: 8vh; /* Margen moderado para tablets grandes */
    }
  }

  @media (max-width: 768px) {
    min-height: 100vh;
    align-items: flex-start;
    padding: 20px 16px;
    
    .login-container {
      margin-top: 10vh; /* Posicionar formulario más arriba */
    }

    .login-card {
      padding: 36px 28px;
      border-radius: 14px;
    }

    .company-name {
      font-size: 2.5rem;
    }

    .company-subtitle {
      font-size: 0.9rem;
    }

    .login-image {
      width: 100px;
      height: 100px;
    }

    .form-input {
      padding: 12px 14px 12px 40px;
      font-size: 0.9rem;
    }

    .input-icon {
      left: 14px;
      font-size: 0.95rem;
    }

    .password-toggle {
      right: 14px;
      font-size: 0.75rem;
    }
  }

  @media (max-width: 480px) {
    padding: 16px 12px;
    
    .login-container {
      margin-top: 5vh; /* Menos margen en móviles pequeños */
    }

    .login-card {
      padding: 28px 24px;
    }

    .company-name {
      font-size: 2.2rem;
    }

    .login-image {
      width: 90px;
      height: 90px;
    }

    .login-form {
      gap: 20px;
    }

    .form-group {
      gap: 6px;
    }

  }
`

export default UserLogin