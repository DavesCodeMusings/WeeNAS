#!/bin/sh

echo -n "Checking root privileges. "
if [ "$(id -u)" == "0" ]; then
  echo "OK."
else
  echo "Sorry, Charlie. You must be root to run the install script."
  exit 1
fi

# Set shell scripts to executable. (.zip files don't store the x perms.)
find . -name '*.sh' | xargs chmod +x

# Discover USB flash drive.
DEVICE=da0
geom disk status $DEVICE >/dev/null 2>&1
if [ "$?" != "0" ]; then
  echo "No USB mass storage device detected. Exiting installation."
  exit 2
fi

# Confirm formatting for FreeBSD.
echo
echo "The following USB mass storage device was detected:"
geom disk list $DEVICE | egrep 'Name|Mediasize|descr' | sed 's/^[0-9]\./  /'
if [ "$(gpart show $DEVICE | grep freebsd)" != "" ]; then
  echo
  echo "   There is an existing FreeBSD partition on this device."
fi
echo
echo "Do you wish to format this device and use it for WeeNAS home drives?"
echo -n "ALL DATA CURRENTLY ON THE DEVICE WILL BE LOST [y/N]? "
read OVERWRITE
if [ "$OVERWRITE" == "y" ] || [ "$OVERWRITE" == "Y" ]; then
  echo "Preparing $DEVICE for WeeNAS home drives."
  gpart destroy -F $DEVICE
  gpart create -s GPT $DEVICE
  gpart add -t freebsd-ufs $DEVICE
  newfs -j -L homefs /dev/${DEVICE}p1
else
  echo -n "Continue installation without formatting device [y/N]?"
  read CONTINUE
  if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
    echo "Exiting installation."
    exit 3
  fi
fi

# Configure time sync.
sysrc ntpd_enable="YES"
sysrc ntpd_sync_on_start="YES"
ln -s /usr/share/zoneinfo/Etc/GMT /etc/localtime
service ntpd start

# Respond "yes" to all pkg prompts.
export ASSUME_ALWAYS_YES=TRUE

# Install packages.
echo "Installing pkg tool..."
pkg update

echo "Installing Samba..."
pkg install samba410

echo "Installing Node.js..."
pkg install node

# Copy boilerplate Samba config file if needed.
if ! [ -f /usr/local/etc/smb4.conf ]; then
  echo "Configure Samba..."
  cp etc/smb4.conf /usr/local/etc/
else
  echo "Preserving existing Samba configuration."
fi

# Enable and start services.
sysrc samba_server_enable="YES"
service samba_server start

echo "Installing WeeNAS API service..."
install -o0 -g0 -m755 etc/rc.d/weenas_api /usr/local/etc/rc.d
sysrc weenas_api_enable="YES"
sysrc weenas_api_home="$(pwd)"
sysrc weenas_api_port="9000"
service weenas_api start

# Append home filesystem to /etc/fstab to be used later.
if [ "$(grep homefs /etc/fstab)" == "" ]; then
  echo "/dev/ufs/homefs   /home   ufs   rw,noatime   1   2" >> /etc/fstab
fi

# Add a shared group.
if [ "$(grep shared /etc/group)" == "" ]; then
  pw groupadd shared -g 1000
fi

# Finish.
IP="$(ifconfig ue0 | awk '/inet/ { print $2 }')"
echo "Open a web browser to http://${IP}:9000 to finish configuring the system."
