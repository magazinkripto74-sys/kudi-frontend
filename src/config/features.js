// src/config/features.js
export const UI_V1_ENABLED = String(import.meta.env.VITE_UI_V1_ENABLED || '').toLowerCase() === 'true'
