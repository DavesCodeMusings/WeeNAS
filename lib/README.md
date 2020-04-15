lib/

This is where helper scripts are kept. Most are for doing scripted things
with Samba.

* randompass.sh - generates random initial passwords.
* smbuseradd.sh - add a FreeBSD account when a new Samba account is added.
* smbuserdel.sh - delete the FreeBSD account when the Samba account is deleted.

randompass.sh is used in the api call to set up new users.
The smbuseradd/del scripts are referenced in the Samba config file (smb4.conf) 
