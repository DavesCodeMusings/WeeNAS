'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const http = require('http');
const childProcess = require('child_process');

const socket = '/var/run/weenas.sock';
const port = process.argv[2];  // TCP port to listen on, if given, otherwise unix socket only
const ESYNTAX = 'SYNTAX ERROR.';

// Command Dictionary
var apiCmdDict = {
  '^new user ([a-z0-9]+)$' : './lib/defaultpass.sh %1 | smbpasswd -s -a %1',
  '^get users$' : 'awk -F: \'BEGIN { printf "[ " } { if ($3>1001 && $3<32000) printf "%s\\"%s\\"", ($3==1002)?"":", ", $1 } END { printf " ]\\n" }\' /etc/passwd',
  '^get user ([a-z0-9]+)$' : 'grep ^%1: /etc/passwd | awk  -F: \'{ printf "[ \\"%s\\", \\"%s\\", \\"%s\\", \\"%s\\", \\"%s\\", \\"%s\\", \\"%s\\" ]\\n", $1, $2, $3, $4, $5, $6, $7 }\'',
  '^get user ([a-z0-9]+) uid$' : 'awk -F: \'/^%1:/ { printf "\\"%s\\"", $3 }\' /etc/passwd',
  '^get user ([a-z0-9]+) gid$' : 'awk -F: \'/^%1:/ { printf "\\"%s\\"", $4 }\' /etc/passwd',
  '^get user ([a-z0-9]+) gecos$' : 'awk -F: \'/^%1:/ { printf "\\"%s\\"", $5 }\' /etc/passwd',
  '^get user ([a-z0-9]+) home$' : 'awk -F: \'/^%1:/ { printf "\\"%s\\"", $6 }\' /etc/passwd',
  '^get user ([a-z0-9]+) shell$' : 'awk -F: \'/^%1:/ { printf "\\"%s\\"", $7 }\' /etc/passwd',
  '^set user ([a-z0-9]+) disabled$' : 'smbpasswd -d %1',
  '^set user ([a-z0-9]+) enabled$' : 'smbpasswd -e %1',
  '^set user ([a-z0-9]+) default password$' : './lib/defaultpass.sh %1 | smbpasswd -s %1',
  '^del user ([a-z0-9]+)$' : 'smbpasswd -x %1',
  '^get datetime$' : 'echo "\\"$(date -Iminutes)\\""',
  '^set datetime (20[0-9][0-9]-(?:0[1-9]|1[0-2])-(?:0[1-9]|1[0-9]|3[0-1])T(?:[0-1][0-9]|2[0-3]):[0-5][0-9])$' : 'date -Iminutes %1',
  '^get timezone$' : 'readlink /etc/localtime | sed -E \'s/\\/usr\\/share\\/zoneinfo\\/(.*)/"\\1"/\'',
  '^set timezone ([A-Za-z]+/[A-Za-z]+)' : 'ln -s /usr/share/zoneinfo/%1 /etc/localtime',
  '^get disks$': 'sysctl -n kern.geom.conftxt | awk \'BEGIN { i=0; printf "[ " } /DISK/ { printf "%s\\"%s\\"", (++i==1)?"":", ", $3 } END { printf " ]" }\'',
  '^get disk (da[0-9])$' : 'dmesg | grep %1: | sed \'s/%1: //\'',
  '^get disk (da[0-9]) iostats$' : 'iostat -d -x | awk \'/^device|^%1/\'',
  '^get disk (da[0-9]) iostat krs$' : 'iostat -d -x | awk \'/^%1/ { print $4 }\'',
  '^get disk (da[0-9]) iostat kws$' : 'iostat -d -x | awk \'/^%1/ { print $5 }\'',
  '^get disk (da[0-9]) size$': 'sysctl -n kern.geom.conftxt | awk \'/DISK %1/ { print $4 }\'',
  '^get disk (da[0-9]) partitions$': 'sysctl -n kern.geom.conftxt | awk \'/PART %1/ { print $3 }\'',
  '^get disk (da[0-9])p([0-9])$' : 'sysctl -n kern.geom.conftxt | awk \'/%1p%2/ { print $4 " " $11 " " $13 }\'',
  '^get disk (da[0-9])p([0-9]) size$': 'sysctl -n kern.geom.conftxt | awk \'/PART %1p%2/ { print $4 }\'',
  '^get disk (da[0-9])p([0-9]) type$': 'sysctl -n kern.geom.conftxt | awk \'/PART %1p%2/ { print $11 }\'',
  '^get disk (da[0-9])p([0-9]) filesystem$': 'sysctl -n kern.geom.conftxt | awk -F\'[ /]\' \'/PART %1p%2/ { getline; print $3 }\'',  
  '^get disk (da[0-9])p([0-9]) filesystem label$': 'sysctl -n kern.geom.conftxt | awk -F\'[ /]\' \'/PART %1p%2/ { getline; print $4 }\'',
  '^get filesystems$' : 'df -h | awk \'/^\\/dev|Filesystem/\'',
  '^get filesystems ufs$' : 'df -h | awk \'/^\\/dev\\/ufs/\'',
  '^get filesystem ufs ([a-z]+)$' : 'df -h | awk \'/^\\/dev\\/ufs\\/%1/\'',
  '^get filesystem ufs ([a-z]+) size$' : 'df -h | awk \'/^\\/dev\\/ufs\\/%1/ { print $2 }\'',
  '^get filesystem ufs ([a-z]+) used$' : 'df -h | awk \'/^\\/dev\\/ufs\\/%1/ { print $3 }\'',
  '^get filesystem ufs ([a-z]+) available$' : 'df -h | awk \'/^\\/dev\\/ufs\\/%1/ { print $4 }\'',
  '^get filesystem ufs ([a-z]+) capacity$' : 'df -h | awk \'/^\\/dev\\/ufs\\/%1/ { print $5 }\'',
  '^get filesystem ufs ([a-z]+) mountpoint$' : 'df -h | awk \'/^\\/dev\\/ufs\\/%1/ { print $6 }\'',
  '^get system$' : 'sysctl -n hw.model | awk \'{ print $1 " " $2 }\'',
  '^get system cpu cores$' : 'sysctl -n hw.ncpu',
  '^get system cpu speed$' : 'sysctl -n dev.cpu.0.freq',
  '^get system cpu iostats$' : 'iostat -C -x | awk \'FNR == 2; FNR ==3 { gsub("-", " "); print $0; }\'',
  '^get system cpu iostat idle$' : 'iostat -x -C | awk \'FNR == 3 { print $5 }\'',
  '^get system cpu temperature$' : 'sysctl -n dev.cpu.0.temperature',
  '^get system load$' : 'sysctl -n vm.loadavg | awk \'{ printf "[ %s, %s, %s ]\\n", $2, $3, $4 } \'',
  '^get system memory available$' : 'sysctl -n hw.physmem',
  '^get system memory installed$' : 'printf "\\"%1.f GB\\"\\n" $(echo "scale=2; $(sysctl -n hw.physmem) / 1073741824" | bc)',
  '^get system memory user$' : 'sysctl -n hw.usermem',
  '^get system memory free$' : 'sysctl -a vm.vmtotal | awk \'/Free Memory/{ print $3 }\'',
  '^get system top' : 'top -bt'
};

