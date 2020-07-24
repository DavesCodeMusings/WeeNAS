#!/bin/sh
#
# Defaults for dialog boxes.
BACKTITLE="WeeNAS = Raspberry Pi(TM) + Flash Drive + FreeBSD(R) + Samba(TM)"
BOX_W=60
INFO_PAUSE="2"

### PREREQUISITES ###

# Initialize the log file.
LOGFILE="/var/log/weenas_install.log"
echo "WeeNAS Install $(date)" >$LOGFILE

# Check OS.
echo "Checking OS is FreeBSD." >>$LOGFILE
[ "$(uname -o)" == "FreeBSD" ] || { echo "Sorry, Charlie. WeeNAS only runs on FreeBSD"; exit 1; }

# Check root privileges.
echo "Checking root privilges." >>$LOGFILE
#[ "$(id -u)" == "0" ] || { echo "Sorry, Charlie. You must be logged in as root to run the install script."; exit 1; }

# Set shell scripts to executable. (.zip files don't store the perms.)
echo "Setting eXecute bit on shell files." >>$LOGFILE
find . -name '*.sh' | xargs chmod +x >>$LOGFILE

# Intro dialog.
echo "Displaying welcome dialog." >>$LOGFILE
dialog --no-lines --backtitle "$BACKTITLE" --title "About WeeNAS" --yes-label "OK" --no-label "Exit" \
 --yesno "Welcome to WeeNAS, a quick and easy way to turn commodity hardware into a low-tech network attached storage system.\n\nWeeNAS is designed to run on top of FreeBSD(R) 12.1 installed on Raspberry Pi(TM) hardware. No other configuration is supported.\n\nWeeNAS is not part of, nor is it endorsed by, the Raspberry Pi, FreeBSD, or Samba projects.\n\nSee https://davescodemusings.github.io/WeeNAS/ for more information." 17 $BOX_W
[ $? -eq 0 ] || exit 0

### Gather configuration information. ###

# Optionally get a new hostname.
TITLE="Hostname"
echo "$TITLE: user input." >>$LOGFILE
TMP_FILE=$(mktemp)
dialog --no-lines --backtitle "$BACKTITLE" --title "Hostname" \
 --form "If you'd like to set a new DNS identity for your WeeNAS device (e.g. weenas.mydomain.com) type it below. Or select cancel to keep the default." 9 60 1 "hostname:" 0 2 "$(hostname)" 0 12 42 42 2>$TMP_FILE
NEW_HOSTNAME=$(cat $TMP_FILE)
echo "$TITLE: $NEW_HOSTNAME" >>$LOGFILE
rm $TMP_FILE >>$LOGFILE 2>&1

# USB mass storage device to use for home directories.
DEVICE="da0"

# Count up all da devices. To avoid confusion, there can only be one present during installation.
# This is unique to Raspberry Pi hardware, because it uses mmcsd0 (SD card) for the operating system.
TITLE="USB Storage"
echo "$TITLE: Checking for one and only one USB storage devices plugged in." >>$LOGFILE
echo "$TITLE: Found $(geom disk status | grep -c da)" >>$LOGFILE
while [ $(geom disk status | grep -c da) -ne 1 ]; do
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --yes-label "Rescan" --no-label "Exit" \
   --yesno "During installation, there should be one and only one flash drive plugged in. This device will be dedicated to data storage. Remove all other USB storage devices from the system before proceeding." 8 $BOX_W
  [ $? -eq 0 ] || exit 1
done

# Confirm USB flash drive.
echo "$TITLE: Asking for confirmation to use $DEVICE." >>$LOGFILE
DEVICE_DESCR=$(geom disk list $DEVICE | egrep 'Name|Mediasize|descr' | sed 's/^[0-9]\./  /')
echo "$DEVICE_DESCR" >>$LOGFILE
dialog --no-lines --cr-wrap --backtitle "$BACKTITLE" --title "$TITLE" \
 --yesno "Use this device for WeeNAS data storage?\n\n$DEVICE_DESCR" 9 $BOX_W
[ $? -eq 0 ] || exit 1

# Warn about existing homefs partition.
echo "$TITLE: Checking for existing homefs partition." >>$LOGFILE
STORAGE_STATE="overwritten"
if geom label list | grep homefs >>$LOGFILE 2>&1; then
  dialog --no-lines --backtitle "$BACKTITLE" --yes-label "Erase" --no-label "Preserve" --defaultno --title "$TITLE" \
   --yesno "homefs filesystem detected!\n\nAn existing homefs filesystem means that $DEVICE has been used before and may still have important data on it.\n\nYou can preserve the data on $DEVICE and use it for WeeNAS home directories or you can erase it to start fresh." 11 $BOX_W
  [ $? -eq 0 ] || STORAGE_STATE="preserved"
