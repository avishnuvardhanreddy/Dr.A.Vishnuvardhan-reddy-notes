# Run and deploy the app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.local`. Optionally set `STUDENT_SHARED_USER_ID` and `STUDENT_SHARED_PASSWORD` to bootstrap the student login; otherwise, configure it from the faculty owner's **Portal Accounts** page.
4. Run the app:
   `npm run dev`

## Deploying to Vercel

The API is exposed through the Vercel function in `api/[...path].ts`. Set `DATABASE_URL` to your Neon connection string in the Vercel project's environment variables. The app creates its state table automatically and stores accounts, sessions, academic content, and audit logs in Neon. Also configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` before using administrator login. Configure `STUDENT_SHARED_USER_ID` and `STUDENT_SHARED_PASSWORD` if shared student login is needed.

Uploaded file contents still use Vercel's temporary filesystem and can be lost when an instance restarts. Use persistent object storage for uploaded files before relying on those uploads in production.

This portal is for Dr. A. Vishnu Vardhan Reddy, Associate Professor, CSM, to share notes with his students. All students use the same account, so actions cannot be attributed to individual users. The shared password is stored as a salted hash and can be changed from **Portal Accounts**. Admin access is restricted to the configured faculty owner.
"# Dr.A.Vishnuvardhan-reddy-notes" 
"# Dr.A.Vishnuvardhan-reddy-notes" 
"# Dr.A.Vishnu-sNotes" 
