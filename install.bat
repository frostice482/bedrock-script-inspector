@echo off

cd server
cmd /c npm i --omit=dev
cmd /c npm link
