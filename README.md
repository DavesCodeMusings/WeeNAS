# WeeNAS
Initial installation consists of these steps:

1. Starting the API.
2. Generating and running a system configuration script.
3. Enjoying your WeeNAS system.

These steps are covered in more detail below.

## Step 1
To get started, run this command as root: 'node weenas.js 9000'.

This will start the WeeNAS API service.  The API will then be accessible from:

* The unix domain socket /var/run/weenas.sock
* The TCP port 9000

To generate the configuration script, point a browser to your Raspberry Pi's
IP address or domain name and specify port 9000.  Like one of these examples:

* http://192.168.0.100:9000
* http://mypi.local:9000

Note: Firefox and Chrome work best. Edge has problems formatting. Other
      browser support is unknown.

## Step 2
Fill in the fields presented by the installer web page. Those marked in yellow
are required.  There are only two of these and second is auto-populated using
information from the first. So, if you're in a hurry, you're done in one.

The rest of the fields are presented so that you may more easily customize the
system from the start rather than later using the admin interface.

Copy the script commands from the output window and run them on your Raspberry
Pi as the root user. The safest way to do this is copying and pasting one
command at a time and taking the time to understand what it's doing. If you're
feeling daring, you may copy them all to an install.sh file on the Pi and run
them all at once with 'sh ./install.sh'.

If you've decided to use a static IP address, you'll need to reboot.

### Important note about storage.
If you have a flash drive plugged in, the WeeNAS install script will overwirte
it. If the script finds a FreeBSD UFS filesystem, it should be preserved.

But, mistakes happen!

Be careful. Either use a factory fresh flash drive or make sure you have a
second copy of the data.

## Step 3
Ongoing administration of WeeNAS may be done using the API or command-line.

To access the API, simply start it with 'node weenas-api.js 9000' and point
your web browser to http://your-pi:9000, with your-pi either being the IP
address or domain name.

To use the API from command-line, first start it without the port number
(i.e 'node weenas-api.js'.) Next, use netcat to communicate with the API
like this: 'nc -U /var/run/weenas.sock'. Use CTRL+C to disconnect.

Those familiar with FreeBSD may also want to administer via the shell.

## About API Commands
The WeeNAS API commands are structured in a verb-noun syntax. The verbs are
simple and consist of only get, set, new, and del.  The noun part consists
of increasingly specific words to describe the resource. For example, disks
refers to any storage devices plugged into the system, while disk da0 refers
to a specific disk.  All output is in JSON format unless the last noun word
is 'raw'. It should also be noted that 'disks', plural, will return a multi-
dimensional array of information, whereas 'disk da0', singular, returns only
a single-dimensional one.

When using a 'set' command, a state value is expected.  For example, 'set
user bob locked'.

The web-based REST API behaves the same way, but verbs are specified by the
HTTP request.  The mapping of verbs is: GET to get, PUT to set, POST to
new, and DELETE to del. The hierarchial noun string is separated by forward
slashes rather than spaces.  For example, the command 'get datetime' becomes
'http://wenas.local:9000/datetime'. The get operation is implied by the HTTP
request.

Operations other than GET cannot be easily performed with a web browser.
Command-line tools like cURL will work, but that defeats the purpose of a
web-based API. AJAX is used to enable those operations. (AJAX is just a
fancy acronym for Asychronous Javascript And XML, except the XML part has
fallenout of fashion and most people prefer plain text or JSON.) This is
how the WeeNAS monitor and administration pages work.

For the definitive list of API commands, see the weenas-api.js source for
apiCmdDict. This shows the commands littered with regex filters specifying
exactly what constitutes a valid command, particularly when it comes to
variables like da0 or da1 for disks, or the account name when specifying a
user.

This added complexity keeps malicious users from doing something like:
'get datetime ; rm -rf /*'. That's called command injection and it can be
very bad, as you can see.

A more human-readable list of commands will be added in the future.