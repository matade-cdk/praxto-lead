import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AdminApp from './admin/AdminApp.jsx';
import './firebase.js';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {window.location.pathname.startsWith('/admin') ? <AdminApp /> : <App />}
  </StrictMode>
);
