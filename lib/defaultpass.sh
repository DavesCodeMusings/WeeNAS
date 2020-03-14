#!/bin/sh
# defaultpass.sh - a totally insecure way to make initial passwords.
# Returns an MD5 sum of the value passed as the first parameter.
#
if ! [ "$1" == "" ]; then
  INITPASS=$(md5 -q -s ${1})
  echo $INITPASS
  # If stdout is being piped (e.g. to smbpasswd) repeat the password.
  [ -t 1 ] || echo $INITPASS
else
  echo "Usage: $0 username"
fi
