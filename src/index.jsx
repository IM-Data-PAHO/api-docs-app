import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './App.css';

const container =
	document.getElementById('dhis2-app-root') ||
	document.getElementById('root') ||
	document.getElementById('app');

if (!container) {
	throw new Error('No se encontro un contenedor de montaje para la app.');
}

const root = createRoot(container);
root.render(<App />);
