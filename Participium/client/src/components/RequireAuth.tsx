import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getRole, getToken } from '../services/auth';

interface RequireAuthProps {
  children: React.ReactElement;
}

const RequireLogin: React.FC<RequireAuthProps> = ({ children }) => {
  const token = getToken();
  const location = useLocation();

  // require that a token exists
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};



const RequireCitizen: React.FC<RequireAuthProps> = ({ children }) => {
  const token = getToken();
  const location = useLocation();
  const role = getRole();

  // require that a token exists and role is 'citizen'
  if (!token || !role?.includes('citizen')) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};


const RequirePublicRelations: React.FC<RequireAuthProps> = ({ children }) => {
  const role = getRole();
  const token = getToken();
  const location = useLocation();
  // require that a token exists and role represents some kind of officer or admin
  // Accept either the legacy 'officer' value, 'municipal_administrator',
  // or specific officer roles returned by the token (they usually contain 'officer').
  const isOfficerLike = !!role && (role.includes('municipal_public_relations_officer'));
  if (!token || !isOfficerLike) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const RequireTechnical: React.FC<RequireAuthProps> = ({ children }) => {
  const role = getRole();
  const token = getToken();
  const location = useLocation();
  // require that a token exists and role represents some kind of officer or admin
  // Accept either the legacy 'officer' value, 'municipal_administrator',
  // or specific officer roles returned by the token (they usually contain 'officer').
  const isOfficerLike = !!role && (role.includes('technical_office_staff'));
  if (!token || !isOfficerLike) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};


const RequireAdmin: React.FC<RequireAuthProps> = ({ children }) => {
  const role = getRole();
  const token = getToken();
  const location = useLocation();

  // require that a token exists and role is 'employee'
  if (!token || !role?.includes('municipal_administrator')) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const RequireMaintainer: React.FC<RequireAuthProps> = ({ children }) => {
  const role = getRole();
  const token = getToken();
  const location = useLocation();

  // require that a token exists and role is 'maintainer'
  if (!token || !role?.includes('external_maintainer')) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export { RequireCitizen, RequireLogin, RequireTechnical, RequirePublicRelations, RequireAdmin, RequireMaintainer };