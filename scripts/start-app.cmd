@echo off
REM ---------------------------------------------------------------
REM Start the full Kabadiwala Connect app stack on this PC.
REM Everything is LOCAL - the app works without internet once up.
REM
REM 1. portable in-memory MongoDB on 127.0.0.1:27017
REM    (first run downloads the binary; note: it keeps data only
REM     while this window stays open - restart wipes accounts)
REM 2. backend API on http://localhost:5000
REM 3. frontend on http://localhost:3000
REM ---------------------------------------------------------------

set HERE=%~dp0
set REPO=%HERE%..
set TEMP_MONGO=%TEMP%\kabadi-mongo

if not exist "%TEMP_MONGO%\start-mongo.mjs" (
  echo Setting up portable MongoDB ^(one time^)...
  mkdir "%TEMP_MONGO%" 2>nul
  pushd "%TEMP_MONGO%"
  npm init -y >nul
  npm install mongodb-memory-server --no-fund --no-audit
  (
    echo import { MongoMemoryServer } from "mongodb-memory-server";
    echo const mongod = await MongoMemoryServer.create^({
    echo   instance: { port: 27017, ip: "127.0.0.1", dbName: "kabadiwala_connect", auth: false },
    echo }^);
    echo console.log^("in-memory MongoDB ready:", mongod.getUri^(^)^);
    echo setInterval^(() =^> {}, 1 ^<^< 30^);
  ) > start-mongo.mjs
  popd
)

start "kabadi-mongo" /min cmd /c "cd /d %TEMP_MONGO% && node start-mongo.mjs"
echo Waiting for MongoDB...
:waitmongo
powershell -command "exit ([int](-not (Test-NetConnection 127.0.0.1 -Port 27017 -InformationLevel Quiet -WarningAction SilentlyContinue)))" >nul 2>&1
if errorlevel 1 (ping -n 3 127.0.0.1 >nul & goto waitmongo)

start "kabadi-backend" /min cmd /c "cd /d %REPO%\backend && node server.js"
echo Waiting for backend API...
:waitapi
powershell -command "exit ([int](-not (Test-NetConnection 127.0.0.1 -Port 5000 -InformationLevel Quiet -WarningAction SilentlyContinue)))" >nul 2>&1
if errorlevel 1 (ping -n 3 127.0.0.1 >nul & goto waitapi)

start "kabadi-frontend" /min cmd /c "cd /d %REPO%\frontend && npm run dev"
echo Frontend starting on http://localhost:3000 (login: backend must be seeded)
echo NOTE: the in-memory MongoDB wipes data when this PC restarts.
echo       Register your collector account again after a restart,
echo       or install MongoDB Community for permanent data.
