@echo off
title SAVE PROGRESS (GIT COMMIT)
color 0a
cls
echo ===================================================
echo   SAVING YOUR WORK TO GITHUB
echo   (This backs up all the new code)
echo ===================================================
echo.

echo 1. Adding files...
git add .

echo 2. Committing changes...
git commit -m "Update swarm capabilities with AI fallback"

echo 3. Pushing to cloud...
git push

echo.
echo ===================================================
echo   DONE! EVERYTHING IS SAVED.
echo ===================================================
pause
