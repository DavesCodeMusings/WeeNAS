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

# Check OS.
echo "Checking OS is FreeBSD." >>$LOGFILE
[ "$(uname -o)" == "FreeBSD" ] || { echo "Sorry, Charlie. WeeNAS only runs on FreeBSD"; exit 1; }

# Check root privileges.
echo "Checking root privilges." >>$LOGFILE
[ "$(id -u)" == "0" ] || { echo "Sorry, Charlie. You must be logged in as root to run the install script."; exit 1; }

# Set shell scripts to executable. (.zip files don't store the perms.)
echo "Setting eXecute bit on shell files." >>$LOGFILE
find . -name '*.sh' | xargs chmod +x >>$LOGFILE

# Intro dialog.
echo "Displaying welcome dialog." >>$LOGFILE
dialog --no-lines --backtitle "$BACKTITLE" --title "About WeeNAS" --yes-label "OK" --no-label "Exit" \
 --yesno "Welcome to WeeNAS, a quick and easy way to turn commodity hardware into a low-tech network attached storage system.\n\nWeeNAS is designed to run on top of FreeBSD(R) 12.1 installed on Raspberry Pi(TM) hardware. No other configuration is supported.\n\nWeeNAS is not part of, nor is it endorsed by: the Raspberry Pi, FreeBSD, or Samba projects.\n\nSee https://davescodemusings.github.io/WeeNAS/ for more information." 17 $BOX_W
[ $? -eq 0 ] || exit 0

### Gather configuration information. ###

# Optionally get a new hostname.
TITLE="Identity"
echo "$TITLE: hostname input." >>$LOGFILE
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
echo "$TITLE: Using $DEVICE." >>$LOGFILE

# Warn about existing homefs filesystem.
echo "$TITLE: Checking for existing homefs filesystem." >>$LOGFILE
STORAGE_STATE="overwritten"
if geom label list | grep homefs >>$LOGFILE 2>&1; then
  dialog --no-lines --backtitle "$BACKTITLE" --yes-label "Erase" --no-label "Preserve" --defaultno --title "$TITLE" \
   --yesno "homefs filesystem detected!\n\nAn existing homefs filesystem means that $DEVICE has been used before and may still have important data on it.\n\nYou can preserve the data on $DEVICE and use it for WeeNAS home directories or you can erase it to start fresh." 11 $BOX_W
  [ $? -eq 0 ] || STORAGE_STATE="preserved"
  echo "$TITLE: homefs found and will be $STORAGE_STATE." >>$LOGFILE
fi

### Confirm Installation. ###

echo "Confirming installation." >>$LOGFILE
dialog --no-lines --backtitle "$BACKTITLE" --yes-label "Install" --no-label "Exit" --defaultno --title "Confirm Installation" \
  --yesno "If you choose to continue:\n\n  * The Raspberry Pi will be named $NEW_HOSTNAME.\n  * Data on $DEVICE will be $STORAGE_STATE.\n  * Data on $DEVICE will be shared over the network.\n\nDo you wish to continue installation?" 11 $BOX_W
[ $? -eq 0 ] || exit 0

### Carry out requested actions. ###

echo "Proceeding with installation." >>$LOGFILE

# Start ntpd time sync.
TITLE="Time Sync"
echo "$TITLE: starting ntpd." >>$LOGFILE
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Configuring NTP time synchronization.\n\n  [ ] Enable NTP.\n  [ ] Set UTC timezone.\n  [ ] Start NTP service." 8 $BOX_W
if ! service ntpd onestatus >/dev/null 2>&1; then
  sysrc ntpd_enable="YES" >>$LOGFILE 2>&1
  sysrc ntpd_sync_on_start="YES" >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Configuring NTP time synchronization.\n\n  [x] Enable NTP.\n  [ ] Set UTC timezone.\n  [ ] Start NTP service." 8 $BOX_W
  [ -h /etc/localtime ] || ln -s /usr/share/zoneinfo/Etc/UTC /etc/localtime
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Configuring NTP time synchronization.\n\n  [x] Enable NTP.\n  [x] Set UTC timezone.\n  [ ] Start NTP service." 8 $BOX_W
  service ntpd start >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Configuring NTP time synchronization.\n\n  [x] Enable NTP.\n  [x] Set UTC timezone.\n  [x] Start NTP service." 8 $BOX_W
