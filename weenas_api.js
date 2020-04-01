#!/usr/bin/env node

/**
 * WeeNAS -- Raspberry Pi + Flash Drive + FreeBSD + Samba
 * @author David Horton https://github.com/DavesCodeMusings/htmlGauges
 */

'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const http = require('http');
const childProcess = require('child_process');

const weenasVersion = '1.0 dev'
const pidFile = '/var/run/' + path.basename(__filename, '.js') + '.pid';
const socket = '/var/run/' + path.basename(__filename, '.js') + '.sock';
const port = process.argv[2];  // TCP port to listen on, if given, otherwise unix socket only.
const ESYNTAX = 'SYNTAX ERROR.';

/**
 * API command look-up with regex filtering. 
 * @type {{apiCmd: string, shellCmd: string}} apiCmdDict
 */
var apiCmdDict = {
  '^get api home$': 'echo "\\"' + __dirname + '\\""',
  '^get users$': '/usr/local/bin/pdbedit -L -v | /usr/bin/awk -F\': *\' \'BEGIN { count=0; printf "{" } /---------------/ { getline; printf "%s\\n  \\"%s\\" : ", (++count==1)?"":",", $2; getline; getline; printf "\\"%s\\"", $2 } END { printf "\\n}" }\'',
  '^get user ([a-z0-9]+)$': '/usr/local/bin/pdbedit -L %1 | /usr/bin/awk -F: \'{ printf "[ \\"%s\\", \\"%s\\", \\"%s\\" ]", $1, $2, $3 }\'',
  '^new user ([a-z0-9]+)$': './lib/defaultpass.sh %1 | /usr/local/bin/smbpasswd -s -a %1',
  '^set user ([a-z0-9]+) disabled$': '/usr/sbin/pw lock %1 && /usr/local/bin/smbpasswd -d %1',
  '^set user ([a-z0-9]+) enabled$': '/usr/sbin/pw unlock %1 && /usr/local/bin/smbpasswd -e %1',
  '^set user ([a-z0-9]+) trusted$': '/usr/sbin/pw usermod %1 -G shared,wheel -s /bin/sh',
  '^set user ([a-z0-9]+) untrusted$': '/usr/sbin/pw usermod %1 -G shared -s /sbin/nologin',
  '^set user ([a-z0-9]+) password default$': './lib/defaultpass.sh %1 | /usr/local/bin/smbpasswd -s %1',
  '^del user ([a-z0-9]+)$': '/usr/local/bin/smbpasswd -x %1',
  '^get os users$': '/usr/bin/awk -F: \'BEGIN { printf "[ " } { if ($3>1001 && $3<32000) printf "%s\\"%s\\"", ($3==1002)?"":", ", $1 } END { printf " ]\\n" }\' /etc/passwd',
  '^get os user ([a-z0-9]+)$': '/usr/bin/awk -F: \'/^%1:/ { for(i=1;i<8;i++) printf "%s\\"%s\\"", (i==1)?"":", ", $i }\' /etc/passwd',
  '^get disks$': 'geom disk list | awk \'BEGIN { printf "{ " } /Name/ { printf "%s\\n  \\"%s\\": { ", (++count==1)?"":",", $3 } /Mediasize/ { printf "\\"size\\": %s, ", $2 } /descr/ { printf "\\"description\\": \\""; for(i=2;i<=NF;i++) printf "%s%s", (i==2)?"":" ", $i; printf "\\" }" } END { printf "\\n}\\n"}\'',
  '^get disk (da[0-9]|mmcsd0)$': 'echo "{" && geom disk list %1 | awk \'/Mediasize/ { printf "  \\"size\\": %s,\\n", $2 } /descr/ { printf "  \\"description\\": \\""; for(i=2;i<=NF;i++) printf "%s%s", (i==2)?"":" ", $i; printf "\\",\\n" }\' && geom part list %1 | awk \'BEGIN { printf "  \\"partitions\\": {" } /Name/ { printf "%s\\n    \\"%s\\": { ", (++count==1)?"":",", $3 } /Mediasize/ { printf "\\"size\\": %s, ", $2 } / type:/ { printf "\\"type\\": \\"%s\\" }", $2 } /Consumers/ { exit } END { printf "\\n  }\\n" }\' && echo "}"',
  '^get disk (da[0-9]|mmcsd0) iostats$': '/usr/sbin/iostat -dx %1 | /usr/bin/awk \'BEGIN { printf "{ " } /^%1/ { printf "\\"krs\\": %s, \\"kws\\": %s, \\"qlen\\": %s", $4, $5, $10 } END { printf " }" }\'',
  '^set disk (da[0-9]) gpt$': '/sbin/gpart destroy -F %1 > /dev/null && /sbin/gpart create -s GPT %1 > /dev/null && /sbin/gpart add -t freebsd-ufs %1 > /dev/null && /sbin/newfs -j /dev/%1p1 > /dev/null && echo "\\"Success\\"" || echo "\\"Failed\\""',
  '^get disk (da[0-9][ps][1-9]|mmcsd0[ps][1-9])$': 'geom label list %1 | awk \'/Name:/ { printf "{ \\"label\\": \\"%s\\", ", $3 } /Mediasize:/ { printf "\\"size\\": %s }\\n", $2  } /Consumers/ { exit }\'',
  '^set disk (da[0-9]p[1-9]) label ([a-z]+)$': '/sbin/tunefs -L %2 /dev/%1 && echo "\\"Success\\"" || echo "\\"Failed\\""',
  '^get filesystems (msdosfs|ufs)': 'ls -1 /dev/%1 | awk \'BEGIN { printf "[ " } { printf "%s\\"%s\\"", (++count==1)?"":", ",  $0 } END { printf " ]\\n" }\'',
  '^set filesystem ufs ([a-zA-Z]+)': 'echo "\\"pretending to mkdir -p /media/%1 && mount /dev/ufs/%1 on /media/%1\\""',
  '^get filesystems mounted$': 'df -m | /usr/bin/awk \'BEGIN { printf "{"; count=0 } /^\\/dev/ { printf "%s\\n  ", (++count==1)?"":","; printf "\\"%s\\": { \\"total\\": %s, \\"used\\": %s, \\"free\\": %s, \\"percent\\": \\"%s\\", \\"mountpoint\\": \\"%s\\" }", $1, $2, $3, $4, $5, $6 } END { printf "\\n}" }\'',
  '^get filesystems mounted (msdosfs|ufs)$': 'df -m | /usr/bin/awk \'BEGIN { printf "{ "; count=0 } /^\\/dev\\/%1/ { printf "%s\\n", (++count==1)?"":", "; printf "[ \\"%s\\", %s, %s, %s, \\"%s\\", \\"%s\\" ]", $1, $2, $3, $4, $5, $6 } END { printf "\\n}" }\'',
  '^get filesystem mounted (msdosfs|ufs) ([a-zA-Z]+)$': 'df -m | /usr/bin/awk \'BEGIN { printf "{ " } /^\\/dev\\/%1\\/%2/ { printf "\\"total\\": %s, \\"used\\": %s, \\"free\\": %s, \\"percent\\": \\"%s\\", \\"mountpoint\\": \\"%s\\"", $2, $3, $4, $5, $6 } END { printf " }" }\'',
  '^get system$': '/sbin/sysctl -n hw.platform | /usr/bin/awk \'{ printf "\\"%s\\"", $0 }\'',
  '^get system cpu$': '/sbin/sysctl -n hw.model | /usr/bin/awk \'{ printf "\\"%s %s\\"", $1, $2 }\'',
  '^get system cpu cores$ ': '/sbin/sysctl -n hw.ncpu',
  '^get system cpu speed$': '/sbin/sysctl -n dev.cpu.0.freq',
  '^get system cpu iostats$': '/usr/sbin/iostat -Cx | /usr/bin/awk \'FNR==3 { gsub("-", " "); printf "{ \\"user\\": %s, \\"nice\\": %s, \\"system\\": %s, \\"interrupt\\": %s, \\"idle\\": %s }", $1, $2, $3, $4, $5; }\'',
  '^get system cpu iostat idle$': '/usr/sbin/iostat -Cx | /usr/bin/awk \'FNR == 3 { printf "%s", $5 }\'',
  '^get system cpu temperature$': 'echo "\\"$(/sbin/sysctl -n dev.cpu.0.temperature)\\""',
  '^get system datetime$': 'echo "\\"$(date -u +%Y-%m-%dT%H:%MZ)\\""',
  '^set system datetime (20[0-9][0-9]-(?:0[1-9]|1[0-2])-(?:0[1-9]|1[0-9]|3[0-1])T(?:[0-1][0-9]|2[0-3]):[0-5][0-9])$': 'echo "\"$(/bin/date -Iminutes %1)\"',
  '^get system timezone$': '/usr/bin/readlink /etc/localtime | sed -E \'s/\\/usr\\/share\\/zoneinfo\\/(.*)/"\\1"/\'',
  '^set system timezone ([A-Za-z]+) ([A-Za-z]+)': '/bin/ln -sf /usr/share/zoneinfo/%1/%2 /etc/localtime',
  '^get system hostname': 'echo "\\"$(/bin/hostname)\\""',
  '^set system hostname ([a-z\\.]+)': '/bin/hostname %1 && sysrc hostname="%1"',
  '^get system load$': '/sbin/sysctl -n vm.loadavg | /usr/bin/awk \'{ printf "[ %s, %s, %s ]\\n", $2, $3, $4 } \'',
  '^get system log cron raw$': '/usr/bin/tail -n1000 /var/log/cron',
  '^get system log messages raw$': '/usr/bin/tail -n1000 /var/log/messages',
  '^get system log nmbd raw$': '/usr/bin/tail -n1000 /var/log/samba4/log.nmbd',
  '^get system log smbd raw$': '/usr/bin/tail -n1000 /var/log/samba4/log.smbd',
  '^get system log weenas raw$': '/usr/bin/tail -n1000 /var/log/weenas_api.log',
  '^get system mail raw$': 'mailx -H || echo "No mail."',
  '^get system mail ([0-9]+) raw$': 'echo "%1" | mailx -N',
  '^del system mail ([0-9]+)$': 'echo "d%1" | mailx -N', 
  '^get system memory nameplate$': 'printf "\\"%1.fG\\"\\n" $(echo "scale=2; $(/sbin/sysctl -n hw.physmem) / 1073741824" | bc)',
  '^get system memory usable$': '/sbin/sysctl -n hw.physmem',
  '^get system memory user$': '/sbin/sysctl -n hw.usermem',
  '^get system memory free$': 'echo "$(/sbin/sysctl -n vm.stats.vm.v_free_count) * $(/sbin/sysctl -n vm.stats.vm.v_page_size)" | bc',
  '^get system service (ntpd|samba_server)$': 'echo "\\"$(/usr/sbin/service %1 status | tr "\n" " ")\\""',
  '^get system top$': '/usr/bin/top -bt | /usr/bin/awk \'BEGIN { count=0; print "[" } { printf "%s\\"%s\\"", (++count==1)?"":",\\n", $0 } END { printf "\\n]" }\'',
  '^get system top raw$': '/usr/bin/top -bt'
};

