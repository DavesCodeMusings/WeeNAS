#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const crypto = require('crypto');
const process = require('process');

const installationBase = '/usr/local';
const port = 9000;

const weenasVersion = '0.2 dev'
const pidFile = path.join('/var', 'run', path.basename(__filename, '.js') + '.pid');
const EGENERIC = "Sorry, Charlie.";

// Log to stdout with a date stamp.
function log(message) {
  let date = new Date;
  console.log(date.toISOString() + ' ' + message);
}

// Log startup information.
console.log(`WeeNAS version ${weenasVersion}\nCopyright (c)2020 David Horton https://davescodemusings.github.io/WeeNAS/`);
if (pidFile) {
  fs.writeFile(pidFile, process.pid, (error) => {
    if (!error) log(`PID ${process.pid} written to ${pidFile}`);
    else log(`${pidFile} is stale. Don\'t trust it. Actual PID is: ${process.pid}`);
  });
}

// Prepare for secure web server start up by fetching the SSL certificate and key. 
const certPath = path.join(installationBase, 'etc', 'weenas');
const httpsOptions = {
  cert: '',
  key: ''
};
try {
  httpsOptions.cert = fs.readFileSync(path.join(certPath, 'weenas_api.cer'));
}
catch {
  log(`Unable to read SSL cert from ${certPath}/weenas_api.cer`);
  process.exit(2);
}
try {
  httpsOptions.key = fs.readFileSync(path.join(certPath, 'weenas_api.key'));
}
catch {
  log(`Unable to read SSL private key from ${certPath}/weenas_api.key.`);
  process.exit(2);
}

// Fetch WeeNAS user secrets from wnpasswd.
var wnpasswd = {};
const wnpasswdFile = path.join(installationBase, 'etc', 'weenas', 'wnpasswd');

// Read colon-separated key/value pairs into an object.
try {
  for (let line of fs.readFileSync(wnpasswdFile).toString().split('\n')) {
    if (line.charAt(0) != '#' && line.indexOf(':') != -1) {
      entry = line.split(':');
      wnpasswd[entry[0]] = entry[1];
    }
  }
}
catch {
  log(`Unable to read user accounts from ${wnpasswdFile}. Your installation is corrupt.`);
  process.exit(2);
}

// API commands and their corresponding shell commands.
var apiCmds = {};
const apiCmdsFile = path.join(installationBase, 'etc', 'weenas', 'api_cmds.json');
try {
  apiCmds = JSON.parse(fs.readFileSync(apiCmdsFile));
}
catch {
  log(`Unable to read API commands from ${apiCmdsFile}. Your installation is corrupt.`);
  process.exit(2);
}

// Filename extension to MIME type look-up the few filetypes served.
var mimeTypes = {};
const mimeTypesFile = path.join(installationBase, 'etc', 'weenas', 'mime_types.json');
try {
  mimeTypes = JSON.parse(fs.readFileSync(mimeTypesFile));
}
catch {
  log(`Unable to read mime types from ${mimeTypesFile}. Your installation is corrupt.`);
  process.exit(2);
}

// Create a regular expression matching only files with extensions present in mime types.
// This is the only content the web server will serve up. Anything else is an error.
var mimeTypeList = "";
for (var fileExt in mimeTypes) {
  mimeTypeList += `${fileExt}|`;
}
mimeTypeList += 'html?[a-z_]+';  // For html with query strings.
var staticContentRegEx = new RegExp(`^/[A-Za-z0-9_-]+.(?:${mimeTypeList})`);

// Mapping HTTP verbs to API verbs.
var apiVerbDict = {
  'GET': 'get',
  'PUT': 'set',
  'POST': 'new',
  'DELETE': 'del'
}

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
      let storedCredentials = wnpasswd(user) || 'x';
      let sha512Hash = crypto.createHash('sha512').update(pass).digest('hex');
      if (sha512Hash == storedCredentials) {
        authorizedUser = user;
      }
    }
  }
  return authorizedUser;
}