// REST verb to API verb dictionary
var restMethodDict = {
  'GET' : 'get',
  'PUT' : 'set',
  'POST' : 'new',
  'DELETE' : 'del'
}

// A minimal file extention to MIME type dictionary.
var mimeTypeDict = {
  'css' : 'text/css',
  'html' : 'text/html',
  'ico' : 'image/x-icon',
  'js' : 'text/javascript'
}

// Parse and validate the command string sent in this format:
// operation resource [identifier] [value]
function parse(input) {
  let result = ESYNTAX;  // Assume the worst.
  let shellCmd = '';

  // Parse user input by looping through available commands until a regex matches.
  for (var cmdPattern in apiCmdDict) {
    if (input.match(cmdPattern)) {

      // Apply the matching regex pattern to the user input to capture group matches.
      let cmdPatternRegEx = new RegExp(cmdPattern);
      let match = cmdPatternRegEx.exec(input);
      console.log(stamp('Received: ' + input));

      // Substitute regex group matches into shell command %1 and %2 place holders.
      shellCmd = apiCmdDict[cmdPattern];
      if (match[1]) shellCmd = shellCmd.replace(/%1/g, match[1]);
      if (match[2]) shellCmd = shellCmd.replace(/%2/g, match[2]);
      console.log(stamp('Running: ' + shellCmd));

      // Run the shell command, capturing stdout.
      result = childProcess.execSync(shellCmd, { cwd: __dirname });
      if (result.slice(-1) == '\n') result = result.slice(0, -1);  // like Perl chomp()
    }
  }

  return result;
}

