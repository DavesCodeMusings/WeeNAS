var networkGateway = '';  /* Also used as a DNS provider choice. */
var firstTrustedUser = '';  /* The first user in the list of trusted users get the email alias for root. */

function refreshAll() {
    identity();
    time();
    users();
    network();
    dns();
    storage();
    samba();
    services();
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
        firstTrustedUser = userList[0];
        for (var i = 0; i < userList.length; i++) {
            commands += 'pw user add -n ' + userList[i] + ' -c ' + userList[i] + ' -g ' + userList[i] + ' -G wheel -w random >> /root/vault.txt' + '\n';
        }
    }
    else {
        commands += "# Check the configuration!  There must be at least one trusted user."
    }
    if (regular) {
        userList = regular.split(' ');
        for (var i = 0; i < userList.length; i++) {
            commands += 'pw user add -n ' + userList[i] + ' -c ' + userList[i] + ' -g ' + userList[i] + ' -w random >> /root/vault.txt' + '\n';
        }
    }
    document.getElementById('user-summary').innerHTML = summary;
    document.getElementById('user-commands').innerHTML = commands;
}

function network() {
    var interface = document.getElementById('network-interface');
    var ipv4 = document.getElementById('network-ip');
    var mask = document.getElementById('network-mask');
    var gateway = document.getElementById('network-gateway');
    var summary = '';
    var commands = '';
    if (document.getElementById('network-dhcp').value == 'Yes') {
        document.getElementById('network-static').style.display = 'none';
        summary += 'DHCP';
        commands = '# DHCP\n';
    }
    else {
        document.getElementById('network-static').style.display = 'block';
        networkGateway = gateway.value;
        summary += ipv4.value + '/' + mask.value + ' &rarr; ' + gateway.value;
        commands = 'sysrc ifconfig_' + interface + ' ' + ipv4.value + ' netmask.value ' + mask.value + '\n';
        commands += 'sysrc defaultrouter="' + gateway + '\n';
    }
    document.getElementById('network-summary').innerHTML = summary;
    document.getElementById('network-commands').innerHTML = commands;
}

function dns() {
    var dhcp = document.getElementById('dns-dhcp');
    var router = document.getElementById('dns-router');
    var google = document.getElementById('dns-google');
    var opendns = document.getElementById('dns-opendns');
    var other = document.getElementById('dns-other');
    var primary = document.getElementById('dns-primary');
    var secondary = document.getElementById('dns-secondary');
    var summary = '';
    var commands = '';
    if (document.getElementById('network-dhcp').value == 'Yes') {
        document.getElementById('dns-static').style.display = 'none';
        dhcp.checked = true;
        dhcp.disabled = false;
        router.disabled = true;
        google.disabled = true;
        opendns.disabled = true;
        other.disabled = true;
        summary += 'DHCP';
        commands = '# DHCP\n';
    }
    else {
        document.getElementById('dns-static').style.display = 'block';
        dhcp.checked = false;
        dhcp.disabled = true;
        router.disabled = false;
        google.disabled = false;
        opendns.disabled = false;
        other.disabled = false;
        if (router.checked) {
            primary.value = networkGateway;
            primary.readOnly = true;
            secondary.readOnly = false;
        }
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
        if (other.checked) {
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
    var summary = '';
    var commands = '';
    var dev = document.getElementById('storage-dev').value;
    var label = document.getElementById('storage-label').value;
    var mount = document.getElementById('storage-mount').value;
    summary += '/dev/ufs/' + label + ' on ' + mount + '</span>';
    commands += 'sysrc fsck_y_enable="YES"\n';
    commands += 'if [ "$(gpart show ' + dev + ' | grep -i FreeBSD)" == "" ]; then\n';
    commands += '\n  # Delete existing partition scheme.\n'
    commands += '  gpart delete -i 1 ' + dev + '\n';
    commands += '  gpart destroy ' + dev + '\n';
    commands += '\n  # Create FreeBSD partition scheme.\n'
    commands += '  gpart create -s GPT ' + dev + '\n';
    commands += '  gpart add -t freebsd-ufs ' + dev + '\n';
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

function samba() {
    var workgroup = document.getElementById('samba-workgroup');
    var home = document.getElementById('samba-home');
    var shared = document.getElementById('samba-shared');
    var summary = workgroup.value.toUpperCase();
    var commands = 'pkg install -y samba48\n';
    commands += 'cat << EOF > /usr/share/etc/smb4.conf\n';
    commands += '[global]\n';
    commands += '  workgroup = ' + workgroup.value.toUpperCase() + '\n';
    commands += '  server string = %h\n';
    commands += '  security = user\n';
    if (home.value == 'Yes') {
        summary += ' <i>username</i>';
        commands += '[homes]\n';
        commands += '  comment = Home Directories\n';
        commands += '  browseable = no\n';
        commands += '  writable = yes\n';
        commands += '  create mask = 644\n';
        commands += '  directory mask = 755\n';
    }
    if (shared.value == 'Yes') {
        summary += ' shared';
        commands += '[shared]\n';
        commands += '  path = /home/shared\n';
        commands += '  comment = Shared Directory\n';
        commands += '  browsable = yes\n';
        commands += '  writable = yes\n';
        commands += '  create mask = 644\n';
        commands += '  directory mask = 755\n';
    }
    commands += 'EOF\n';
    commands += 'sysrc samba_server_enable="YES"\n';
    commands += 'service samba_server start\n';
    document.getElementById('samba-summary').innerHTML = summary;
    document.getElementById('samba-commands').innerHTML = commands;
}

function services() {
    var smtp = document.getElementById('services-smtp');
/*
    var pop3 = document.getElementById('services-pop3');
    var www = document.getElementById('services-www');
    var monit = document.getElementById('services-monit');
*/
    var summary = '';
    var commands = '';
    if (smtp.checked) {
        summary += 'SMTP ';
        commands += '\n#SMTP\n';
        commands += 'sed -i~ \'s/^# root:.*/root: ' + firstTrustedUser + '/\' /etc/mail/aliases\n';
        commands += 'newaliases\n'
        commands += 'sysrc sendmail_enable="YES"\n';
        commands += 'sysrc sendmail_msp_queue_enable="YES"\n';
    }
/*
    if (pop3.checked) {
        summary += 'POP3 ';
    }
    if (www.checked) {
        summary += 'Web';
    }
    if (monit.checked) {
        summary += 'Monit ';
    }
*/
    summary += '</span>';
    document.getElementById('services-summary').innerHTML = summary;
    document.getElementById('services-commands').innerHTML = commands;
}

function copyScript() {
}
