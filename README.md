WeeNAS = Raspberry Pi + Flash Drive + FreeBSD + Samba
=====================================================

A project to turn a Raspberry Pi into a tiny Network Attached Storage device.

Major parts of the project are divided into subdirectories as follows:
* install/
  An HTML/JavaScript page to generate the commands needed to turn
  a stock FreeBSD installation into a NAS device.
* api/
  A RESTful API built with Node.js with provisions for user administration.
* admin/
  HTML/Javascript page(s) that call the backend API for day to day
  administration tasks.  (Adding/removing users, password resets, etc.)
* docs/
  The project website and related files.

See the [project site](https://davescodemusings.github.io/WeeNAS/) for
more information.
