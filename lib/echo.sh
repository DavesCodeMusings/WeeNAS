#!/bin/sh
# echo.sh - output command-line parameters and stdin to aid troubleshooting.

echo "command-line:"
echo "$@"
echo "stdin:"
while read LINE; do
  echo $LINE
done
