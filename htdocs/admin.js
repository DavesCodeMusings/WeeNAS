/* Authorization header to use in various AJAX calls to API. */
var authHeader = '';

function logOut() {
  authHeader = '';
  document.getElementById('credentials-icon').style.opacity = '0.25';
  document.getElementById('credentials-username').value = '';
  document.getElementById('credentials-password').value = '';
  document.getElementById('credentials-state').innerHTML = '';
  document.getElementById('credentials').setAttribute('open', true);
}

/* Indicate that credentials were entered correctly or not. */
function credentialsEntered(authorized) {
  if (authorized) {
    document.getElementById('credentials-state').innerHTML = '&#x1F7E2;';
    document.getElementById('credentials-icon').style.opacity = '1.0';
    document.getElementById('credentials').removeAttribute('open');
  }
  else {
    document.getElementById('credentials-state').innerHTML = '&#x026d4;';
  }
}

/* Create authorization header from credentials */
function createAuth(username, password, callback) {
  authHeader = 'Basic ' + btoa(username + ':' + password);
  url = '/user/' + username;
  document.body.style.cursor = 'wait';
  let xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4) {
      callback((this.status == 200));
      document.body.style.cursor = 'default';
    }
  };
  xhttp.open('GET', url, true);
  xhttp.setRequestHeader('Authorization', authHeader);
  xhttp.send();      
}

/*
* Users
*/

/* Display user accounts. */
function updateUserList(users) {
  users.sort();
  let userList ='';
  for (let i = 0; i < users.length; i++) {
      userList += '<option>' + users[i] + '</option>';
  }
  document.getElementById('user-list').innerHTML = userList;
}

/* AJAX fetch users */
function getUsers(callback) {
  url = '/users';
  document.body.style.cursor = 'wait';
  let xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4) {
      if (this.status == 200) callback(JSON.parse(this.responseText));
      else alert('Error retrieving users.\n' + this.responseText);
      document.body.style.cursor = 'default';
    }
  };
  xhttp.open('GET', url, true);
  xhttp.setRequestHeader('Authorization', authHeader);
  xhttp.send();
}

/* Display the details for a given user info object. */
function updateUserDetails(userDetails) {
  document.getElementById('user-locked').checked = (userDetails.locked);
  document.getElementById('user-samba').checked = (userDetails.samba);
  document.getElementById('user-shell').checked = (userDetails.shell);
  document.getElementById('user-admin').checked = (userDetails.wheel);
}

/* Retrieve detailed information for one particular user */
function getuserDetails(user, callback) {
  url = '/user/' + user;
  document.body.style.cursor = 'wait';
  let xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4) {
      if (this.status == 200) callback(JSON.parse(this.responseText));
      else alert('Error retrieving user information.\n' + this.responseText);
      document.body.style.cursor = 'default';
    }
  };
  xhttp.open('GET', url, true);
  xhttp.setRequestHeader('Authorization', authHeader);
  xhttp.send();      
}

/* Create new users from a list, removing each one as it is added. */
function addUserList(userList) {
  if (userList) {
    users = userList.split(' ');
    for (let i=0; i<users.length; i++) {
      addUser(users[i]);
    }
  }
}

/* AJAX add user(s) */
function addUser(user, callback) {
  document.body.style.cursor = 'wait';
  let url = '/user/' + user;
  xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (xhttp.readyState === 4) {
      if (xhttp.status == 200) {
        document.body.style.cursor = 'default';
        if (callback) callback(JSON.parse(this.responseText));
      }
      else alert('Error: ' + xhttp.responseText);
    }
  };
  xhttp.open('POST', url, true);
  xhttp.setRequestHeader('Authorization', authHeader);
  xhttp.send('');
}

/* AJAX set user attribute (lock/unlock, trusted/untrusted) */
function setUserAttribute(user, attribute) {
  if (user) {
    document.body.style.cursor = 'wait';
    url = '/user/' + user + '/' + attribute;
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status !== 200) alert('Error: ' + this.responseText);
        document.body.style.cursor = 'default';
      }
    };
    xhttp.open('PUT', url, true);
    xhttp.setRequestHeader('Authorization', authHeader);
    xhttp.send();
  }
}

/* AJAX delete user */
function delUser(user, confirmed) {
  if (user) {
    if (!confirmed) {
      confirmed = confirm('Permanently delete ' + user + '?');
    }
    if (confirmed) {
      document.body.style.cursor = 'wait';
      url = '/user/' + user;
      let xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function () {
        if (this.readyState === 4) {
          if (this.status !== 200) alert('Error: ' + this.responseText);
          document.body.style.cursor = 'default';
        }
      };
      xhttp.open('DELETE', url, true);
      xhttp.setRequestHeader('Authorization', authHeader);
      xhttp.send();
    }
  }
}

/*
* Storage
*/

/* Human readable disk-size */
function diskSizeHuman(sizeBytes) {
  let size = sizeBytes;
  let label = ['B', 'K', 'M', 'G', 'T', 'P'];
  let count = 0;
  while (size / 1000 > 1 && count < label.length - 1) {
    size /= 1000;
    count++;
  }
  size = Math.round(size);
  return `${size}${label[count]}`;
}

