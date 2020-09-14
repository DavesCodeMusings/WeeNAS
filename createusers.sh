#!/bin/sh
#
# Command-line user creation for WeeNAS
#
# Check root privileges.
[ "$(id -u)" == "0" ] || { echo "Sorry, Charlie. You must be logged in as root to create accounts."; exit 1; }

# Start a new error log.
ERROR_LOG="createusers.err"
echo -n "" >$ERROR_LOG

# Temporary filename with access restricted to the root user.
USERLIST=$(mktemp)

# Get the list of user accounts.
dialog --no-lines --title "Create Users" --hline "Separate multiple login names with spaces." --form "Enter one or more login names to be created." 7 60 0 "Login(s):" 0 0 "" 0 11 44 100 2>$USERLIST
[ $? -ne 0] && { rm $USERLIST; exit 1; }
read LIST <$USERLIST
rm $USERLIST

# Determine access.
SAMBA=0
if dialog --no-lines --title "Create Users" --yesno "Give user(s) access to SMB (Windows) file shares?" 5 60; then SAMBA=1; fi
SHELL="/usr/bin/nologin"
if dialog --no-lines --title "Create Users" --yesno "Give user(s) shell access to log into FreeBSD?" 5 60; then SHELL="/bin/sh"; fi
ADMIN=0
if dialog --no-lines --title "Create Users" --defaultno --yesno "Give user(s) admin access?" 5 60; then ADMIN=1; fi

# One more chance to cancel, then loop through list of accounts.
if dialog --no-lines --title "Create Users" --defaultno --yesno "Last chance to change you mind. Create accounts?" 5 60; then
  for LOGIN in $LIST; do
    if ! grep ^$LOGIN: /etc/passwd >/dev/null 2>&1; then
      dialog --no-lines --title "Create Users" --infobox "Creating account ${LOGIN}..." 4 60
      pw group add $LOGIN
      PASSWORD=$(pw user add $LOGIN -g $LOGIN -c '&' -m -s $SHELL -w random) 2>>$ERROR_LOG
      if [ $ADMIN -eq 1 ]; then pw groupmod -g 0 -m $LOGIN; fi
      printf "%s\n%s\n" $PASSWORD $PASSWORD | smbpasswd -a $LOGIN >/dev/null 2>>$ERROR_LOG
      printf "%s:disabled\n" $LOGIN >> /usr/local/etc/weenas/wnpasswd 2>>$ERROR_LOG
    else
      echo "Skipping $LOGIN. Account already exists." >>$ERROR_LOG
    fi
  done
  cat $ERROR_LOG
else
  echo "Canceled. No users were created."
fi