fi

### Confirm Installation. ###

echo "Confirming installation." >>$LOGFILE
dialog --no-lines --backtitle "$BACKTITLE" --yes-label "Install" --no-label "Exit" --defaultno --title "Confirm Installation" \
  --yesno "If you choose to continue:\n\n  1) NTP time sync will be enabled.\n  2) Hostname will be set to: $NEW_HOSTNAME\n  3) Samba and Node.js packages will be installed.\n  4) Data on $DEVICE will be $STORAGE_STATE.\n  5) $DEVICE will be labeled as homefs and mounted on /home.\n  6) Samba file sharing will be enabled.\n  7) Node.js based WeeNAS admin tools will be installed.\n\nDo you wish to continue installation?" 15 $BOX_W
[ $? -eq 0 ] || exit 0

### Carry out requested actions. ###

echo "Proceeding with installation. $DEVICE will be $STORAGE_STATE." >>$LOGFILE

# Start ntpd time sync.
TITLE="Time Sync"
echo "$TITLE: starting ntpd." >>$LOGFILE
if ! service ntpd onestatus >/dev/null 2>&1; then
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Configuring NTP time synchronization.\n\n  [ ] Enable NTP.\n  [ ] Set timezone.\n  [ ] Start NTP service." 8 $BOX_W
  sysrc ntpd_enable="YES" >>$LOGFILE 2>&1
  sysrc ntpd_sync_on_start="YES" >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Configuring NTP time synchronization.\n\n  [x] Enable NTP.\n  [ ] Set timezone.\n  [ ] Start NTP service." 8 $BOX_W
  [ -h /etc/localtime ] || ln -s /usr/share/zoneinfo/Etc/GMT /etc/localtime
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Configuring NTP time synchronization.\n\n  [x] Enable NTP.\n  [x] Set timezone.\n  [ ] Start NTP service." 8 $BOX_W
  service ntpd start >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Configuring NTP time synchronization.\n\n  [x] Enable NTP.\n  [x] Set timezone.\n  [x] Start NTP service." 8 $BOX_W
else
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE --hline "All tasks skipped, because ntpd is already running." \
   --infobox "Configuring NTP time synchronization.\n\n  [s] Enable NTP.\n  [s] Set timezone.\n  [s] Start NTP service." 8 $BOX_W
fi

# Set hostname.
TITLE="Hostname"
echo "$TITLE: $NEW_HOSTNAME" >>$LOGFILE 2>&1
if [ "$NEW_HOSTNAME" != "" ]; then
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE --infobox "Setting new hostname.\n\n  [ ] $NEW_HOSTNAME" 6 $BOX_W
  /bin/hostname $NEW_HOSTNAME >>$LOGFILE 2>&1
  sysrc hostname="$NEW_HOSTNAME" >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE --infobox "Setting new hostname.\n\n  [x] $NEW_HOSTNAME" 6 $BOX_W
fi

# Install required packages.
# pkg info <package> is used to determine if <package> is already installed and will skip if it is.
TITLE="Required Packages"
echo "$TITLE: installing/updating." >>$LOGFILE
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Installing required packages. Please be patient, this can take some time.\n\n  [ ] pkg the FreeBSD package manager.\n  [ ] Node.js JavaScript runtime.\n  [ ] Samba SMB/CIFS file sharing." 9 $BOX_W
pkg update >>$LOGFILE 2>&1
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Installing required packages. Please be patient, this can take some time.\n\n  [x] pkg the FreeBSD package manager.\n  [ ] Node.js JavaScript runtime.\n  [ ] Samba SMB/CIFS file sharing." 9 $BOX_W
pkg info node12 >>$LOGFILE 2>&1 || pkg install -y node12 >>$LOGFILE 2>&1
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Installing required packages. Please be patient, this can take some time.\n\n  [x] pkg the FreeBSD package manager.\n  [x] Node.js JavaScript runtime.\n  [ ] Samba SMB/CIFS file sharing." 9 $BOX_W
pkg info samba410 >>$LOGFILE 2>&1 || pkg install -y samba410 >>$LOGFILE 2>&1
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Installing required packages. Please be patient, this can take some time.\n\n  [x] pkg the FreeBSD package manager.\n  [x] Node.js JavaScript runtime.\n  [x] Samba SMB/CIFS file sharing." 9 $BOX_W

