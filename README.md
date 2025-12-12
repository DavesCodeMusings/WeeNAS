# WeeNAS
**WeeNAS is no longer maintained.** I have focused my home NAS efforts on my [CloudPi](https://github.com/DavesCodeMusings/CloudPi) and [NüCloud](https://github.com/DavesCodeMusings/nucloud/blob/main/README.md) projects instead.

## What it was
WeeNAS started out as a web-based utility to manage a Raspberry Pi running FreeBSD and Samba. The goal was file sharing on a home network using cheaper hardware than what is required for the popular (and infinitely more robust) FreeNAS. It centers mainly around an API written in Node.js. It does not use Express. I decided to build that functionality myself as a learning experience. It also includes a text-based installer and user add utility built around the [dialog](https://linux.die.net/man/1/dialog) program to give a clean, professional, semi-GUI look to it.

## Why I gave it up
The software works for installing and monitoring a small NAS on FreeBSD 12. However, I did not get around to adding functions to create and manage user accounts throught the API.

FreeBSD on the Pi turned out to be a bit of a challenge running in headless mode (no monitor and keyboard.) Every so often I would find the system had restarted due to a power outage and was no longer responsive. I suspected fsck was waiting for user input during boot, but not having a monitor made this extremely difficult and frustrating to troubleshoot. Around the same time, I also discovered NextCloud.

## What's here
* client/       Windows batch files
* docs/         Installation instructions and screenshots
* etc/          Configuration files
* lib/          Files used by WeeNAS
* libexec/      WeeNAS API program
* share/        Web-based admin tool 
* install.sh    Guided install script
* License.txt   Terms for edistribution

For first-time installation, run install.sh from this directory as follows:

sh ./install.sh

This will install neccessary components using the FreeBSD pkg system and also
configure weenas_api.js as a system service.

Once installation is complete, administration is done from a web browser. Just
go to the hostname or IP address at port 9000.  Like this:

http://[hostname or IP]:9000
