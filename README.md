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

The API is exposed through the Vercel function in `api/index.ts`, with `/api/*` requests routed to the existing Express routes by `vercel.json`. Set `DATABASE_URL` to your Neon connection string in the Vercel project's environment variables. The app creates its state table automatically and stores accounts, sessions, academic content, and audit logs in Neon. Also configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` before using administrator login. Configure `STUDENT_SHARED_USER_ID` and `STUDENT_SHARED_PASSWORD` if shared student login is needed.

For persistent uploads, configure `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `AWS_BUCKET_NAME` for your S3-compatible object storage. The example uses the `assets` bucket; create that bucket in your object-storage provider or change the bucket name to match one that already exists. Vercel uploads use short-lived presigned URLs so file bytes go directly from the browser to object storage, bypassing the function request-size limit. Each file can be up to 50 MB, with up to 10 files per upload. Locally, uploads continue to use the `data/uploads` directory unless all five storage settings are configured. The app streams downloads through authenticated API routes instead of exposing signed URLs.

Allow browser `PUT` requests to the storage bucket with a CORS rule. For AWS S3, a starting CORS rule is:

```json
[
  {
    "AllowedHeaders": ["Content-Type", "x-amz-meta-upload-id"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": ["https://vishnusnotes.vercel.app", "http://localhost:3000"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Replace or add the exact production domain and local origin you use. The storage endpoint must be publicly reachable by the user's browser. Never commit real credentials; use Vercel environment variables for deployment and `.env.local` for local development.

## Create the PostgreSQL tables

In the Neon project, open **SQL Editor**, select the `neondb` database and `public` schema, then run the contents of [database/schema.sql](./database/schema.sql). This creates the normalized application tables and seeds the academic years and semesters. The current server runtime still reads and writes application state through its `gprec_academic_hub_state` JSONB table; it does not yet read or write these normalized tables.

This portal is for Dr. A. Vishnu Vardhan Reddy, Associate Professor, CSM, to share notes with his students. All students use the same account, so actions cannot be attributed to individual users. The shared password is stored as a salted hash and can be changed from **Portal Accounts**. Admin access is restricted to the configured faculty owner.

Signed-in users can open the faculty notifications panel to read announcements. Only the faculty admin can create, edit, or delete notifications. The admin can also update or delete published written notes and code from the dashboard.
"# Dr.A.Vishnuvardhan-reddy-notes" 
"# Dr.A.Vishnuvardhan-reddy-notes" 
"# Dr.A.Vishnu-sNotes" 