else
  echo "$TITLE: skipped." >>$LOGFILE
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE --hline "Skipped: ntpd is already running." \
   --infobox "Configuring NTP time synchronization.\n\n  [s] Enable NTP.\n  [s] Set UTC timezone.\n  [s] Start NTP service." 8 $BOX_W
fi

# Set hostname and generate self-signed TLS certificate.
TITLE="Identity"
echo "$TITLE" >>$LOGFILE 2>&1
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Setting up identity.\n\n  [ ] Set hostname to $NEW_HOSTNAME\n  [ ] Create TLS certificate." 8 $BOX_W
if [ "$NEW_HOSTNAME" != "$(hostname)" ] || ! [ -f "/usr/local/etc/weenas/${NEW_HOSTNAME}.cer" ]; then
  echo "$TITLE: setting new hostname and TLS certificate for $NEW_HOSTNAME" >>$LOGFILE 2>&1
  /bin/hostname $NEW_HOSTNAME >>$LOGFILE 2>&1
  sysrc hostname="$NEW_HOSTNAME" >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Setting up identity.\n\n  [x] Set hostname to $NEW_HOSTNAME\n  [ ] Create TLS certificate." 8 $BOX_W
  install -o0 -g0 -m755 -d /usr/local/etc/weenas
  openssl req -x509 -newkey rsa:4096 -keyout /usr/local/etc/weenas/${NEW_HOSTNAME}.key -out /usr/local/etc/weenas/${NEW_HOSTNAME}.cer -days 730 -nodes -subj "/CN=$NEW_HOSTNAME" >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Setting up identity.\n\n  [x] Set hostname to $NEW_HOSTNAME\n  [x] Create TLS certificate." 8 $BOX_W
else
  echo "$TITLE: skipped." >>$LOGFILE
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE --hline "Skipped: keeping existing identity." \
   --infobox "Setting up identity.\n\n  [s] $NEW_HOSTNAME\n  [s] Create TLS certificate." 7 $BOX_W
fi

# Bootstrap / update package manager.
TITLE="Package Manager"
echo "$TITLE" >>$LOGFILE 2>&1
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Installing pkg and updating repositories.\n\n  [ ] Bootstrap pkg.\n  [ ] Update repositories." 7 $BOX_W
if ! pkg bootstrap -y | grep 'already bootstrapped'; then
  echo "$TITLE: installing pkg and updating repositories." >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Installing pkg and updating repositories.\n\n  [x] Bootstrap pkg.\n  [ ] Update repositories." 7 $BOX_W
  pkg update >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Installing pkg and updating repositories.\n\n  [x] Bootstrap pkg.\n  [x] Update repositories." 7 $BOX_W
else
  echo "$TITLE: skipped." >>$LOGFILE
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE  --hline "Skipped: pkg already installed." \
   --infobox "Installing pkg and updating repositories.\n\n  [s] Bootstrap pkg.\n  [s] Update repositories." 7 $BOX_W
fi

