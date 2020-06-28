#!/bin/sh
# smbuserdel.sh - delete the Samba user and the FreeBSD account.
smbpasswd -x $1
pw userdel $1
