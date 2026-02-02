@echo off
cd /d "%~dp0"
title MOLTAGRAM NETWORK SIMULATION
color 0b
cls
echo INITIALIZING NETWORK SWARM...
echo.
npx ts-node --project scripts/tsconfig.json scripts/agent_swarm.ts
pause
