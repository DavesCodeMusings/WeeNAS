lib

This is where helper scripts are kept. Most are for doing scripted things
with Samba.

* defaultpass.sh - generates initial passwords.
* smbuseradd.sh - add a FreeBSD account when a new Samba account is added.
* smbuserdel.sh - delete the FreeBSD account when the Samba account is deleted.

defaultpass.sh is referenced by the api call 'set user <name> default password'
The smbuseradd/del scripts are referenced in the Samba config file (smb4.conf) 
