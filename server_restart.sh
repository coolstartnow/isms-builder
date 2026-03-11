#!/bin/bash
pkill -f "node server/index.js" 2>/dev/null; sleep 1
   node server/index.js &>/tmp/isms-server.log &
   sleep 2 && cat /tmp/isms-server.log
   Restart server with new seeds