# Install system monitor.
TITLE="System Monitoring"
echo "$TITLE: installing Monit" >>$LOGFILE 2>&1
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Setting up system monitoring.\n\n  [ ] Install Monit.\n  [ ] Create configuration files.\n  [ ] Start service." 8 $BOX_W
if ! service monit onestatus; then
  pkg info monit >>$LOGFILE 2>&1 || pkg install -y monit >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Setting up system monitoring.\n\n  [x] Install Monit.\n  [ ] Create configuration files.\n  [ ] Start service." 8 $BOX_W
  [ -f /usr/local/etc/monitrc ] || sed -e 's|^#  include /etc/monit.d/\*|include /usr/local/etc/monit.d/\*.conf|' /usr/local/etc/monitrc.sample >/usr/local/etc/monitrc
  chmod 600 /usr/local/etc/monitrc
  [ -d /usr/local/etc/monit.d ] || cp -r etc/monit.d /usr/local/etc/monit.d
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Setting up system monitoring.\n\n  [x] Install Monit.\n  [x] Create configuration files.\n  [ ] Start service." 8 $BOX_W
  sysrc monit_enable="YES" >>$LOGFILE 2>&1;
  service monit start >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Setting up system monitoring.\n\n  [x] Install Monit.\n  [x] Create configuration files.\n  [x] Start service." 8 $BOX_W
else
  echo "$TITLE: skipped." >>$LOGFILE
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE --hline "Skipped: Monit already running." \
   --infobox "Setting up system monitoring.\n\n  [s] Install Monit.\n  [s] Create configuration files.\n  [s] Start service." 8 $BOX_W
fi

# Install and configure fusefs and devd for flash drive auto-mount.
TITLE="Hot-Plug USB"
echo "$TITLE" >>$LOGFILE
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Configuring fusefs and devd.\n\n  [ ] Install fusefs package.\n  [ ] Enable fusefs.\n  [ ] Configure devd for hot-plug.\n  [ ] Restart devd." 9 $BOX_W
if ! kldstat | grep fuse >>$LOGFILE 2>&1; then
  pkg info fusefs-ntfs >>$LOGFILE 2>&1 || pkg install -y fusefs-ntfs >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Configuring fusefs and devd.\n\n  [x] Install fusefs package.\n  [ ] Enable fusefs.\n  [ ] Configure devd for hot-plug.\n  [ ] Restart devd." 9 $BOX_W
  grep 'fuse_load="YES"' /boot/loader.conf || echo 'fuse_load="YES"' >>/boot/loader.conf
  kldload fuse
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Configuring fusefs and devd.\n\n  [x] Install fusefs package.\n  [x] Enable fusefs.\n  [ ] Configure devd for hot-plug.\n  [ ] Restart devd." 9 $BOX_W
  [ -d /usr/local/etc/devd ] || install -o0 -g0 -m755 -d /usr/local/etc/devd >>$LOGFILE 2>&1
  [ -f /usr/local/etc/devd/flashmount.conf ] || cp etc/flashmount.conf /usr/local/etc/devd >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Configuring fusefs and devd.\n\n  [x] Install fusefs package.\n  [x] Enable fusefs.\n  [x] Configure devd for hot-plug.\n  [ ] Restart devd." 9 $BOX_W
  service devd restart >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Configuring fusefs and devd.\n\n  [x] Install fusefs package.\n  [x] Enable fusefs.\n  [x] Configure devd for hot-plug.\n  [x] Restart devd." 9 $BOX_W
else
  echo "$TITLE: skipped." >>$LOGFILE
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE --hline "Skipped: usb hotplug already enabled."\
   --infobox "Configuring fusefs and devd.\n\n  [s] Install fusefs package.\n  [s] Enable fusefs.\n  [s] Configure devd for hot-plug.\n  [s] Restart devd." 9 $BOX_W
fi

# Install and configure Samba for file sharing.
TITLE="Samba File Sharing"
echo "$TITLE" >>$LOGFILE

