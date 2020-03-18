#!/bin/sh
#
# install_service.sh -- put weenas_api.js under control of the rc system. 
#

# Check for superuser privileges.
[ "$(id -u)" == "0" ] || { echo "Only root may run this script."; exit 1; }

# Prompt for WeeNAS Home.
echo "WeeNAS home:"
echo "What is the full path of the directory where weenas_api.js lives?"
read WEENAS_HOME

# Verify the path.
[ -f "$WEENAS_HOME/weenas_api.js" ] || { echo "Sorry, Charlie. Can't find $WEENAS_HOME/weenas_api.js"; exit 2; }

# Build commands.
INSTALL="install -o0 -g0 -m555 ./weenas_api /usr/local/etc/rc.d"
SYSRC_ENABLE="sysrc weenas_api_enable=YES"
SYSRC_HOME="sysrc weenas_api_home=$WEENAS_HOME"
SYSRC_PORT="sysrc weenas_api_port=9000"

# Review.
echo
echo "The following commands will be executed to install the WeeNAS API service:"
echo $INSTALL
echo $SYSRC_ENABLE
echo $SYSRC_HOME
echo $SYSRC_PORT
echo
echo -n "Proceed with installation [y/N]? "
read PROCEED
[ "$PROCEED" == "y" ] || exit 0;

# Install.
$INSTALL
[ $? -eq 0 ] && echo "Installation successful."
$SYSRC_ENABLE
$SYSRC_HOME
$SYSRC_PORT

