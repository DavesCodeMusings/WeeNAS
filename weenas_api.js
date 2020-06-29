#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const crypto = require('crypto');

const weenasVersion = '0.1 dev'
const pidFile = path.join('/var/run', path.basename(__filename, '.js') + '.pid');
const port = 9000;
const EGENERIC = "Sorry, Charlie.";

// Log to stdout with a date stamp.
function log(message) {
  let date = new Date;
  console.log(date.toISOString() + ' ' + message);
}

// Signal handlers for shutdown.
function sigHandler(signal) {
  log(`Caught signal: ${signal}.`);
  if (signal == 'SIGINT' || signal == 'SIGTERM') {
    process.exit(0);
  }
}
process.on('SIGINT', sigHandler);
process.on('SIGTERM', sigHandler);

process.on('exit', () => {
  log('Server shutdown.');
});

// Log startup information.
console.log (`WeeNAS version ${weenasVersion}\nCopyright (c)2020 David Horton https://davescodemusings.github.io/WeeNAS/`);
if (pidFile) {
  fs.writeFile(pidFile, process.pid, (error) => {
    if (!error) log(`PID ${process.pid} written to ${pidFile}`);
    else log(`${pidFile} is stale. Don\'t trust it. Actual PID is: ${process.pid}`);
  });
}


// Prepare for secure web server start up by fetching the SSL certificate and key. 
const httpsOptions = {
  cert: '',
  key: ''
};
try {
  httpsOptions.cert = fs.readFileSync(path.join(__dirname, 'cert', 'weenas.cer'));
}
catch {
  log('Unable to read SSL cert.');
  process.exit(2);
}
try {
  httpsOptions.key = fs.readFileSync(path.join(__dirname, 'cert', 'weenas.key'));
}
catch {
  log('Unable to read SSL private key.');
  process.exit(2);
}

// Serve only alpha (with underscore or dash) filenames with extensions of css, html, js, ico, or txt.
const filenameRegex = /^\/[A-Za-z_-]+\.(?:css|html|js|ico|txt)/;

// MIME types sent with the content header for the few filetypes served.
const mimeTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "application/javascript",
  ".ico": "image/x-icon",
  ".txt": "text/plain"
}

// A list of URLs and the log files they refer to lets them be served as 'text/plain' static files.
const logRedirects = {
  "/system/log/cron": "/var/log/cron",
  "/system/log/messages": "/var/log/messages",
  "/system/log/nmbd": "/var/log/samba4/log.nmbd",
  "/system/log/smbd": "/var/log/samba4/log.smbd",
  "/system/log/weenas_api": "/var/log/weenas_api.log"
};

// Mapping HTTP verbs to API verbs.
var apiVerbDict = {
  'GET': 'get',
  'PUT': 'set',
  'POST': 'new',
  'DELETE': 'del'
}

