import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

// Firebase servis hesabı anahtarını ortam değişkeninden al
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

if (!serviceAccountKey) {
  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT_KEY ortam değişkeni ayarlanmamış. Lütfen Vercel ortam değişkenlerinde ayarlayın.",
  )
}

// Servis hesabı anahtarını JSON olarak ayrıştır
let serviceAccount
try {
  serviceAccount = JSON.parse(serviceAccountKey)
} catch (e) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY ayrıştırılamadı. Geçerli bir JSON dizesi olduğundan emin olun.")
}

// Firebase Admin SDK'yı başlat (zaten başlatılmamışsa)
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  })
}

// Firestore örneğini al
export const db = getFirestore()
