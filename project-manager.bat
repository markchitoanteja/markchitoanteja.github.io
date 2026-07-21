@echo off
title GitHub Project Manager

:menu
cls
echo ==========================================
echo         GitHub Project Manager
echo ==========================================
echo.
echo [1] Build Project
echo [2] Commit and Push
echo [3] Build, Commit and Push
echo [4] Exit
echo.
set /p choice=Select an option: 

if "%choice%"=="1" goto build
if "%choice%"=="2" goto push
if "%choice%"=="3" goto both
if "%choice%"=="4" goto end

echo.
echo Invalid choice!
pause
goto menu

:build
cls
echo ==========================================
echo Building Project...
echo ==========================================
echo.

call npm run build

echo.
echo Build Complete.
pause
goto menu

:push
cls
call :GetTimestamp

echo ==========================================
echo Commit Message:
echo %COMMIT_MSG%
echo ==========================================
echo.

git add .
git commit -m "%COMMIT_MSG%"
git push origin main

echo.
echo Push Complete.
pause
goto menu

:both
cls
echo ==========================================
echo Building Project...
echo ==========================================
echo.

call npm run build

echo.
call :GetTimestamp

echo ==========================================
echo Commit Message:
echo %COMMIT_MSG%
echo ==========================================
echo.

git add .
git commit -m "%COMMIT_MSG%"
git push origin main

echo.
echo Build and Push Complete.
pause
goto menu

:GetTimestamp
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format \"MM-dd-yyyy hh:mm tt\""') do (
    set COMMIT_MSG=%%i
)
exit /b

:end
echo.
echo Goodbye!
pause
exit