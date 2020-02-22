  function refreshAll() {
    toggleNetworkStatic();
    identity();
    time();
    users();
    network();
    dns();
    storage();
    sambaSummary();
    servicesSummary();
  }

  function identity() {
    var hostname = document.getElementById('identity-hostname').value;
    var domain = document.getElementById('identity-domain').value;
    var summary = hostname + '.' + domain;
    var commands = 'sysrc hostname="' + hostname + '.' + domain + '"\n';
    document.getElementById('identity-summary').innerHTML = summary; 
    document.getElementById('identity-commands').innerHTML = commands;
	}

  function time() {
    var timezone = document.getElementById('time-area').value + '/' + document.getElementById('time-location').value;
    var summary = timezone;
    var commands = '';
    commands += 'ntpd_enable="YES"\n'
    commands += 'ntpd_sync_on_start="YES"\n';
    commands += 'cp /usr/share/zoneinfo/' + timezone + ' /etc/localtime\n'
    commands += 'service ntpd start\n'
    document.getElementById('time-summary').innerHTML = summary;
    document.getElementById('time-commands').innerHTML = commands;
  }
  
  function users() {
    var trusted = document.getElementById('user-trusted').value;
    var regular = document.getElementById('user-regular').value;
    var summary = '<em>' + trusted + '</em> ' + regular;
    var commands = '';

    // .split(' ') on an empty string results in a length of 1, hence the conditional below.
    if (trusted) {
      var userList = trusted.split(' ');
      for (var i=0; i<userList.length; i++) {
        commands += 'pw user add -n ' + userList[i] + ' -c ' + userList[i] + ' -g ' + userList[i] + ' -G wheel -w random >> /root/vault.txt' + '\n';
      }
    }
    else {
      commands += "# Check the configuration!  There must be at least one trusted user."
    }
    if (regular) {
      userList = regular.split(' ');
      for (var i=0; i<userList.length; i++) {
        commands += 'pw user add -n ' + userList[i] + ' -c ' + userList[i] + ' -g ' + userList[i] + ' -w random >> /root/vault.txt' + '\n';
      }
    }
    document.getElementById('user-summary').innerHTML = summary;
    document.getElementById('user-commands').innerHTML = commands;
  }
  
  function network() {
    var summary = '';
    var commands = '';
	  if (document.getElementById('network-dhcp').value == 'Yes') {
      summary += 'DHCP';
      commands = '# DHCP\n';
    }
	  else {
      var interface = document.getElementById('network-interface').value;
      var ipv4 = document.getElementById('network-ip').value;
      var mask = document.getElementById('network-mask').value;
      var gateway = document.getElementById('network-gateway').value;
      summary += ipv4 + '/' + mask + ' &rarr; ' + gateway;
      commands = 'sysrc ifconfig_' + interface + ' ' + ipv4 + ' netmask ' + mask + '\n';
      commands += 'sysrc defaultrouter="' + gateway + '\n';
    }
    document.getElementById('network-summary').innerHTML = summary; 
    document.getElementById('network-commands').innerHTML = commands;
  }

  function dns() {
    var dhcp = document.getElementById('dns-dhcp');
    var google = document.getElementById('dns-google');
    var opendns = document.getElementById('dns-opendns');
    var custom = document.getElementById('dns-custom');
    var primary = document.getElementById('dns-primary');
    var secondary = document.getElementById('dns-secondary');
    var summary = '';
    var commands = '';
    if (document.getElementById('network-dhcp').value == 'Yes') {
      dhcp.checked = true;
      dhcp.disabled = false;
      google.disabled = true;
      opendns.disabled = true;
      custom.disabled = true;
      primary.value = '';
      secondary.value = '';
      summary += 'DHCP';
      commands = '# DHCP\n';
    }
    else {
      dhcp.checked = false;
      dhcp.disabled = true;
      google.disabled = false;
      opendns.disabled = false;
      custom.disabled = false;
      if (google.checked) {
        primary.value = "8.8.8.8";
        secondary.value = "8.8.4.4";
        primary.readOnly = true;
        secondary.readOnly = true;
      }
      if (opendns.checked) {
        primary.value = "208.67.222.222";
        secondary.value = "208.67.220.220";
        primary.readOnly = true;
        secondary.readOnly = true;
      }
      if (custom.checked) {
        primary.readOnly = false;
        secondary.readOnly = false;
      }
      summary += primary.value + ', ' + secondary.value + '\n';
      commands += 'echo "nameserver ' + primary.value + '" > /etc/resolv.conf\n';
      commands += 'echo "nameserver ' + secondary.value + '" >> /etc/resolv.conf\n';
    }
    document.getElementById('dns-summary').innerHTML = summary;
    document.getElementById('dns-commands').innerHTML = commands;
  }

  function storage() {
    var summary = '<b>Storage</b> <span class="right-justify"> ';
    var commands = '';
	  var dev = document.getElementById('storage-dev').value;
    var label = document.getElementById('storage-label').value;
	  var mount = document.getElementById('storage-mount').value;
    summary += '/dev/ufs/' + label + ' on ' + mount + '</span>';
    commands += 'if [ "$(gpart show ' + dev + ' | grep -i FreeBSD)" == "" ]; then\n';
    commands += '\n  # Delete existing partition scheme.\n'
    commands += '  gpart delete -i 1 ' + dev + '\n';
    commands += '  gpart destroy ' + dev + '\n';
    commands += '\n  # Create FreeBSD partition scheme.\n'
    commands += '  gpart create -s GPT ' + dev + '\n';
    commands += '  gpart add -t freebsd-ufs '+ dev + '\n';
    commands += '\n  # Create UFS filesystem (aka format.)\n'
    commands += '  newfs ' + label + ' ' + dev + 'p1\n';
	  commands += 'fi\n';
    commands += '\n# Label as ' + label + ' and set soft journaling.\n'
    commands += 'tunefs -j -L ' + label + ' ' + dev + 'p1\n';
    commands += '\n# Write to fstab and mount\n';
    commands += 'echo "/dev/ufs/' + label + ' ' + mount + ' ufs rw,noatime 0 0" >> /etc/fstab\n';
    commands += 'mount ' + label + '\n';
    document.getElementById('storage-summary').innerHTML = summary;
    document.getElementById('storage-commands').innerHTML = commands;
	}