// ISO date-time stamp for logging.
function stamp(msg) {
  var d = new Date();
  return d.toISOString() + ' ' + msg;
}

// Create a Unix-domain API server to receive and execute commands.
const server = net.createServer((c) => {
  console.log(stamp('Client connect.'));
  c.write('READY.\n> ');

  // Send anything received to the command parser.
  c.on('data', (d) => {
    if (d.slice(-1) == '\n') d = d.slice(0, -1);  // like Perl chomp()
    let response = parse(d.toString());
    c.write(response + '\n> ');
  });

  c.on('end', () => {
    console.log(stamp('Client disconnect.'));
  });
});

// Start listening on a unix socket restricted to user:group.
server.listen(socket, () => {
  fs.chmod(socket, 0o660, (e) => {
    if (e) throw e;
  });
  console.log(stamp('Server listening on: ' + socket));
});

// Error handler (specifically for stale socket due to unclean shutdown.)
server.on('error', (e) => {
  if (e.code == 'EADDRINUSE')
    console.error('Stale socket detected. Remove ' + e.address + ' and try again.');
  else throw e;
});

// Start listening on a TCP port if a port number was given as a command-line parameter.
if (port) {
  const RESTServer = http.createServer((request, response) => {
    let method = request.method.toString();
    let urlPath = request.url.toString();

    // Serve up an index.html if a blank path was given.
    if (urlPath == '/') urlPath = '/index.html';

    // Check for requests that look like '/page.html'. These are served as static pages.
    // Everything else is processed like an API call.
    let staticFileRegEx = new RegExp(/^\/([A-Za-z0-9]+)\.(html|css|js|ico)$/);  // Matches /file.ext
    let match = staticFileRegEx.exec(urlPath);
    if (method === 'GET' && match !== null) {
      let filePath = path.join(__dirname, 'htdocs' , match[1] + '.' + match[2]);
      if(fs.existsSync(filePath)) {
        console.log(stamp('Serving file: ' + filePath + ' as ' + mimeTypeDict[match[2]]));
        let data = fs.readFileSync(filePath, 'utf-8');
        response.writeHead(200, {'Content-Type': mimeTypeDict[match[2]]});
        response.write(data);
      }
      else {
        response.writeHead(404, {'Content-Type': 'text/plain'});
        response.write('Sorry, Charlie.');          
      }
    }
    else {

      // Replace all forward slashes wih spaces and parse the command using these
      // substitutions for verbs: POST = new, GET = get, PUT = set, DELETE = del.
      let cmd = restMethodDict[method] + urlPath.replace(/\//g, ' ').trimEnd();
      console.log(stamp('REST API: ' + method + ' ' + urlPath + ' => ' + cmd));
      let result = parse(cmd);
      if (result.includes(ESYNTAX) === false) {
        response.writeHead(200, {'Content-Type': 'text/plain'}); 
        response.write(result + '\r\n');
      }
      else {
        response.writeHead(404, {'Content-Type': 'text/plain'});
        response.write('Sorry, Charlie.');
      }
    }
    response.end();
  });
  RESTServer.listen(port, () => {
    console.log(stamp('Server listening on: tcp/' + port));
  });
  RESTServer.on('error', (e) => {
    if (e.code == 'EADDRINUSE')
      console.error('Port ' + port + ' in use. REST API not available.');
    else throw e;
  });
}

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
