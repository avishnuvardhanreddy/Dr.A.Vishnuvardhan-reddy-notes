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

The API is exposed through the Vercel function in `api/[...path].ts`. Configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the Vercel project's environment variables before using administrator login. Configure `STUDENT_SHARED_USER_ID` and `STUDENT_SHARED_PASSWORD` if shared student login is needed.

Vercel's function filesystem is temporary. The app stores its JSON database and uploaded files under `/tmp` in Vercel, so they can be lost when an instance restarts and are not shared reliably between instances. Use persistent database and file storage before relying on this deployment for production data.

This portal is for Dr. A. Vishnu Vardhan Reddy, Associate Professor, CSM, to share notes with his students. All students use the same account, so actions cannot be attributed to individual users. The shared password is stored as a salted hash and can be changed from **Portal Accounts**. Admin access is restricted to the configured faculty owner.
"# Dr.A.Vishnuvardhan-reddy-notes" 
"# Dr.A.Vishnuvardhan-reddy-notes" 
"# Dr.A.Vishnu-sNotes" 
