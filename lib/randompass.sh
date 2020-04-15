#!/bin/sh
# randompass.sh - returns a random alpha-numeric password.
#
if [ "$1" == "" ]; then
  RANDOMPASS=$(tr -cd '[A-Za-z0-9]' < /dev/urandom | fold -w16 | head -n1)
  echo $RANDOMPASS
  # If stdout is being piped (e.g. to smbpasswd) repeat the password.
  [ -t 1 ] || echo $RANDOMPASS
else
  echo "Usage: $0 | smbpasswd -s -a username"
fi
