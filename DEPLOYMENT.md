# Instrukcja Wdrożenia: Firebase + GitHub Pages

Dzięki poniższej instrukcji krok po kroku połączysz kalkulator z darmową bazą danych w chmurze **Firebase (Google)** i opublikujesz go na **GitHub Pages**, aby każdy kierowca mógł z niego korzystać z telefonu lub komputera!

---

## KROK 1: Założenie darmowej bazy danych Firebase

1. Wejdź na stronę: **[https://console.firebase.google.com/](https://console.firebase.google.com/)** i zaloguj się kontem Google.
2. Kliknij **Add project** (Dodaj projekt) i nazwij go np. `kalkulator-uber-bolt`.
3. Przejdź przez proste kroki tworzenia (Google Analytics możesz wyłączyć).
4. Po utworzeniu projektu, na ekranie głównym kliknij ikonę **Web `</>`** (Dodaj aplikację webową).
5. Nazwij aplikację (np. `Kalkulator Web`) i kliknij **Register app**.
6. Pojawi się kod konfiguracyjny z kluczami. Skopiuj wartości obiektów:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "dwa-projekty.firebaseapp.com",
     projectId: "dwa-projekty",
     storageBucket: "dwa-projekty.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
7. Otwórz plik `firebase-config.js` w swoim projekcie i wklej powyższe klucze.

### Włączenie Bazy Firestore:
1. W lewym menu Firebase przejdź do **Build -> Firestore Database**.
2. Kliknij **Create database**.
3. Wybierz lokalizację (np. `eur3` / Europe) i wybierz tryb **Start in test mode** (Tryb testowy), a następnie kliknij **Enable**.

*Gotowe! Twoja aplikacja od teraz automatycznie synchronizuje wszystkie rozliczenia, konta i progi prowizji z chmurą!*

---

## KROK 2: Opublikowanie strony na GitHub Pages (Darmowy Hosting)

1. Wejdź na **[https://github.com/](https://github.com/)** i stwórz nowe repozytorium (np. `kalkulator-uber-bolt`).
2. Wgraj pliki z projektu:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `firebase-config.js`
3. W ustawieniach repozytorium GitHub (**Settings**):
   - W menu po lewej stronie kliknij **Pages**.
   - W sekcji **Build and deployment -> Branch** wybierz `main` (lub `master`) i kliknij **Save**.
4. Po około 1-2 minutach GitHub wygeneruje Twój publiczny adres strony, np.:
   `https://twojnick.github.io/kalkulator-uber-bolt/`

*Od teraz każdy kierowca może otworzyć ten adres na telefonie, zalogować się i przeliczać swoje zarobki z dowolnego miejsca!*
