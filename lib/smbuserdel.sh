#!/bin/sh
# smbuserdel.sh - called by Samba to delete a FreeBSD user account.
pw userdel $1
