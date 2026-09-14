// FIREBASE CONFIGURATION & INITIALIZATION
// Aby połączyć aplikację z własną bazą Firebase w chmurze (Google Cloud):
// 1. Wejdź na https://console.firebase.google.com/
// 2. Stwórz darmowy projekt i dodaj aplikację Web (ikona </>)
// 3. Wklej poniżej dane konfiguracyjne wygenerowane przez Firebase:

const firebaseConfig = {
  apiKey: "AIzaSyDgRkx4fnDoKKHz_rq7G2oMl-YPcRYWI9U",
  authDomain: "kalkulator-uber-bolt.firebaseapp.com",
  projectId: "kalkulator-uber-bolt",
  storageBucket: "kalkulator-uber-bolt.firebasestorage.app",
  messagingSenderId: "147513068734",
  appId: "1:147513068734:web:776c4439f5a928a702e2ef"
};

let db = null;
let isFirebaseActive = false;

function initFirebase() {
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey.trim() !== "") {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            isFirebaseActive = true;
            console.log("⚡ Połączono pomyślnie z bazą w chmurze Firebase!");
        } catch (e) {
            console.warn("⚠️ Firebase nie został zainicjalizowany (używanie pamięci lokalnej):", e);
        }
    } else {
        console.log("ℹ️ Brak kluczy Firebase w firebase-config.js — aplikacja działa w trybie pamięci lokalnej (localStorage).");
    }
}

// Inicjalizacja przy ładowaniu
if (typeof window !== 'undefined') {
    initFirebase();
}
