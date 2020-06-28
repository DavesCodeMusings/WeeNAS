#!/bin/sh
# smbpasswd.sh - set the user's password to the new value passed by STDIN.
#                Command-line parameter $1 is the username.

# Make sure username was given.
if [ "$1" == "" ]; then
  echo "usage: password.sh username"
  exit 1;
fi

# Get the new password. If STDIN is a terminal, issue a prompt, conceal what's
# being typed, and ask for confirmation. If STDIN is a pipe, assume everything
# was verified by the sending program and just read it in.
if [ -t 0 ]; then
  echo -n "Enter new password: "
  stty -echo
  read PASSWORD
  stty echo
  echo

  # Make sure the password is not an empty string.
  if [ "$PASSWORD" == "" ]; then
    echo "Blank passwords are not allowed."
    exit 2
  fi

  # Ask again for confirmation and verify.
  echo -n "Confirm password: " >/dev/stderr
  stty -echo
  read PWCONFIRM
  stty echo
  echo

  # Compare password and confirmation.
  if [ "$PASSWORD" != "$PWCONFIRM" ]; then
    echo "Passwords do not match."
    exit 3
  fi
else
  read PASSWORD
fi

# Change the Samba password.
printf "%s\n%s\n" $PASSWORD $PASSWORD | smbpasswd -s -a $1
