@echo off
setlocal
call "%~dp0service-env.cmd" 2>nul
if not defined DPP_NODE_EXE set "DPP_NODE_EXE=node"

cd /d "%~dp0.."
set NODE_ENV=production
if not exist "logs" mkdir "logs"

"%DPP_NODE_EXE%" --env-file=.env "node_modules\tsx\dist\cli.mjs" server\index.ts >> "logs\dpp-api.log" 2>&1