# Multiple daemons make "service samba_server onestatus" prone to inconclusive results.
echo "$TITLE: Checking for running smbd, nmbd" >>$LOGFILE
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Setting up SMB/CIFS file sharing.\n\n  [ ] Install Samba.\n  [ ] Create basic configuration file.\n  [ ] Start services." 8 $BOX_W
if ! pgrep smbd >>$LOGFILE 2>&1 && ! pgrep nmbd >>$LOGFILE 2>&1; then
  pkg info samba410 >>$LOGFILE 2>&1 || pkg install -y samba410 >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Setting up SMB/CIFS file sharing.\n\n  [x] Install Samba.\n  [ ] Create basic configuration file.\n  [ ] Start services." 8 $BOX_W
  [ -f /usr/local/etc/smb4.conf ] || cp etc/smb4.conf /usr/local/etc/
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Setting up SMB/CIFS file sharing.\n\n  [x] Install Samba.\n  [x] Create basic configuration file.\n  [ ] Start services." 8 $BOX_W
  sysrc samba_server_enable="YES" >>$LOGFILE 2>&1;
  service samba_server start >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Setting up SMB/CIFS file sharing.\n\n  [x] Install Samba.\n  [x] Create basic configuration file.\n  [x] Start services." 8 $BOX_W
else
  echo "$TITLE: skipped." >>$LOGFILE
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE --hline "Skipped: Samba already running." \
   --infobox "Setting up SMB/CIFS file sharing.\n\n  [s] Install Samba.\n  [s] Create basic configuration file.\n  [s] Start services." 8 $BOX_W
fi

# WeeNAS Administration
TITLE="WeeNAS Administration Tool"
echo "$TITLE" >>$LOGFILE
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" \
 --infobox "Setting up WeeNAS administration.\n\n  [ ] Install Node.js\n  [ ] Install weenas_api service.\n  [ ] Start service." 8 $BOX_W
