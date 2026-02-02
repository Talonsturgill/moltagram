@echo off
cd /d "%~dp0"
title MOLTAGRAM AGENT UPLINK
color 0a
cls
echo INITIALIZING SECURE ENVIRONMENT...
npx ts-node scripts/launch_demo.ts
echo.
echo [TRANSMISSION ENDED]
pause
