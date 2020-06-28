#!/bin/sh
# password.sh - set the user's password if the secret answer is correct.
#               $1 is the user, $2 is the password, $3 is the secret.

# See if we have enough arguments. Username, password and secret must be given.
if [ "$1" == "" ] || [ "$2" == "" ] || [ "$3" == "" ]; then
  echo "usage: password.sh username password secret"
  exit 1;
fi

# Hash the given secret and retrieve the stored secret's hash.
GIVEN_SECRET_HASH=$(sha1 -qs '$3')
STORED_SECRET_HASH=$(pw user show $1 | awk -F: '{ split($8, gecos, ","); printf "%s\n", gecos[2]; }')

# Verify the secret. If there is no current secret, set it.
if [ "$STORED_SECRET_HASH" == "" ]; then
  pw usermod %1 -c "&,$GIVEN_SECRET_HASH"
else
  if [ "$STORED_SECRET_HASH" == "$GIVEN_SECRET_HASH" ]; then
    printf "%s\n%s\n" $2 $2 | smbpasswd -s -a $1
  else
    echo "Bad secret."
  fi
fi
