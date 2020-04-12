#!/bin/sh
# smbuseradd.sh - called by Samba to create a FreeBSD user account.
pw groupadd $1 && pw useradd $1 -m -c '&' -g $1 -G shared -s /sbin/nologin -w random >>/dev/null
