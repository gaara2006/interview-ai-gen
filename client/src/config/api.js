// Set VITE_API_URL in the frontend host to the public backend origin,
// for example: https://your-api.onrender.com. Leave it unset for local dev.
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_URL = (configuredApiUrl || "http://localhost:5000").replace(/\/+$/, "");
