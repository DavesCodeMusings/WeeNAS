#!/bin/sh
#
# Defaults for dialog boxes.
BACKTITLE="WeeNAS Network Attached Storage"
BOX_W=60
INFO_PAUSE="2"

### PREREQUISITES ###

# Initialize the log file.
LOGFILE="/var/log/weenas_install.log"
echo "WeeNAS Install $(date)" >$LOGFILE

# Check root privileges.
echo "Checking root privilges." >>$LOGFILE
[ "$(id -u)" == "0" ] || { echo "Sorry, Charlie. You must be logged in as root to run the uninstall script."; exit 1; }

### Confirm Uninstallation. ###

echo "Confirming uninstallation." >>$LOGFILE
dialog --no-lines --backtitle "$BACKTITLE" --yes-label "Uninstall" --no-label "Exit" --defaultno --title "Confirm Uninstallation" \
  --yesno "If you choose to continue:\n\n  * The WeeNAS API and config files will be removed.\n  * Data on storage devices will be left alone.\n  * Non-WeeNAS config files will not be changed.\n\nDo you wish to continue with uninstallation?" 11 $BOX_W
[ $? -eq 0 ] || exit 0

### Carry out requested actions. ###

echo "Proceeding with uninstallation." >>$LOGFILE
# WeeNAS Administration
TITLE="WeeNAS Administration Tool"
echo "$TITLE" >>$LOGFILE
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" \
 --infobox "Uninstalling WeeNAS.\n\n  [ ] Uninstall WeeNAS API\n  [ ] Uninstall WeeNAS admin tool.\n  [ ] Uninstall WeeNAS config files." 8 $BOX_W
service weenas_api stop >>$LOGFILE 2>&1
sysrc weenas_api_enable="NO" >>$LOGFILE 2>&1
rm /usr/local/libexec/weenas_api.js
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Uninstalling WeeNAS.\n\n  [x] Uninstall WeeNAS API\n  [ ] Uninstall WeeNAS admin tool.\n  [ ] Uninstall WeeNAS config files." 8 $BOX_W
rm -Rf /usr/local/share/weenas
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Uninstalling WeeNAS.\n\n  [x] Uninstall WeeNAS API\n  [x] Uninstall WeeNAS admin tool.\n  [ ] Uninstall WeeNAS config files." 8 $BOX_W
rm -Rf /usr/local/etc/weenas
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Uninstalling WeeNAS.\n\n  [x] Uninstall WeeNAS API\n  [x] Uninstall WeeNAS admin tool.\n  [x] Uninstall WeeNAS config files." 8 $BOX_W
