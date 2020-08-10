#!/bin/sh
# smbconf.sh - check smb.conf using testparms and report status.
# A single command-line parameter may be passed as the path to smb.conf.
# The return code is 1 when errors occur and 0 when no errors found.
#
# If "Loaded services file OK." is the second line of testparm's stderr, then
# everything is ok. Otherwise, it will be preceded by error messages, pushing
# it down to a lower line. This indicates a problem with smb.conf.
#
PATH=$PATH:/usr/local/bin

EXITCODE=0
STATUS=$(testparm -s $1 2>&1 | awk '/OK/ { printf "%s\n", (NR==2)?"ok":"corrupt" }')
if [ "$STATUS" != "ok" ]; then EXITCODE=1; fi

echo $STATUS
exit $EXITCODE
