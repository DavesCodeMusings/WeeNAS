#!/bin/sh
#
# flashmount.sh CREATE|DESTROY CDEV
# Triggered by devd rules to mount a flash drive on /media/MEDIALABEL
# The first parameter ($1) is either CREATE (flash drive inserted) or DESTROY
# (flash drive removed.)
# The second parameter ($2) comes from devd's $cdev and represents the /dev
# path to the device. (e.g. msdosfs/my_music for /dev/msdosfs/my_music.)

# Only continue if there are exactly two parameters passed.
[ $# -eq 2 ] || { echo "Usage: flashmount.sh CREATE|DESTROY CDEV"; exit 1; }

# Chop CDEV's filesystem/label into individual parts.
FSTYPE=$(echo $2 | cut -d/ -f1)
FSLABEL=$(echo $2 | cut -d/ -f2)

# NTFS uses the ntfs-3g command to mount the filesystem. Others use mount.
if [ "$FSTYPE" == "ntfs" ]; then
  MOUNTCMD="ntfs-3g"
else
  MOUNTCMD="mount -t FSTYPE"
fi

# Automatically mount any flash storage, except for MSDOSBOOT. MSDOSBOOT
# is the name of the RPi FreeBSD boot partition, which is on an SD card,
# a removable device that can also trigger devd events.
if [ "$1" == "CREATE" ] && [ "$FSLABEL" != "MSDOSBOOT" ]; then
  mkdir /media/$FSLABEL
  $MOUNTCMD -o ro,noatime /dev/$FSTYPE/$FSLABEL /media/$FSLABEL
elif [ "$1" == "DESTROY" ]; then
  umount -f /media/$FSLABEL ; rmdir /media/$FSLABEL
fi