/* Display home filesystem information */
function updateHomefsInfo(filesystemInfo) {
  document.getElementById('storage-home-total').innerHTML = diskSizeHuman(filesystemInfo.total * 1048576);
  document.getElementById('storage-home-free').innerHTML = diskSizeHuman(filesystemInfo.free * 1048576);
  document.getElementById('storage-home-percent').innerHTML = filesystemInfo.percent;
}

function getFilesystemInfo(filesystem, callback) {
  url = '/filesystem/mounted/ufs/' +filesystem;
  document.body.style.cursor = 'wait';
  let xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4) {
      if (this.status == 200) callback(JSON.parse(this.responseText));
      else alert('Error: ' + this.responseText);
      document.body.style.cursor = 'default';
    }
  };
  xhttp.open('GET', url, true);
  xhttp.setRequestHeader('Authorization', authHeader);
  xhttp.send();
}

/* Display disk information */
function updateDiskList(disksObj) {
  let diskNames = Object.keys(disksObj);
  diskNames.sort();
  let diskOptionList = '';
  for (let i = 0; i < diskNames.length; i++) {
    diskOptionList += '<option>' + diskNames[i] + '</option>';
  }
  document.getElementById('storage-devices').innerHTML = diskOptionList;
}

/* AJAX fetch storage devices (disks) */
function getDisks(callback) {
  let url = '/disks';
  document.body.style.cursor = 'wait';
  let xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4) {
      if (this.status == 200) callback(JSON.parse(this.responseText));
      else alert('Error: ' + this.responseText);
      document.body.style.cursor = 'default';
    }
  };
  xhttp.open('GET', url, true);
  xhttp.setRequestHeader('Authorization', authHeader);
  xhttp.send();
}

/* Display partition information */
function updateDiskInfo(diskObj) {
  let partitionNames = Object.keys(diskObj.partitions);
  partitionNames.sort();
  let partitionOptionList = '';
  for (let i = 0; i < partitionNames.length; i++) {
    partitionOptionList += '<option>' + partitionNames[i] + '</option>';
  }
  document.getElementById('storage-partitions').innerHTML = partitionOptionList;
  if (diskObj.size) document.getElementById('storage-size').innerHTML = diskSizeHuman(diskObj.size);
  if (diskObj.description) document.getElementById('storage-description').innerHTML = diskObj.description;
}

/* Get information about a particular disk. */
function getDiskInfo(disk, callback) {
  let url = '/disk/' + disk;
  document.body.style.cursor = 'wait';
  let xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4) {
      if (this.status == 200) callback(JSON.parse(this.responseText));
      else alert('Error: ' + this.responseText);
      document.body.style.cursor = 'default';
    }
  };
  xhttp.open('GET', url, true);
  xhttp.setRequestHeader('Authorization', authHeader);
  xhttp.send();
}

/* Display available filesystems */
function updateFilesystems(filesystemsArr) {
  filesystemsList = '';
  for (let i = 0; i < filesystemsArr.length; i++) {
    filesystemsList += '<option>' + filesystemsArr[i] + '</option>'
    document.getElementById('storage-filesystems').innerHTML = filesystemsList;
  }
}

/* AJAX fetch available filesystems */
function getFilesystems(fsType, callback) {
  let url = '/filesystems/' + fsType;
  document.body.style.cursor = 'wait';
  let xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4) {
      if (this.status == 200) callback(JSON.parse(this.responseText));
      else alert('Error: ' + this.responseText);
      document.body.style.cursor = 'default';
    }
  };
  xhttp.open('GET', url, true);
  xhttp.setRequestHeader('Authorization', authHeader);
  xhttp.send();
}

/* Display mountpoint */
function updateMountpoint(directory, editable) {
  let e = document.getElementById('storage-mountpoint')
  e.value = directory;
  if (editable) e.removeAttribute('readonly');
  else e.setAttribute('readonly', true);
}

/* Determine a default mount directory based on filesystem label */
function suggestMountPoint(fsLabel, callback) {
  let mountpoint = '';
  let editable = false;
  if (fsLabel == "rootfs") {
    mountpoint = '/';
  }
  else if (fsLabel == "homefs") {
    mountpoint = '/home';
  }
  else {
    // Chop 'fs' off the end for readability, so 'musicfs' becomes 'music'.
    if (fsLabel.substring(fsLabel.length - 2) == 'fs') {
      fsLabel = fsLabel.substring(0, fsLabel.length - 2);
    }
    mountpoint = '/media/' + fsLabel;
    editable = true;
  }
  callback(mountpoint, editable);
}

