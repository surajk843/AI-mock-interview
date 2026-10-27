const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.join(
  __dirname,
  "firebase-service-account.json"
);

if (!process.env.FIREBASE_PROJECT_ID) {
  throw new Error("FIREBASE_PROJECT_ID is missing from server/.env");
}

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(
    "Firebase service account file not found: firebase-service-account.json"
  );
}

const serviceAccount = require(serviceAccountPath);

const app =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      })
    : getApps()[0];

const db = getFirestore(app);

module.exports = { db };