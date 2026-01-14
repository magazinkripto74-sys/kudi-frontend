// src/config/features.js
// Feature flags are controlled via Vercel environment variables.
// Default is OFF for production safety.
export const UI_V1_ENABLED =
  String(import.meta.env.VITE_UI_V1_ENABLED || '').toLowerCase() === 'true'
