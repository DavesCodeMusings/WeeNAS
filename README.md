# WeeNAS
WeeNAS = Raspberry Pi + Flash Drive + FreeBSD + Samba
=====================================================

The play on the FreeNAS name is intentional.  FreeNAS is an incredibly robust
open-source network-attached storage software distribution based on FreeBSD
and OpenZFS.  It also has correspondingly robust system requirements, and that
in turn drives up the cost.

WeeNAS, on the other hand, eschews all that fancy, high-performance hardware
required for ZFS.  WeeNAS is designed to run on a Raspberry Pi 2 and uses a
UFS filesystem on a common USB flash drive for storage.

Comparison to FreeNAS
---------------------
Is WeeNAS faster?  No.
Is WeeNAS more fault tollerant?  No.
Should you entrust your most precious files to WeeNAS?  No.

So what is WeeNAS good for?
---------------------------
WeeNAS is basically a network attached flash drive.  Use it like a flash drive.
Plus, it's fun to say.

Personally, I created WeeNAS as a way to keep a second copy of the documents
and other files I have on my PC.  The hardware is so inexpensive, I'm seriously
considering building another, identical system with a scheduled rsync between
them.

In other words, I'm banking on having multiple copies of my important files
in case something goes sideway, rather than a single copy on a single super
robust system.

What's this project about?
--------------------------
The purpose of the WeeNAS project is to make it easier to install and maintain
the parts making up the WeeNAS system.

* First, is an HTML5/JavaScript page that will generate an install script.
* Next, is a Node.js-based API and corresponding HTML5/JS for system management.

In the end, my goal is to have WeeNAS not require fiddling around on the
command-line for anything but the initial install.

Progress
--------
So far, part one, the auto-generated install script is partially complete.
The API is but a dream.

License and Legal
-----------------
I am releasing the code associated with WeeNAS into the PUBLIC DOMAIN in the
hope that it will be useful to others.  There is no warranty, nor is there any
guaranty that WeeNAS is fit for any particular purpose.  You should always
maintain multiple backups of your important data.  If using WeeNAS results in
the loss of data, do not come crying to me.  You have been warned.

