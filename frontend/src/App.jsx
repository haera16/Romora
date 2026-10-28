import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import CreateProfile from './pages/CreateProfile'
import RequireAuth from './components/RequireAuth'
import Explore from './pages/Explore'
import ProfileGate from './components/ProfileGate'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signup" element={<Auth />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/create-profile"
          element={
            <RequireAuth>
              <ProfileGate mode="needs-no-profile">
                <CreateProfile />
              </ProfileGate>
            </RequireAuth>
          }
        />
        <Route
          path="/explore"
          element={
            <ProfileGate mode="needs-profile">
              <Explore />
            </ProfileGate>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App