import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import './App.css'
import { AppBar, Toolbar, Typography, Button, Box, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import UserMenu from './components/UserMenu';
import NotificationBell from './components/NotificationBell';
import { useEffect, useState } from 'react';
import { getToken, getRole, type Role } from './services/auth';
import { LoginScreen } from './pages/LoginScreen';

import ReportForm from './Map/MapComponents/ReportForm';
import MapPage from './pages/MapPage';
import OfficerPage from './pages/OfficerPage';
import OfficerMessagesPage from './pages/OfficerMessagesPage';
import MessagesPage from './pages/MessagesPage';
import { RequireAdmin, RequireLogin, RequireCitizen, RequireTechnical, RequirePublicRelations, RequireMaintainer } from './components/RequireAuth';
import { AdminScreen } from './pages/AdminPage';
import { NotificationProvider } from './contexts/NotificationContext';
import TechnicalOfficerPage from './pages/TechnicalOfficerPage';
import { UserPage } from './pages/UserPage';

import { ReportDetailsPage } from './pages/ReportDetailsPage';
import MaintainerDashboardPage from './pages/MaintainerDashboardPage';
import StatisticsPage from './pages/StatisticsPage';
import MyCitizenReportsPage from './pages/MyCitizenReportsPage';
import { FaqManagementPage } from './pages/FaqManagementPage';


type OfficerProps = {
  readonly technical: boolean;
};

function OfficerButton({ technical }: OfficerProps) {
  return <Button
    component={Link}
    to={technical ? "/technical" : "/officer"}
    variant="contained"
    color="primary"
    sx={{
      px: 2.2,
      py: 0.7,
      borderRadius: 2,
      textTransform: 'none',
      fontWeight: 700,
      boxShadow: '0 6px 18px rgba(25,118,210,0.18)'
    }}
  >
    {technical ? "Technical Workspace" : "Review Reports"}
  </Button>
}

function PublicRelationsButton() {
  return <Button
    component={Link}
    to="/officer"
    variant="contained"
    color="secondary"
    sx={{
      px: 2.2,
      py: 0.7,
      borderRadius: 2,
      textTransform: 'none',
      fontWeight: 700,
      boxShadow: '0 6px 18px rgba(25,118,210,0.18)'
    }}
  >
    Review Reports
  </Button>
}

type ButtonProps = {
  readonly isLoggedIn: boolean;
  readonly setShowLoginDialog: React.Dispatch<React.SetStateAction<boolean>>;
};

export function AdminButton({ isLoggedIn, setShowLoginDialog }: ButtonProps) {
  return (
    <Button
      {...(isLoggedIn
        ? { component: Link, to: "/admin" }
        : { onClick: () => setShowLoginDialog(true) }
      )}
      variant="contained"
      color="secondary"
      sx={{
        px: 2.2,
        py: 0.7,
        borderRadius: 2,
        textTransform: "none",
        fontWeight: 700,
        boxShadow: "0 6px 18px rgba(25,118,210,0.18)",
        background: "linear-gradient(90deg, #00c20a, #008f15)"
      }}
    >
      Admin Dashboard
    </Button>
  );
}

function UserButton({ isLoggedIn, setShowLoginDialog }: ButtonProps) {
  return <Button id="report-button"
    {...(isLoggedIn
      ? { component: Link, to: "/submitReport" }
      : { onClick: () => setShowLoginDialog(true) }
    )}
    variant="contained"
    color="secondary"
    sx={{
      px: 2.2,
      py: 0.7,
      borderRadius: 2,
      textTransform: 'none',
      fontWeight: 700,
      boxShadow: '0 6px 18px rgba(25,118,210,0.18)',
      background: 'linear-gradient(90deg,#ff6b35,#ff3d00)'
    }}
  >
    Write a report
  </Button>
}

function App() {
  const [auth, setAuth] = useState<{ token: string | null; role: Role[] | null }>({ token: getToken(), role: getRole() });
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  useEffect(() => {
    const onAuth = () => setAuth({ token: getToken(), role: getRole() });
    globalThis.addEventListener('authChange', onAuth);
    return () => globalThis.removeEventListener('authChange', onAuth);
  }, []);

  const isLoggedIn = Boolean(auth.token);
  const isAdmin = auth.role?.includes('municipal_administrator') ?? false;
  const isPROfficer = auth.role?.includes('municipal_public_relations_officer') ?? false;
  const isTechnicalOfficer = auth.role?.includes('technical_office_staff') ?? false;
  const isMaintainer = auth.role?.includes('external_maintainer') ?? false;
  const isOfficer = isPROfficer || isTechnicalOfficer;
  const isCitizen = isLoggedIn && !isAdmin && !isPROfficer && !isTechnicalOfficer && !isMaintainer;

  return (
    <NotificationProvider>
      <Router>
        <AppBar position="fixed" color="default" elevation={1} className="app-bar">
          <Toolbar sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* small inline logo */}
              <Box className="app-logo" component={Link} to="/map" sx={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                <img src="/assets/ParticipiumLogoNoText.png" width="39" height="39" alt="Participium logo" />
              </Box>


              <Box id="app-title" component={Link} to="/map" sx={{ textDecoration: 'none' }}>
                <Typography variant="h6" component="div" sx={{ color: '#222', fontWeight: 700 }}>
                  Participium
                </Typography>
                <Typography variant="caption" component="div" sx={{ color: '#666', mt: '-4px' }}>
                  Turin civic reports
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button className="flex-mobile" id="map-button" component={Link} to="/map" color="inherit">Map</Button>
              <Button className="flex-mobile" component={Link} to="/statistics" color="inherit">Statistics</Button>

              {/* Show different button based on user role */}
              {isPROfficer && (
                <PublicRelationsButton />
              )
              }
              {isTechnicalOfficer && (
                <OfficerButton technical={isTechnicalOfficer} />
              )
              }
              {isMaintainer && (
                <Button
                  component={Link}
                  to="/maintainer"
                  variant="contained"
                  color="primary"
                  sx={{
                    px: 2.2,
                    py: 0.7,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    boxShadow: '0 6px 18px rgba(25,118,210,0.18)'
                  }}
                >
                  Maintainer Dashboard
                </Button>
              )}

              {isCitizen && isLoggedIn && (
                <>
                  <Button
                    className="flex-mobile"
                    component={Link}
                    to="/my-reports"
                    variant="contained"
                    color="primary"
                    sx={{
                      px: 2.2,
                      py: 0.7,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 700,
                      boxShadow: '0 6px 18px rgba(25,118,210,0.18)'
                    }}
                  >
                    My Reports
                  </Button>
                  <UserButton isLoggedIn={isLoggedIn} setShowLoginDialog={setShowLoginDialog} />
                </>
              )}

              {isAdmin && (
                <AdminButton isLoggedIn={isLoggedIn} setShowLoginDialog={setShowLoginDialog} />
              )}

              {/* show login button when not authenticated; transform into UserMenu (avatar) after login */}
              {isLoggedIn ? (
                <>
                  {!isOfficer && !isAdmin && <NotificationBell />}
                  <UserMenu />
                </>
              ) : (
                <Button variant="contained" color="primary" component={Link} to="/login">Login / Register</Button>
              )}
            </Box>
          </Toolbar>
        </AppBar>

        <Box sx={{ pt: '64px', width: '100%', minHeight: 'calc(100vh - 64px)' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/map" replace />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/submitReport" element={<RequireCitizen><ReportForm /></RequireCitizen>} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/messages" element={<RequireLogin><MessagesPage /></RequireLogin>} />
            <Route path="/admin" element={<RequireAdmin><AdminScreen /></RequireAdmin>} />
            <Route path="/officer" element={<RequirePublicRelations><OfficerPage /></RequirePublicRelations>} />
            <Route path="/officer/messages" element={<RequireTechnical><OfficerMessagesPage /></RequireTechnical>} />
            <Route path="/user" element={<RequireCitizen><UserPage /></RequireCitizen>} />
            <Route path="/my-reports" element={<RequireCitizen><MyCitizenReportsPage /></RequireCitizen>} />
            <Route path="/technical" element={<RequireTechnical><TechnicalOfficerPage /></RequireTechnical>} />
            <Route path="/maintainer" element={<RequireMaintainer><MaintainerDashboardPage /></RequireMaintainer>} />
            <Route path="/faq-management" element={<RequireAdmin><FaqManagementPage /></RequireAdmin>} />
            <Route path="/reports/:reportId/details" element={<RequireLogin><ReportDetailsPage /></RequireLogin>} />
          </Routes>
        </Box>

        {/* Login Dialog */}
        <Dialog open={showLoginDialog} onClose={() => setShowLoginDialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Login Required</DialogTitle>
          <DialogContent>
            <DialogContentText>
              You need to be logged in to submit a report. Please login or register to continue.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowLoginDialog(false)} color="inherit">
              Cancel
            </Button>
            <Button
              component={Link}
              to="/login"
              variant="contained"
              color="primary"
              onClick={() => setShowLoginDialog(false)}
            >
              Login / Register
            </Button>
          </DialogActions>
        </Dialog>
      </Router>
    </NotificationProvider>
  );
}


export default App
