@echo off
cd /d "%~dp0"
python app\server.py
if errorlevel 1 pause