/**
 * REST verb to API verb look-up
 * @type {{restVerb: string, apiVerb: string}} restVerbDict
 */
var restVerbDict = {
  'GET': 'get',
  'PUT': 'set',
  'POST': 'new',
  'DELETE': 'del'
}

/**
 *  A minimal file extention to MIME type dictionary.
 * @type {{fileExtension: string, mimeType: string}} restVerbDict
 */
var mimeTypeDict = {
  'css': 'text/css',
  'html': 'text/html',
  'ico': 'image/x-icon',
  'js': 'text/javascript'
}

/**
* Add an ISO date-time stamp to any messages being logged.
* @param {string} msg  The text to be logged.
* @returns {string} msg with current ISO date-time prepended.
*/
function stamp(msg) {
  var d = new Date();
  return d.toISOString() + ' ' + msg;
}

/**
 * Parse and validate the api command string. If it passes muster, run the matching shell command. 
 * @param {string} input  The api command string.
 * @returns {string}  stdout from the shell command.
 */
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
      try {
        result = childProcess.execSync(shellCmd, { cwd: __dirname });
      }
      catch {
        result = 'Oops! ' + result;
      }
      if (result.slice(-1) == '\n') result = result.slice(0, -1);  // like Perl chomp()
    }
  }
  return result;
}

