#!/bin/sh
# smbconf.sh - check smb.conf using testparms and report status.
# A single command-line parameter may be passed as the path to smb.conf.
# The return code is 1 when errors occur and 0 when no errors found.
#
# If "Loaded services file OK." is the second line of testparm's stderr, then
# everything is ok. Otherwise, it will be preceded by error messages, pushing
# it down to a lower line. This indicates a problem with smb.conf.
#
STATUS="ok"

FAILED_SU=$(egrep -c 'su\[[0-9]+\]: BAD SU' /var/log/messages)
if [ $FAILED_SU -gt 0 ]; then STATUS="Failed attempts: $FAILED_SU"; fi

echo $STATUS
exit $FAILED_SU
