weenas-api
==========
The API is intended to let users in the wheel group perform common operations
without having to su to root.

The current state of the API
----------------------------
The API is functional, but not polished.
Before using it you must install Node.js with 'pkg install node-13'.
You can then start the API, as root, with 'node weenas-api.js'.
A unix socket is created  as /ver/run/weenas.sock
Client connections are done with netcat, 'nc -U /var/run/weenas.sock'.
Most commands in the apiCmdDict are working and give valid output.

Plans for the near future
-------------------------
Further testing of API commands.
JSON-ify stdout result of commands.
Look into feasibility of quota management via API.
Look into detecting unused flash drives and assigning to storage.

Plans for the distant future
----------------------------
Make all filesystem socket API calls available via HTTP REST interface.
Make HTTP a configurable option (perhaps cmdline switch.)
Secure HTTP with SSL/TLS and require authentication.
Make installing WeeNAS as easy as a scripted install of Node.js and the
API, then using an admin web page to do the rest.