/* AJAX write partition scheme */
function formatDisk(disk, label) {
  if (confirm('This will destroy all data on ' + disk)) {
    document.body.style.cursor = 'wait';
    let url = '/disk/' + disk + '/freebsd/' + label;
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4) {
        if (this.status == 200) {
          reply = JSON.parse(this.responseText);
          alert(reply);
        }
        else alert('Error writing partition scheme and filesystem to ' + disk);
        document.body.style.cursor = 'default';
      }
    };
    xhttp.open('PUT', url, true);
    xhttp.send();
  }
}

/* AJAX write filesystem */
function writeFilesystem(partition) {
  if (confirm('This will destroy all data on ' + partition)) {
    document.body.style.cursor = 'wait';
    let url = '/disk/' + partition + '/ufs';
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4) {
        if (this.status == 200) {
          reply = JSON.parse(this.responseText);
          alert(reply);
        }
        else alert('Error writing filesystem to ' + partition);
        document.body.style.cursor = 'default';
      }
    };
    xhttp.open('PUT', url, true);
    xhttp.send();
  }
}

/*
* Services
*/

/* Display ntpd Status */
function updateNtpd(status) {
  document.getElementById('time-ntpd').innerHTML = status;
}

/* Get service status. */
function getServiceStatus(name, callback) {
  let url = '/system/service/' + name;
  let xhttp = new XMLHttpRequest();
  document.body.style.cursor = 'wait';
  xhttp.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) callback(JSON.parse(this.responseText));
      else alert('Error: ' + this.responseText);
    }
    document.body.style.cursor = 'default';
  };
  xhttp.open('GET', url, true);
  xhttp.setRequestHeader('Authorization', authHeader);
  xhttp.send();
}

/*
* Time
*/

/* Display date and time */
function updateDateTime(dateTimeString) {
  document.getElementById('time-server').innerHTML = dateTimeString;

  // Create an ISO-8601 date rounded to the nearest minute to match server format.
  let d = new Date();
  let formattedDate = d.getUTCFullYear()
    + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2)
    + '-' + ('0' + d.getUTCDate()).slice(-2)
    + 'T' + ('0' + d.getUTCHours()).slice(-2)
    + ':' + ('0' + d.getUTCMinutes()).slice(-2)
    + 'Z';
  document.getElementById('time-client').innerHTML = formattedDate;
}

/* Get server time and browser time, in UTC and to the nearest minute. */
function getDateTime(callback) {
  let xhttp = new XMLHttpRequest();
  document.body.style.cursor = 'wait';
  xhttp.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) callback(JSON.parse(this.responseText));
      else alert('Error: ' + this.responseText);
    }
    document.body.style.cursor = 'default';
  };
  xhttp.open('GET', '/system/datetime', true);
  xhttp.setRequestHeader('Authorization', authHeader);
  xhttp.send();
}

/* Set the timezone. */
function setTimeZone(area, location) {
  if (area && location) {
    let url = './system/timezone/' + area + '/' + location;
    document.body.style.cursor = 'wait';
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4) {
        if (this.status != 200) alert('Error: ' + this.responseText);
        document.body.style.cursor = 'default';
      }
    };
    xhttp.open('PUT', url, true);
    xhttp.setRequestHeader('Authorization', authHeader);
    xhttp.send();
  }
}


/* Current log file name */
logFileName = "messages";

/* Display log contents and automaticall scroll down to most recent events. */
function updateLog(contents) {
  let e = document.getElementById('log-viewer');
  e.value = contents;
  e.scrollTop = e.scrollHeight;
}

/* AJAX log fetcher. */
function getLog(name, callback) {
  let url = '/system/log/' + name;
  let xhttp = new XMLHttpRequest();
  document.body.style.cursor = 'wait';
  xhttp.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) callback(this.responseText);
      else alert('Error: ' + this.responseText);
      document.body.style.cursor = 'default';
    }
  };
  xhttp.open('GET', url, true);
  xhttp.setRequestHeader('Authorization', authHeader);
  xhttp.send();
}

/*
*  Mail
*/

/* Current mail message number (0 means show headers only) */
mailMsgNum = 0;

/* Display contents of mail message or headers. */
function updateMail(msg) {
  document.getElementById('mail').value = msg;
}

/* AJAX fetch mail by message ID. No ID or ID <= 0 will fetch headers.*/
function getMail(msgNum, callback) {
  if (msgNum === undefined || msgNum < 0) msgNum = 0;
  let url = '/system/mail';
  if (msgNum > 0) {
    url += '/' + msgNum;
  }
  document.body.style.cursor = 'wait';
  let xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4) {
      if (this.status == 200) callback(this.responseText);
      else alert(this.responseText);
      mailMsgNum = msgNum;
      document.body.style.cursor = 'default';
    }
  };
  xhttp.open('GET', url, true);
  xhttp.setRequestHeader('Authorization', authHeader);
  xhttp.send();
}

/* AJAX delete mail by message ID. */
function delMail(msgNum) {
  if (typeof (msgNum) == 'number' && msgNum > 0) {
    let url = '/system/mail/' + msgNum;
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState === 4 && this.status !== 200) {
        alert("Mail delete failed.")
      }
    };
    xhttp.open('DELETE', url, true);
    xhttp.send();
  }
}