# Partition and format device.
TITLE="USB Storage"
echo "$TITLE: Writing partition table and filesystem." >>$LOGFILE
if [ "$STORAGE_STATE" == "overwritten" ]; then
  mount | grep homefs >/dev/null && { echo "Cowardly refusing to overwrite a mounted filesystem."; mount | grep homefs; exit 1; }
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Configuring $DEVICE.\n\n  [ ] Write new GPT partition scheme.\n  [ ] Create FreeBSD-UFS filesystem." 7 $BOX_W
  gpart destroy -F $DEVICE >>$LOGFILE 2>&1
  gpart create -s GPT $DEVICE >>$LOGFILE 2>&1
  gpart add -t freebsd-ufs $DEVICE >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Configuring $DEVICE.\n\n  [x] Write new GPT partition scheme.\n  [ ] Create FreeBSD-UFS filesystem." 7 $BOX_W
  newfs -j -L homefs /dev/${DEVICE}p1 >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Configuring $DEVICE.\n\n  [x] Write new GPT partition scheme.\n  [x] Create FreeBSD-UFS filesystem." 7 $BOX_W
fi

# Check and mount filesystem.
TITLE="Home Filesystem"
echo "$TITLE: fsck and mount homefs." >>$LOGFILE
sysrc fsck_y_enable="YES" >>$LOGFILE 2>&1;
if ! mount | grep homefs >>$LOGFILE 2>&1; then
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Preparing homefs.\n\n  [ ] Add to /etc/fstab.\n  [ ] Check filesystem.\n  [ ] Mount filesystem" 8 $BOX_W
  grep homefs /etc/fstab  >>$LOGFILE 2>&1 || echo "/dev/ufs/homefs   /home   ufs   rw,noatime   1   2" >> /etc/fstab
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Preparing homefs.\n\n  [x] Add to /etc/fstab.\n  [ ] Check filesystem.\n  [ ] Mount filesystem." 8 $BOX_W
  fsck -fpy /dev/ufs/homefs >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Preparing homefs.\n\n  [x] Add to /etc/fstab.\n  [x] Check filesystem.\n  [ ] Mount filesystem." 8 $BOX_W
  mount /dev/ufs/homefs >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Preparing homefs.\n\n  [x] Add to /etc/fstab.\n  [x] Check filesystem.\n  [x] Mount filesystem." 8 $BOX_W
else
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE --hline "All tasks skipped, because homefs is already mounted." \
   --infobox "Preparing homefs.\n\n  [s] Add to /etc/fstab.\n  [s] Check filesystem.\n  [s] Mount filesystem." 8 $BOX_W
fi

# Configure Samba
TITLE="Samba Configuration"
echo "$TITLE" >>$LOGFILE

# Multiple daemons make "service samba_server onestatus" prone to inconclusive results.
echo "Checking for running smbd, nmbd" >>$LOGFILE
if ! pgrep smbd >>$LOGFILE 2>&1 && ! prgrep nmbd >>$LOGFILE 2>&1; then
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Setting up Samba file sharing.\n\n  [ ] Create basic configuration file.\n  [ ] Start services." 7 $BOX_W
  [ -f /usr/local/etc/smb4.conf ] || cp etc/smb4.conf /usr/local/etc/
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Setting up Samba file sharing.\n\n  [x] Create basic configuration file.\n  [ ] Start services." 7 $BOX_W
  sysrc samba_server_enable="YES" >>$LOGFILE 2>&1;
  service samba_server start >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Setting up Samba file sharing.\n\n  [x] Create basic configuration file.\n  [x] Start services." 7 $BOX_W
else
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE --hline "All tasks skipped, because Samba is already running." \
   --infobox "Setting up Samba file sharing.\n\n  [s] Create basic configuration file.\n  [s] Start services." 7 $BOX_W
fi

