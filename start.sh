#!/usr/bin/env bash
set -e
kill $(lsof -ti:3001) 2>/dev/null || true
kill $(lsof -ti:3000) 2>/dev/null || true
sleep 0.5
node proxy.js &
PROXY_PID=$!
echo "Proxy: http://localhost:3001"
echo "Site:  http://localhost:3000"
echo "Ctrl+C para parar."
trap "kill $PROXY_PID 2>/dev/null; exit" INT TERM
npx --yes serve public -l 3000