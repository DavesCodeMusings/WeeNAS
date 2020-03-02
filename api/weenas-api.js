'use strict';
const fs = require('fs');
const net = require('net');

const socket = '/var/run/weenas.sock';

// Command dictionary
var apiCmdPatternDict = {
  '^new user ([a-z0-9]+)$' : '/root/weenas/defaultpass.sh %1 | smbpasswd -s -a %1',
  '^get users$' : 'awk -F: \'{ if ($3>1001 && $3<32000) print $1 }\' /etc/passwd',
  '^get user ([a-z0-9]+)$' : 'grep ^%1: /etc/passwd',
  '^set user ([a-z0-9]+) locked$' : 'smbpasswd -d %1',
  '^set user ([a-z0-9]+) unlocked$' : 'smbpasswd -e %1',
  '^set user ([a-z0-9]+) default-passwd$' : '/root/weenas/defaultpass.sh %1 | smbpasswd -s %1',
  '^del user ([a-z0-9]+)$' : 'smbpasswd -x %1',
  '^get datetime$' : 'date -Iminutes',
  '^set datetime (20[0-9][0-9]-(?:0[1-9]|1[0-2])-(?:0[1-9]|1[0-9]|3[0-1])T(?:[0-1][0-9]|2[0-3]):[0-5][0-9])$' : 'date -Iminutes %1',
  '^get timezone$' : 'ls -l localtime | awk \'{ print $NF }\' | sed \'s|/usr/share/zoneinfo/||\'',
  '^set timezone ([A-Za-z]+/[A-Za-z]+)' : 'ln -s /usr/share/zoneinfo/%1 /etc/localtime',
  '^get disks$': 'sysctl -n kern.geom.conftxt | grep DISK',
  '^get disk (da[0-9]|mmcsd0)$': 'sysctl -n kern.geom.conftxt | grep %1 | grep PART',
  '^get disk (da[0-9]|mmcsd0) part ([0-9])$': 'sysctl -n kern.geom.conftxt | grep %1p%2',
  '^get disk (da[0-9]|mmcsd0) part ([0-9]) filesystem$': 'fstyp -l /dev/%1p%2 | awk \'{ print $1 }\'',
  '^get disk (da[0-9]|mmcsd0) part ([0-9]) label$': 'fstyp -l /dev/%1p%2 | awk \'{ print $2 }\''
};

// Parse and validate the command string sent in this format:
// operation resource [identifier] [key=value]
function parse(apiCmd) {
  let result = 'SYNTAX ERROR.';  // Assume the worst.
  let shellCmd = '';
  apiCmd = apiCmd.toString();

  // Parse user input by looping through available commands until a regex matches.
  for (var cmdPattern in apiCmdPatternDict) {
    if (apiCmd.match(cmdPattern)) {

      // Apply the matching regex pattern to the user input to capture group matches.
      let cmdPatternRegEx = new RegExp(cmdPattern);
      let match = cmdPatternRegEx.exec(apiCmd);
      console.log(stamp('Received: ' + apiCmd));

      // Substitute regex group matches into shell command %1 and %2 place holders.
      shellCmd = apiCmdPatternDict[cmdPattern];
      if (match[1]) shellCmd = shellCmd.replace(/%1/g, match[1]);
      if (match[2]) shellCmd = shellCmd.replace(/%2/g, match[2]);
      console.log(stamp('Running: ' + shellCmd));
      
       result = 'OK.';
    }
  }

  return result;
}

// ISO date-time stamp for logging.
function stamp(msg) {
  var d = new Date();
  return d.toISOString() + ' ' + msg;
}

// Create a Unix-domain IPC server to receive and execute commands.
const server = net.createServer((c) => {
  console.log(stamp('Client connect.'));
  c.write('READY.\n> ');

  // Send anything received to the command parser.
  c.on('data', (d) => {
    if (d.slice(-1) == '\n') d = d.slice(0, -1);  // like Perl chomp()
    let response = parse(d);
    c.write(response + '\n> ');
  });

  c.on('end', () => {
    console.log(stamp('Client disconnect.'));
  });
});

// Start listening on a socket restricted to user:group.
server.listen(socket, () => {
  fs.chmod(socket, 0o660, (e) => {
    if (e) throw e;
  });
  console.log(stamp('Server listening on: ' + socket));
});

// Error handler (specifically for stale socket due to unclean shutdown.)
server.on('error', (e) => {
  if (e.code == 'EADDRINUSE')
    console.error('Stale socket detected. Remove ' + e.address + ' and try again.'
);
  else throw e;
});

// Catch SIGINT and SIGTERM in order to exit cleanly.
function sigHandler(s) {
  if (s == 'SIGINT' || s == 'SIGTERM') {
    console.log(stamp('Caught signal: ' + s + '.')); 
    process.exit(0);
  }
}
process.on('SIGINT', sigHandler);
process.on('SIGTERM', sigHandler);

// Clean up socket on exit.
process.on('exit', (c) => {
  console.log(stamp('Server shutdown.'));
  fs.unlink(socket, (e) => {
    console.error(stamp('Unable to remove socket ' + socket));
  });
});
