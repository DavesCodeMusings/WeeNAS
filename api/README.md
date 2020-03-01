weenas-api
==========
The API is intended to let users in the wheel group perform common operations
without having to su to root.

The current stated of the API
-----------------------------
The API is not finished.
Before using it you must install Node.js with 'pkg install node-13'.
You can then start the API, as root, with 'node weenas-api.js'.
Client connections are done with netcat, 'nc -U /var/run/weenas.sock'.
Commands parse, but do not yet execute, instead logging to stdout.
All commands in the apiCmdPatternDict give valid, runable output.

Plans for the near future
-------------------------
Get the basic user commands executing via the API socket.
Add commands to set time and timezone.
Look into feasibility of quota management.

Plans for the distant future
----------------------------
Make all filesystem socket API calls available via HTTP REST interface.
Make HTTP a configurable option (perhaps cmdline switch.)
Secure HTTP with SSL/TLS and require authentication.