if ! service weenas_api onestatus >/dev/null 2>&1; then
  pkg info node12 >>$LOGFILE 2>&1 || pkg install -y node12 >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Setting up WeeNAS administration.\n\n  [x] Install Node.js\n  [ ] Install weenas_api service.\n  [ ] Start service." 8 $BOX_W
  install -o0 -g0 -m755 etc/rc.d/weenas_api /usr/local/etc/rc.d >>$LOGFILE 2>&1
  sysrc weenas_api_enable="YES" >>$LOGFILE 2>&1
  sysrc weenas_api_dir="/usr/local/libexec" >>$LOGFILE 2>&1
  install -o0 -g0 -m755 -d /usr/local/etc/weenas && cp -R etc/weenas/* /usr/local/etc/weenas
  install -o0 -g0 -m755 libexec/weenas_api.js /usr/local/libexec/weenas_api.js
  install -o0 -g0 -m755 -d /usr/local/share/weenas/htdocs && cp -R share/weenas/htdocs/* /usr/local/share/weenas/htdocs
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Setting up WeeNAS administration.\n\n  [x] Install Node.js\n  [x] Install weenas_api service.\n  [ ] Start service." 8 $BOX_W
  service weenas_api start >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Setting up WeeNAS administration.\n\n  [x] Install Node.js\n  [x] Install weenas_api service.\n  [x] Start service." 8 $BOX_W
else
  echo "$TITLE: skipped." >>$LOGFILE
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE --hline "Skipped: weenas_api already running." \
   --infobox "Setting up WeeNAS administration.\n\n  [s] Install Node.js\n  [s] Install weenas_api service.\n  [s] Start service." 8 $BOX_W
fi

# Partition and format USB device.
TITLE="USB Storage"
if [ "$STORAGE_STATE" == "overwritten" ]; then
  echo "$TITLE: Writing partition table and filesystem." >>$LOGFILE
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Configuring $DEVICE.\n\n  [ ] Write new GPT partition scheme.\n  [ ] Create FreeBSD-UFS filesystem." 7 $BOX_W
  mount | grep homefs >/dev/null && { echo "Cowardly refusing to overwrite a mounted filesystem."; mount | grep homefs; exit 1; }
  gpart destroy -F $DEVICE >>$LOGFILE 2>&1
  gpart create -s GPT $DEVICE >>$LOGFILE 2>&1
  gpart add -t freebsd-ufs $DEVICE >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Configuring $DEVICE.\n\n  [x] Write new GPT partition scheme.\n  [ ] Create FreeBSD-UFS filesystem." 7 $BOX_W
  newfs -j -L homefs /dev/${DEVICE}p1 >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Configuring $DEVICE.\n\n  [x] Write new GPT partition scheme.\n  [x] Create FreeBSD-UFS filesystem." 7 $BOX_W
else
  echo "$TITLE: skipped. Storage state is $STORAGE_STATE" >>$LOGFILE
fi

# Check and mount home filesystem.
TITLE="Home Filesystem"
echo "$TITLE: fsck and mount homefs." >>$LOGFILE
sysrc fsck_y_enable="YES" >>$LOGFILE 2>&1;
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Preparing homefs.\n\n  [ ] Add to /etc/fstab.\n  [ ] Mount filesystem.\n  [ ] Create shared drive." 8 $BOX_W
if ! mount | grep homefs >>$LOGFILE 2>&1; then
  grep homefs /etc/fstab >>$LOGFILE 2>&1 || echo "/dev/ufs/homefs   /home   ufs   rw,noatime   1   2" >> /etc/fstab
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Preparing homefs.\n\n  [x] Add to /etc/fstab.\n  [ ] Mount filesystem.\n  [ ] Create shared drive." 8 $BOX_W
  fsck -fpy /dev/ufs/homefs >>$LOGFILE 2>&1
  mount /dev/ufs/homefs >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Preparing homefs.\n\n  [x] Add to /etc/fstab.\n  [x] Mount filesystem.\n  [ ] Create shared drive." 8 $BOX_W
  install -d -g 1000 -m 1775 /home/shared >>$LOGFILE 2>&1
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
   --infobox "Preparing homefs.\n\n  [x] Add to /etc/fstab.\n  [x] Mount filesystem.\n  [x] Create shared drive." 8 $BOX_W
else
  echo "$TITLE: skipped." >>$LOGFILE
  dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE --hline "Skipped: homefs already mounted." \
   --infobox "Preparing homefs.\n\n  [s] Add to /etc/fstab.\n  [s] Mount filesystem.\n  [s] Create shared drive." 8 $BOX_W
fi

# Set up users.
TITLE="User Accounts"
echo "$TITLE" >>$LOGFILE
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Configuring users.\n\n  [ ] Create shared group.\n  [ ] Lock backdoor toor account.\n  [ ] Secure wnpasswd." 8 $BOX_W
grep shared /etc/group >>/dev/null 2>&1 || pw groupadd shared -g 1000
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Configuring users.\n\n  [x] Create shared group.\n  [ ] Lock backdoor toor account.\n  [ ] Secure wnpasswd." 8 $BOX_W
pw lock toor >>$LOGFILE 2>&1
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Configuring users.\n\n  [x] Create shared group.\n  [x] Lock backdoor toor account.\n  [ ] Secure wnpasswd." 8 $BOX_W
chmod 600 etc/fnpasswd
pw user mod freebsd -c "FreeBSD User,$(sha1 -qs 'freebsd')"
dialog --no-lines --backtitle "$BACKTITLE" --title "$TITLE" --sleep $INFO_PAUSE \
 --infobox "Configuring users.\n\n  [x] Create shared group.\n  [x] Lock backdoor toor account.\n  [x] Secure wnpasswd." 8 $BOX_W

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
    echo "$TITLE: skipped. User canceled request." >>$LOGFILE
    PW_SET=1  # Because it was skipped.
  fi
done

# Finished.
echo "Installation complete." >>$LOGFILE
HOSTNAME=$(hostname)
IP_ADDR="$(ifconfig ue0 | awk '/inet/ { print $2 }')"
dialog --no-lines --backtitle "$BACKTITLE" --title "Installation Complete" \
 --msgbox "To add users, open a web browser to either:\n\n  * https://${HOSTNAME}:9000/admin.html\n  * https://${IP_ADDR}:9000/admin.html\n\nUse a username/password of freebsd/freebsd for first sign in.\n\nWeeNAS uses a self-signed TLS certificate, so you must add an exception for your browser to display the page." 14 $BOX_W