// API commands and their corresponding shell commands.
var apiCmdDict = {
  '^set echo (.*)$': './lib/echo.sh %1',
  '^get api home$': 'echo "\\"' + __dirname + '\\""',
  '^get users$': '/usr/bin/awk -F: \'BEGIN { printf "[ " } { if ($3>1000 && $3<32000) printf "%s\\"%s\\"", ($3==1001)?"":", ", $1 } END { printf " ]\\n" }\' /etc/passwd',
  '^get user ([a-z0-9]+)$': 'echo "{" ; pw user show %1 | awk -F: \'{ printf "  \\"locked\\": %i,\\n", ($2 ~ /LOCKED/) }\' ; pdbedit -w -u %1 | awk -F: \'{ printf "  \\"samba\\": %i,\\n", ($5 !~ /D/) }\' ; pw user show %1 | awk -F: \'{ printf "  \\"shell\\": %i,\\n", ($10 !~ /nologin/) }\' ; groups %1 | awk \'{ printf "  \\"wheel\\": %i\\n", ($0 ~ /wheel/) }\' ; echo "}"',
  '^new user ([a-z0-9]+)$': './lib/smbuseradd.sh %1',
  '^del user ([a-z0-9]+)$': './lib/smbuserdel.sh %1',
  '^set user ([a-z0-9]+) locked$': 'pw lock %1 ; smbpasswd -d %1 ; pw usermod %1 -s /sbin/nologin ; pw groupmod wheel -d %1',
  '^set user ([a-z0-9]+) unlocked$': 'pw unlock %1',
  '^set user ([a-z0-9]+) samba$': 'smbpasswd -e %1',
  '^set user ([a-z0-9]+) nosamba$': 'smbpasswd -d %1',
  '^set user ([a-z0-9]+) shell$': 'pw usermod %1 -s /bin/sh',
  '^set user ([a-z0-9]+) nologin$': 'pw usermod %1 -s /sbin/nologin',
  '^set user ([a-z0-9]+) admin$': 'pw groupmod wheel -m %1',
  '^set user ([a-z0-9]+) regular$': 'pw groupmod wheel -d %1',
  '^set user ([a-z0-9]+) smbpasswd$': './lib/smbpasswd.sh %1',
  '^get users smb$': '/usr/local/bin/pdbedit -L -v | /usr/bin/awk -F\': *\' \'BEGIN { count=0; printf "{" } /---------------/ { getline; printf "%s\\n  \\"%s\\" : ", (++count==1)?"":",", $2; getline; getline; printf "\\"%s\\"", $2 } END { printf "\\n}" }\'',
  '^get user smb ([a-z0-9]+)$': '/usr/local/bin/pdbedit -u %1 | /usr/bin/awk -F: \'{ printf "[ \\"%s\\", \\"%s\\", \\"%s\\" ]", $1, $2, $3 }\'',
  '^get disks$': 'geom disk list | awk \'BEGIN { printf "{ " } /Name/ { printf "%s\\n  \\"%s\\": { ", (++count==1)?"":",", $3 } /Mediasize/ { printf "\\"size\\": %s, ", $2 } /descr/ { printf "\\"description\\": \\""; for(i=2;i<=NF;i++) printf "%s%s", (i==2)?"":" ", $i; printf "\\" }" } END { printf "\\n}\\n"}\'',
  '^get disk (da[0-9]|mmcsd0)$': 'echo "{" && geom disk list %1 | awk \'/Mediasize/ { printf "  \\"size\\": %s,\\n", $2 } /descr/ { printf "  \\"description\\": \\""; for(i=2;i<=NF;i++) printf "%s%s", (i==2)?"":" ", $i; printf "\\",\\n" }\' && geom part list %1 | awk \'BEGIN { printf "  \\"partitions\\": {" } /Name/ { printf "%s\\n    \\"%s\\": { ", (++count==1)?"":",", $3 } /Mediasize/ { printf "\\"size\\": %s, ", $2 } / type:/ { printf "\\"type\\": \\"%s\\" }", $2 } /Consumers/ { exit } END { printf "\\n  }\\n" }\' && echo "}"',
  '^get disk (da[0-9]|mmcsd0) iostats$': '/usr/sbin/iostat -dx %1 | /usr/bin/awk \'BEGIN { printf "{ " } /^%1/ { printf "\\"krs\\": %s, \\"kws\\": %s, \\"qlen\\": %s", $4, $5, $10 } END { printf " }" }\'',
  '^set disk (da[0-9]) freebsd ([a-z]+)$': '/sbin/gpart destroy -F %1 > /dev/null && /sbin/gpart create -s GPT %1 > /dev/null && /sbin/gpart add -t freebsd-ufs %1 > /dev/null && /sbin/newfs -j /dev/%1p1 -L %2 > /dev/null && echo "\\"Success\\"" || echo "\\"Failed\\""',
  '^get disk (da[0-9][ps][1-9]|mmcsd0[ps][1-9])$': 'geom label list %1 | awk \'/Name:/ { printf "{ \\"label\\": \\"%s\\", ", $3 } /Mediasize:/ { printf "\\"size\\": %s }\\n", $2  } /Consumers/ { exit }\'',
  '^set disk (da[0-9]p[1-9]) ufs ([a-z]+)$': '/sbin/newfs -j -L %2 /dev/%1 && echo "\\"Success\\"" || echo "\\"Failed\\""',
  '^set disk (da[0-9]p[1-9]) label ([a-z]+)$': '/sbin/tunefs -L %2 /dev/%1 && echo "\\"Success\\"" || echo "\\"Failed\\""',
  '^get filesystems (msdosfs|ufs)$': 'ls -1 /dev/%1 | awk \'BEGIN { printf "[ " } { printf "%s\\"%s\\"", (++count==1)?"":", ",  $0 } END { printf " ]\\n" }\'',
  '^set filesystem ufs ([a-zA-Z]+)$': 'echo "\\"pretending to mkdir -p /media/%1 && mount /dev/ufs/%1 on /media/%1\\""',
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
  '^set system timezone ([A-Za-z]+) ([A-Za-z_]+)': '/bin/ln -sf /usr/share/zoneinfo/%1/%2 /etc/localtime',
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

// Log on startup.
log(`WeeNAS API Listening on port ${port}...`);

// Decode credentials passed in the header and compare to stored credentials.
function validateCredentials(authHeader) {
  let authType, authCredentials = '';
  let authorizedUser = ''; // To be filled with username if credentials are correct.
  if (authHeader) {
    [authType, authCredentials] = authHeader.split(' ');
    if (authType == 'Basic') {
      credentialsDecoded = Buffer.from(authCredentials, 'base64').toString('ascii');
      let [user, pass] = credentialsDecoded.split(':');
      let storedCredentials = '';
      try {
        storedCredentials = JSON.parse(childProcess.execSync(`pw user show ${user} 2>/dev/null | awk -F: 'BEGIN { printf "{\\n" } { split($8, gecos, ","); printf "  \\"auth\\": \\"%s\\",\\n", gecos[2]; printf "  \\"trusted\\": %i\\n", ($10 != "/sbin/nologin") } END { printf "}\\n" }'`));
      }
      catch {
        log(`Unable to retreive credentials for ${user}`);
      }
      let sha1Hash = crypto.createHash('sha1').update(pass).digest('hex');
      if (sha1Hash == storedCredentials.auth) {
        authorizedUser = user;
      }
    }
  }
  return authorizedUser;
}

// Serve up static content and log files (GET requests not handled by API.)
function serveStaticContent(filePath, request, response) {
  let fileStream = fs.createReadStream(filePath);
  let mimeType = mimeTypes[path.extname(filePath)] || 'text/plain';
  fileStream.on('open', () => {
    log(`Serving ${request.url} from ${filePath} as ${mimeType}`);
    response.writeHead(200, { 'Content-Type': mimeType });
    fileStream.pipe(response);
  });
  fileStream.on('error', (e) => {
    log(JSON.stringify(e));
    response.writeHead(404, 'Not Found', { 'Content-type': 'text/plain' });
    response.end(`404: ${request.url}'s not here, man.`);
  });
  fileStream.on('end', () => {
    response.end();
  });
}

// Find apiCmd in the command dictionary and run the corresponding shell command.
function runApiCommand(user, apiCmd, apiBody) {
  let result = EGENERIC;  // Assume the worst.
  let shellCmd = '';

  // Look for apiCmd by looping through available commands until a regex match occurs.
  for (var cmdPattern in apiCmdDict) {
    if (apiCmd.match(cmdPattern)) {

      // Apply the matching regex pattern to the apiCmd to capture group matches.
      let cmdPatternRegEx = new RegExp(cmdPattern);
      let match = cmdPatternRegEx.exec(apiCmd);

      // Substitute regex group matches into shell command %1 and %2 placeholders.
      // And, substitute the request body into the shell command's %0 placeholder.
      shellCmd = apiCmdDict[cmdPattern];
      if (match[1]) shellCmd = shellCmd.replace(/%1/g, match[1]);
      if (match[2]) shellCmd = shellCmd.replace(/%2/g, match[2]);
      if (apiBody) shellCmd = shellCmd.replace(/%0/, apiBody);

      // Run the shell command, capturing stdout.
      log('Running: ' + shellCmd);
      try {
        result = childProcess.execSync(shellCmd, { cwd: __dirname, env: { "USER": user}, input: apiBody });
      }
      catch {
        result = 'Command failed: ' + result;
      }
      if (result.slice(-1) == '\n') result = result.slice(0, -1);  // like Perl chomp()
    }
  }
  return result;
}

// Wait patiently for requests to come in.
https.createServer(httpsOptions, (request, response) => {
  let body = '';
  request.setEncoding('utf8');

  // Keep adding chunks of data to the body unless invalid chars are encountered.
  request.on('data', chunk => {
    let permittedCharsRegex = /^[A-Za-z0-9 ~!@#\$%\^-_=+\[\{\]\}:;"',.\/\r\n]*$/;
    if (chunk.match(permittedCharsRegex)) {
      body += chunk;
    }
    else {
      response.writeHead(400, 'Bad Request', { 'Content-Type': 'text/plain' });
      response.end('400: Illegal characters in request body.');
      request.destroy();
    }
  });

  // Request is entirely read in. The time to act is now.
  request.on('end', () => {
    let authorizedUser = validateCredentials(request.headers.authorization);

    let filePath = '';

    // Simple GET of static content in htdocs requires no auth token. Everything else does.
    if (request.url.match(filenameRegex)) {
      if (request.method == 'GET') {
        filePath = path.join(__dirname, 'htdocs', request.url);
        serveStaticContent(filePath, request, response);
      }
      else {
        response.writeHead(405, 'Method Not Allowed');
        response.end();
      }
    }
    else if (authorizedUser) {

      // Log files are static content, but only authorized users can view them.
      for (url in logRedirects) {
        if (url == request.url) {
          filePath = logRedirects[url];
          if (request.method == 'GET') {
            serveStaticContent(filePath, request, response);
          }
        }
      }

      // If no filepath was matched, check API calls.
      if (!filePath) {
        apiVerb = apiVerbDict[request.method] || '';
        if (apiVerb) {
          cmd = apiVerb + request.url.replace(/\//g, ' ').trimEnd();

          // API calls have the request body passed as well for possible POST and/or PUT.
          let result = runApiCommand(authorizedUser, cmd, body);
          if (result != EGENERIC) {
            response.writeHead(200, 'OK', { 'Content-Type': 'application/json' });
            response.end(result);
          }
          else {
            response.writeHead(404, 'Not Found', { 'Content-Type': 'text/plain' })
            response.end(result);
          }
        }
        else {
          response.writeHead(405, 'Method Not Allowed', { 'Content-Type': 'text/plain' });
          response.end('The API does not support that method.');
        }
      }
    }

    // Complain if no authorization was provided.
    else {
      response.writeHead(401, 'Unauthorized', { 'Content-Type': 'text/plain' });
      response.end('You need to be logged in.');
    }
  });
}).listen(port);