# WeeNAS Administration Tools
TITLE="Administration Tools"
echo "$TITLE" >>$LOGFILE
if ! service weenas_api onestatus >/dev/null 2>&1; then
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" \
   --infobox "Setting up WeeNAS administration. Please be patient, this can take some time.\n\n  [ ] Create TLS certificate.\n  [ ] Install service.\n  [ ] Start service." 9 $BOX_W
  mkdir cert >>$LOGFILE 2>&1
  openssl req -x509 -newkey rsa:4096 -keyout cert/weenas.key -out cert/weenas.cer -days 730 -nodes -subj "/CN=$(hostname)" >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Setting up WeeNAS administration. Please be patient, this can take some time.\n\n  [x] Create TLS certificate.\n  [ ] Install service.\n  [ ] Start service." 9 $BOX_W
  install -o0 -g0 -m755 etc/rc.d/weenas_api /usr/local/etc/rc.d >>$LOGFILE 2>&1
  sysrc weenas_api_enable="YES" >>$LOGFILE 2>&1
  sysrc weenas_api_home="$(pwd)" >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Setting up WeeNAS administration. Please be patient, this can take some time.\n\n  [x] Create TLS certificate.\n  [x] Install service.\n  [ ] Start service." 9 $BOX_W
  service weenas_api start >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Setting up WeeNAS administration. Please be patient, this can take some time.\n\n  [x] Create TLS certificate.\n  [x] Install service.\n  [x] Start service." 9 $BOX_W
else
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE --hline "All tasks skipped, because weenas_api is already running." \
   --infobox "Setting up WeeNAS administration. Please be patient, this can take some time.\n\n  [x] Create TLS certificate.\n  [x] Install service.\n  [x] Start service." 9 $BOX_W
fi

# Set up users.
TITLE="User Accounts"
echo "$TITLE" >>$LOGFILE
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Configuring users.\n\n  [ ] Create shared group.\n  [ ] Lock backdoor toor account.\n  [ ] Enable freebsd user as WeeNAS admin." 8 $BOX_W
grep shared /etc/group >>/dev/null 2>&1 || pw groupadd shared -g 1000
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Configuring users.\n\n  [x] Create shared group.\n  [ ] Lock backdoor toor account.\n  [ ] Enable freebsd user as WeeNAS admin." 8 $BOX_W
pw lock toor >>$LOGFILE 2>&1
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Configuring users.\n\n  [x] Create shared group.\n  [x] Lock backdoor toor account.\n  [ ] Enable freebsd user as WeeNAS admin." 8 $BOX_W
pw user mod freebsd -c "FreeBSD User,$(sha1 -qs 'freebsd')"
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Configuring users.\n\n  [x] Create shared group.\n  [x] Lock backdoor toor account.\n  [x] Enable freebsd user as WeeNAS admin." 8 $BOX_W

# Optionally set the root password. Loop through until either successful return from pw or Cancel in dialog.
echo "$TITLE: root password" >>$LOGFILE
PW_SET=0
while [ $PW_SET -ne 1 ]; do

  # Create a randomly named temp filename that only the user can access.
  TMP_FILE=$(mktemp)
  UMASK_SAVE=$(umask)
  umask 0077

  # Ask for password and confirmation, storing in temp file.
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --hline "Use up/down arrow keys to move between fields." --insecure \
   --passwordform "Enter a new root password." 8 $BOX_W 2 "New Password:" 1 6 "" 1 21 32 32 "Confirm Password:" 2 2 "" 2 21 32 32 2>$TMP_FILE
  if [ $? -eq 0 ]; then
    umask $UMASK_SAVE

    # Read in password and confirmation.
    PW1="x"
    PW2="y"
    while read LINE; do
      if [ "$PW1" == "x" ]; then
        PW1=$LINE
      else
        PW2=$LINE
      fi
    done <$TMP_FILE
    rm $TMP_FILE

    # Compare and change only if they match.
    if [ "$PW1" == "$PW2" ]; then
      echo $PW1 | pw usermod $USER -h0 && PW_SET=1
    else
      dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --msgbox "Passwords do not match." 5 $BOX_W
    fi
  else
    PW_SET=1  # Because it was skipped.
  fi
done

# Finished.
echo "Installation complete." >>$LOGFILE
HOSTNAME=$(hostname)
IP_ADDR="$(ifconfig ue0 | awk '/inet/ { print $2 }')"
dialog --no-lines --backtitle "$BACKTITLE" --title "Installation Complete" \
 --msgbox "To add users, open a web browser to either:\n\n  * https://${HOSTNAME}:9000/admin.html\n  * https://${IP_ADDR}:9000/admin.html\n\nUse an initial username/password combination of freebsd/freebsd to sign in.\n\nWeeNAS uses a self-signed TLS certificate, so you must add an exception for your browser to display the page." 14 $BOX_W
