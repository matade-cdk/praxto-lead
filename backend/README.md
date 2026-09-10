# Praxto leads backend

Express API that validates enquiries and stores them in the `leads` Firestore collection.

## Setup

1. Install Node.js 20 or newer.
2. In this directory, run `npm install`.
3. Create `.env` from `.env.example`.
4. Create a Firebase service account in the Firebase console and set `GOOGLE_APPLICATION_CREDENTIALS` to its JSON path, or provide the JSON in `FIREBASE_SERVICE_ACCOUNT_JSON`.
5. Enable Firestore Database and Email/Password under Firebase Authentication.
6. Start the API with `npm run dev`. On first start, it creates `admin@gmail.com` with the configured `ADMIN_PASSWORD` if the account does not already exist.

## Firebase Console checklist

1. Open the Firebase project `praxto-leads`.
2. Build > Firestore Database > Create database.
3. Build > Authentication > Sign-in method > enable Email/Password.
4. Create or let the backend create `admin@gmail.com`; its initial password is `admin123` from `.env`.
5. Download a service-account key from Project settings > Service accounts and save it as `backend/service-account.json`.
6. From the repository root, install the Firebase CLI and deploy the Firestore rules:

```bash
npm install -g firebase-tools
firebase login
firebase use praxto-leads
firebase deploy --only firestore:rules
```

The rules allow public creation of validated enquiries and restrict reads, updates, and deletes to `admin@gmail.com`. The backend uses Firebase Admin credentials and is not restricted by Firestore rules.

The React frontend writes directly to Firestore, so the backend is not required for local frontend use. The admin UI is available at `http://localhost:5500/admin`. The Express API remains available for deployments that prefer server-side integration.

The browser Firebase config belongs in the frontend. Never put a Firebase service-account key in the frontend or commit it to Git.
