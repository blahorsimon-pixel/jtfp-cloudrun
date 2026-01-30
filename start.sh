#!/bin/bash
pkill -f "node /www/wwwroot/JTFP/dist/index.js"
pkill -f "node dist/index.js"
sleep 2
cd /www/wwwroot/JTFP
nohup node dist/index.js > logs/server.log 2>&1 &
echo "Service started"
sleep 3
curl http://localhost:3100/health
