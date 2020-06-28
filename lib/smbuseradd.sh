#!/bin/sh
# smbuseradd.sh - Create a FreeBSD user account and Samba account.

# Create a FreeBSD account with a random password, capturing the password.
RANDOM_PASSWD=$(pw groupadd $1 && pw useradd $1 -m -c '&' -g $1 -G shared -s /sbin/nologin -w random | sed 's/Password for .* is: //')

# Pipe the random password (twice) to smbpasswd to use as its initial password.
printf "%s\n%s\n" $RANDOM_PASSWD $RANDOM_PASSWD | smbpasswd -s -a $1