// Log information about this process.
console.log ('WeeNAS version ' + weenasVersion + '\nCopyright (c)2020 David Horton https://davescodemusings.github.io/WeeNAS/');
if (pidFile) {
  fs.writeFile(pidFile, process.pid, (e) => {
    if (!e) console.log(stamp('PID ' + process.pid + ' written to ' + pidFile));
    else console.log(stamp(pidFlie + ' is stale. Don\'t trust it. Actual PID is: ' + process.pid));
  });
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
      let filePath = path.join(__dirname, 'htdocs', match[1] + '.' + match[2]);
      if (fs.existsSync(filePath)) {
        console.log(stamp('Serving file: ' + filePath + ' as ' + mimeTypeDict[match[2]]));
        let data = fs.readFileSync(filePath, 'utf-8');
        response.writeHead(200, { 'Content-Type': mimeTypeDict[match[2]] + '; charset=utf-8' });
        response.write(data);
      }
      else {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.write('Sorry, Charlie.');
      }
    }
    else {

      // Replace all forward slashes wih spaces and parse the command using these
      // substitutions for verbs: POST = new, GET = get, PUT = set, DELETE = del.
      let cmd = restVerbDict[method] + urlPath.replace(/\//g, ' ').trimEnd();
      console.log(stamp('REST API: ' + method + ' ' + urlPath));
      let result = parse(cmd);
      if (result.includes(ESYNTAX) === false) {
        response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.write(result + '\r\n');
      }
      else {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
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

/**
 * Log any caught SIGINT and SIGTERM signals and exit cleanly.
 * @param {string} s  The signal name that was caught.
 */
function sigHandler(s) {
  console.log(stamp('Caught signal: ' + s + '.'));
  if (s == 'SIGINT' || s == 'SIGTERM') {
    process.exit(0);
  }
}
process.on('SIGINT', sigHandler);
process.on('SIGTERM', sigHandler);

// Clean up socket on exit.
process.on('exit', (c) => {
  console.log(stamp('Server shutdown.'));
  fs.unlink(socket, (e) => {
    console.error(stamp('Unable to remove ' + socket));
  });
  fs.unlink(pidFile, (e) => {
    console.error(stamp('Unable to remove ' + pidFile));
  });
});
