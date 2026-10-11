InterviewAI - Settings Page Patch

This patch adds:
- Authenticated profile fetch/update (name + email) using the existing JWT.
- Secure password change with current-password verification and bcrypt hashing.
- A more useful Settings page while preserving logout.
- Navbar greeting refresh after the account name is changed.

Apply by extracting this ZIP into the root folder:
C:\Users\dudhe\interview-ai-platform

Replace the existing files when prompted. Do not overwrite server/.env and do not share your API keys.

After extraction:
1. Restart the backend terminal (Ctrl+C, then npm run dev from server).
2. Refresh the browser at http://localhost:5173/settings.
3. Test profile update with your own account; use a unique email address you own.
4. Test password change only if you know the current password. The new password must be at least 8 characters.

API routes added:
PATCH /api/auth/profile
POST  /api/auth/change-password
Both require Authorization: Bearer <token>.
