#!/bin/bash
set -e

if [ "$#" -eq 0 ]; then
  exec npm start
fi 

exec "$@"
