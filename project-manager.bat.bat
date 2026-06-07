@echo off
setlocal EnableDelayedExpansion
title GitHub Project Manager

:menu
cls
echo ===================================
echo       GitHub Project Manager
echo ===================================
echo.
echo [1] Build Project
echo [2] Commit and Push to GitHub
echo [3] Build, Commit and Push
echo [4] Exit
echo.
choice /c 1234 /n /m "Select an option: "

if errorlevel 4 goto end
if errorlevel 3 goto both
if errorlevel 2 goto push
if errorlevel 1 goto build

:build
cls
echo.
echo Building project...
echo.

call npm run build

echo.
pause
goto menu

:push
cls
call :timestamp

echo.
echo Commit Message:
echo %COMMIT_MSG%
echo.

git add .

git commit -m "%COMMIT_MSG%"

git push origin main

echo.
pause
goto menu

:both
cls
echo.
echo Building project...
echo.

call npm run build

if errorlevel 1 (
    echo.
    echo Build failed!
    pause
    goto menu
)

call :timestamp

echo.
echo Commit Message:
echo %COMMIT_MSG%
echo.

git add .

git commit -m "%COMMIT_MSG%"

git push origin main

echo.
pause
goto menu

:timestamp
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format ''MM-dd-yyyy hh:mm tt''"') do set COMMIT_MSG=%%i
exit /b

:end
echo.
echo Goodbye!
pause
exit