// Serve up static content and log files (GET requests not handled by API.)
function serveStaticContent(filePath, request, response) {
  let fileStream = fs.createReadStream(filePath);
  let mimeType = mimeTypes[path.extname(filePath).slice(1)] || 'text/plain;charset=UTF-8';
  fileStream.on('open', () => {
    log(`Serving ${request.url} from ${filePath} as ${mimeType}`);
    response.writeHead(200, { 'Content-Type': mimeType });
    fileStream.pipe(response);
  });
  fileStream.on('error', (e) => {
    log(JSON.stringify(e));
    response.writeHead(404, 'Not Found', { 'Content-Type': 'text/plain;charset=UTF-8' });
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
  for (var cmdPattern in apiCmds) {
    if (apiCmd.match(cmdPattern)) {

      // Apply the matching regex pattern to the apiCmd to capture group matches.
      let cmdPatternRegEx = new RegExp(cmdPattern);
      let match = cmdPatternRegEx.exec(apiCmd);

      // Substitute regex group matches into shell command %1 and %2 placeholders.
      // Also, request body and the authenticated user via %0 and %u, respectively.
      shellCmd = apiCmds[cmdPattern];
      shellCmd = shellCmd.replace(/%u/g, user);
      if (match[1]) shellCmd = shellCmd.replace(/%1/g, match[1]);
      if (match[2]) shellCmd = shellCmd.replace(/%2/g, match[2]);
      if (apiBody) shellCmd = shellCmd.replace(/%0/, apiBody);

      // Run the shell command, capturing stdout.
      log('Running: ' + shellCmd);
      try {
        result = childProcess.execSync(shellCmd, { cwd: __dirname, env: { "API_USER": user }, input: apiBody });
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
const server = https.createServer(httpsOptions, (request, response) => {
  let body = '';
  request.setEncoding('utf8');

  // Keep adding chunks of data to the body unless invalid chars are encountered.
  request.on('data', chunk => {
    let permittedCharsRegex = /^[A-Za-z0-9 ~!@#\$%&\^-_=+\[\{\]\}:;"',.\/\r\n]*$/;
    if (chunk.match(permittedCharsRegex)) {
      body += chunk;
    }
    else {
      response.writeHead(400, 'Bad Request', { 'Content-Type': 'text/plain;charset=UTF-8' });
      response.end('400: Illegal characters in request body.');
      request.destroy();
    }
  });

  // Request is entirely read in. The time to act is now.
  request.on('end', () => {
    let authorizedUser = validateCredentials(request.headers.authorization);

    // Redirect to index.html when no file is specified.
    if (request.url == '/') {
      response.writeHead(302, 'Found', { 'Location': 'index.html' });
      response.end();
    }
    else {
      let filePath = '';

      // Simple GET of static content in htdocs requires no auth token. Everything else does.
      // Also be on the look out for query strings (?query) and chop them off the file path.
      if (request.url.match(staticContentRegEx)) {
        if (request.method == 'GET') {
          filePath = path.join(installationBase, 'share', 'weenas', 'htdocs', request.url);
          if (filePath.indexOf('?') > -1) {
            filePath = filePath.substr(0, filePath.indexOf('?'));
          }
          serveStaticContent(filePath, request, response);
        }
        else {
          response.writeHead(405, 'Method Not Allowed');
          response.end();
        }
      }
      else if (authorizedUser) {

        // If no filepath was matched, check API calls.
        if (!filePath) {
          apiVerb = apiVerbDict[request.method] || '';
          if (apiVerb) {
            cmd = apiVerb + request.url.replace(/\//g, ' ').trimEnd();

            // API calls have the request body passed as well for possible POST and/or PUT.
            let result = runApiCommand(authorizedUser, cmd, body);
            if (result != EGENERIC) {
              response.writeHead(200, 'OK', { 'Content-Type': 'application/json;charset=UTF-8' });
              response.end(result);
            }
            else {
              response.writeHead(404, 'Not Found', { 'Content-Type': 'text/plain;charset=UTF-8' })
              response.end(result);
            }
          }
          else {
            response.writeHead(405, 'Method Not Allowed', { 'Content-Type': 'text/plain;charset=UTF-8' });
            response.end('The API does not support that method.');
          }
        }
      }
      // Complain if no authorization was provided.
      else {
        response.writeHead(401, 'Unauthorized', { 'WWW-Authenticate': 'Basic' });
        response.end('You need to be logged in.');
      }
    }
  });
}).listen(port);

// Signal handlers and shutdown.
function sigHandler(signal) {
  log(`Caught signal: ${signal}.`);
  if (signal == 'SIGINT' || signal == 'SIGTERM') {
    process.exit(0);
  }
}
process.on('SIGINT', sigHandler);
process.on('SIGTERM', sigHandler);

process.on('exit', () => {
  server.close();
  fs.unlinkSync(pidFile);
  log('Server shutdown.');
});
