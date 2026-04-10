import React from 'react';
import ReactDOM from 'react-dom/client';
import { AdminApp } from './pages/admin/AdminApp';
import { ParticipantApp } from './pages/participant/ParticipantApp';
import './index.css';

/**
 * Minimal top-level routing: "/admin" renders the admin tree, anything else
 * renders the participant flow. No router lib — the app only has two
 * top-level targets, and switching between them is a full reload.
 *
 * We build with a configurable base path (see vite.config.ts), so on the
 * GitHub project-page deployment the URL is /quizeas/admin rather than
 * /admin. Strip the base before comparing.
 */
function isAdminPath(): boolean {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  let p = window.location.pathname.replace(/\/+$/, '');
  if (base && p.startsWith(base)) {
    p = p.slice(base.length) || '/';
  }
  return p === '/admin' || p.startsWith('/admin/');
}

const Root = isAdminPath() ? AdminApp : ParticipantApp;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
