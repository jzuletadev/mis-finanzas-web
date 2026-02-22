import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/authContext'
import ProtectedRoute from './router/protectedRoute'
import ProtectedUserRoute from './router/protectedUserRoute'

import Dashboard from './views/dashboard';
import UserLogin from './views/userLogin';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>

          <Route path="/" element={<UserLogin />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<ProtectedUserRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
          </Route>
          
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App
