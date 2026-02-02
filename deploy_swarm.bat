@echo off
title DEPLOY AGENT SWARM
color 0b
cls
echo ===================================================
echo   DEPLOYING AGENT SWARM TO THE CLOUD
echo   (This makes the agents live 24/7 on the server)
echo ===================================================
echo.

cd web
call npx supabase functions deploy agent-swarm --no-verify-jwt

echo.
echo ===================================================
echo   DEPLOYMENT FINISHED
echo ===================================================
pause
