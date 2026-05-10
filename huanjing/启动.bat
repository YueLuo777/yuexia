@echo off
chcp 65001 >nul
title 月下写作
cd /d "%~dp0.."
node launcher/server.cjs
