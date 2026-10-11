# InterviewAI — Gemini free-tier answer feedback update

This patch switches the AI evaluation provider from OpenAI to Google's Gemini API. It is intended to be extracted into the existing `interview-ai-platform` project after the previous AI-evaluation patch has been applied.

## What changes

- Uses Gemini API from the Express backend; the key is never sent to the browser.
- Defaults to `gemini-2.5-flash-lite`, which currently lists free-tier text input/output on Google's pricing page. Actual availability and rate limits depend on the project/account.
- Keeps the same stored evaluation fields: overall score, per-answer score, strengths, improvements, and improved sample answer.
- Saves the practice session before trying AI evaluation so a failed AI request does not lose the user's answers.

## Setup

1. Create a Gemini API key in Google AI Studio: https://aistudio.google.com/apikey
2. In `server/.env`, keep your existing `PORT`, `MONGO_URI`, and `JWT_SECRET`. Replace the old OpenAI settings with:

   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key
   GEMINI_MODEL=gemini-2.5-flash-lite
   ```

3. Restart the backend from the `server` folder with `npm run dev`.
4. Complete a new five-question interview to test evaluation.

## Notes

- Do not put the API key in React/client code, upload it to chat, or commit `server/.env` to GitHub.
- The free tier is limited and not unlimited; check the current model limits in Google AI Studio. Google's free-tier pricing page says content may be used to improve its products, so do not submit sensitive personal data.
- If no Gemini key is configured or the API request fails, the interview session remains saved and the evaluation status indicates that AI evaluation did not complete.
