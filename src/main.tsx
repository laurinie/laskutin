import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Elementtiä #root ei löytynyt');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
