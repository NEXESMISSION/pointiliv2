@echo off
rem Pointili v2 (the next version) on this computer only: localbase (the database, port 54321) and the app (port 3302).
rem The app accepts big cookie headers (Edge sends every localhost cookie of every project: HTTP 431 otherwise).
start "localbase" cmd /k "cd /d %~dp0localbase && node server.mjs"
start "pointili app" cmd /k "cd /d %~dp0v2 && set NODE_OPTIONS=--max-http-header-size=262144 && npx next dev -p 3302"
timeout /t 8 >nul
start "" "http://localhost:3302"
