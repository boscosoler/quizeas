import React from 'react';
import ReactDOM from 'react-dom/client';
import { AdminApp } from './pages/admin/AdminApp';
import { ParticipantApp } from './pages/participant/ParticipantApp';
import './index.css';

/**
 * Minimal top-level routing: "/admin" renders the admin tree, anything else
 * renders the participant flow. No router lib — the app only has two
 * top-level targets, and switching between them is a full reload.
 */
function isAdminPath(): boolean {
  const p = window.location.pathname.replace(/\/+$/, '');
  return p === '/admin' || p.startsWith('/admin/');
}

const Root = isAdminPath() ? AdminApp : ParticipantApp;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
