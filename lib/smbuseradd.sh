#!/bin/sh
# smbuseradd.sh - called by Samba to create a FreeBSD user account.
pw groupadd $1 && pw useradd $1 -m -c $1 -g $1 -G shared -w random >>/root/vault
