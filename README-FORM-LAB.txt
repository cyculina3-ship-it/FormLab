FORM LAB 2.0 — KOMPLETNY PROJEKT PWA + AI + CAPACITOR
====================================================

CO DOSTAJESZ
------------
- Instalowalną aplikację PWA na Androidzie i iPhonie (po wdrożeniu pod HTTPS).
- Responsywny interfejs FORM LAB.
- Lokalny dziennik i dane przechowywane w localStorage.
- Eksport/import kopii danych JSON.
- Backend Node.js dla analizy opisu i zdjęcia posiłku przez OpenAI API.
- Konfigurowalny adres backendu dla wersji natywnej Capacitor.
- Konfigurację Capacitor pod Androida oraz iOS.
- Skrypt startowy dla Windows, który używa npm.cmd i omija typowy błąd blokady npm.ps1.

WAŻNE: TO JEST KOMPLETNY PROJEKT ŹRÓDŁOWY, NIE GOTOWY APK/IPA.
Plik APK trzeba zbudować w Android Studio. Plik IPA dla iPhone'a wymaga macOS,
Xcode i odpowiedniego podpisywania Apple. Żeby instalować PWA jak aplikację,
trzeba opublikować ją pod adresem HTTPS.

SZYBKI START NA WINDOWS
-----------------------
1. Zainstaluj Node.js 20 LTS lub nowszy (zalecana aktualna wersja LTS).
2. Rozpakuj ZIP do zwykłego folderu, np. C:\\FORM-LAB.
3. Kliknij dwukrotnie start-windows.bat albo w PowerShell wpisz:
      npm.cmd install
      npm.cmd start
4. Otwórz http://localhost:3000

KONFIGURACJA AI
---------------
1. Skopiuj .env.example jako .env.
2. Otwórz .env i ustaw:
      OPENAI_API_KEY=twój_klucz_api
      OPENAI_MODEL=gpt-4o-mini
      PORT=3000
3. Zrestartuj serwer po zmianie .env.

Nie umieszczaj klucza API w index.html, app-config.js ani w plikach wysyłanych
do telefonu. Klucz ma być wyłącznie w zmiennych środowiskowych backendu.
Analiza zdjęć wymaga internetu i może generować koszty API. Wartości odżywcze
są szacunkowe, nie stanowią porady medycznej.

INSTALACJA PWA NA TELEFONIE
---------------------------
1. Wdróż projekt na hostingu obsługującym Node.js i HTTPS.
2. Upewnij się, że frontend i endpoint /api/estimate-food są dostępne pod tym
   samym adresem (ten serwer obsługuje obie rzeczy).
3. Android: Chrome -> menu -> Zainstaluj aplikację / Dodaj do ekranu głównego.
4. iPhone: Safari -> Udostępnij -> Dodaj do ekranu początkowego.

NIE wystarczy skopiować samego folderu www na hosting statyczny, jeżeli chcesz
używać analizy AI. Wtedy potrzebny jest osobno wdrożony backend.

BUDOWANIE APK DLA ANDROIDA
--------------------------
Wymagania: Windows/macOS/Linux, Node.js, Android Studio i Android SDK.
W terminalu w folderze projektu:
    npm.cmd install
    npm.cmd run android:init
    npm.cmd run android:sync
    npm.cmd run android:open

W Android Studio poczekaj na synchronizację Gradle, wybierz Build -> Build APK(s).
Typowa lokalizacja APK po kompilacji:
    android\\app\\build\\outputs\\apk\\debug\\app-debug.apk

Jeśli komenda android:init informuje, że platforma już istnieje, pomiń ją i użyj
android:sync. Po każdej zmianie plików www wykonaj android:sync.

AI W APLIKACJI NATYWNEJ
-----------------------
Aplikacja natywna nie uruchamia serwera Node.js wewnątrz telefonu. Backend AI
musi działać na publicznym serwerze HTTPS. Otwórz www/app-config.js i ustaw:
    window.FORM_LAB_API_BASE = 'https://adres-twojego-backendu.example';
Adres jest przykładowy — zastąp go prawdziwym adresem własnego wdrożenia.
Następnie uruchom android:sync i przebuduj APK. Serwer dopuszcza domyślnie
origin Capacitor oraz localhost. Dla niestandardowych originów ustaw na serwerze
ALLOWED_ORIGINS jako listę originów rozdzielonych przecinkami.
Nigdy nie ustawiaj w tej konfiguracji klucza OpenAI.

BUDOWANIE WERSJI IOS
--------------------
Wymaga komputera Mac, Xcode oraz konfiguracji konta/podpisywania Apple:
    npm install
    npm run ios:init
    npm run ios:sync
    npm run ios:open
W Windows nie da się lokalnie zbudować finalnego pliku iOS IPA przez Xcode.

DANE I PRYWATNOŚĆ
-----------------
- Dziennik jest przechowywany lokalnie w przeglądarce/aplikacji; nie ma automatycznej
  synchronizacji między urządzeniami.
- Przy analizie AI opis i opcjonalne zdjęcie są przesyłane do skonfigurowanego
  backendu, a następnie do dostawcy modelu.
- Nie wysyłaj w opisach danych osobowych.
- Przed importem kopii danych wyeksportuj aktualne dane; import może je zastąpić.
- Przed publicznym wdrożeniem dodaj własną politykę prywatności, warunki korzystania,
  kontakt do administratora i sprawdź wymogi prawne odpowiednie dla Twojej usługi.

SPRAWDZENIE
-----------
    npm.cmd run check
To sprawdza składnię serwera. Nie potwierdza dostępności klucza API ani nie zastępuje
testu na prawdziwym hostingu i urządzeniu.

POMOC
-----
Jeśli wystąpi błąd, skopiuj pełny komunikat terminala. Nie publikuj klucza API.
