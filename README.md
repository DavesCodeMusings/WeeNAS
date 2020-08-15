# WeeNAS

In this directory you will find:
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
