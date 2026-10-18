@echo off
setlocal
cd /d "%~dp0"
echo ========================================
echo FORM LAB - instalacja i uruchomienie
echo ========================================
where node >nul 2>nul
if errorlevel 1 (
  echo Nie znaleziono Node.js. Zainstaluj Node.js LTS i uruchom ten plik ponownie.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Instalowanie zaleznosci...
  call npm.cmd install
  if errorlevel 1 (
    echo Instalacja nie powiodla sie. Sprawdz polaczenie z internetem i komunikat wyzej.
    pause
    exit /b 1
  )
)
if not exist .env (
  copy .env.example .env >nul
  echo Utworzono .env z przykladowej konfiguracji.
  echo Aby wlaczyc AI, wpisz klucz OPENAI_API_KEY w pliku .env i uruchom ponownie.
)
echo.
echo Uruchamiam FORM LAB. Pozostaw to okno otwarte.
echo Otworz http://localhost:3000 w przegladarce.
echo.
call npm.cmd start
pause
