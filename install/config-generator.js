var networkGateway = '';  /* Also used as a DNS provider choice. */
var firstTrustedUser = '';  /* The first user in the list of trusted users get the email alias for root. */

function refreshAll() {
    users();
    mail();
    hostname();
    time();
    network();
    dns();
    storage();
    samba();
}

// Highlight any fields that are left blank.
function warnBlank(element) {
    if (!element.value) {
        element.style.backgroundColor = "yellow";
    }
    else {
        element.style.backgroundColor = "white";
    }
}

function hostname() {
    var hostname = document.getElementById('hostname-host');
    var domain = document.getElementById('hostname-domain');
    warnBlank(hostname);
    warnBlank(domain);
    var summary = hostname.value + '.' + domain.value;
    var commands = 'sysrc hostname="' + hostname.value + '.' + domain.value + '"\n';
    document.getElementById('hostname-summary').innerHTML = summary;
    document.getElementById('hostname-commands').innerHTML = commands;
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
    var trusted = document.getElementById('user-trusted');
    var regular = document.getElementById('user-regular');
    warnBlank(trusted);
    var summary = '<em>' + trusted.value.toLowerCase() + '</em> ' + regular.value.toLowerCase();
    var commands = '\n# Creating shared group.\n';
    commands += 'pw group add -g 1000 shared\n';  /* user groups start at 1001 and go up, 1000 is unused. */
    commands += '\n# Creating trusted user accounts. These are the users that can su to root.\n';
    // .split(' ') on an empty string results in a length of 1, hence the conditional below.
    if (trusted.value) {
        var userList = trusted.value.split(' ');
        firstTrustedUser = userList[0];
        for (var i = 0; i < userList.length; i++) {
            commands += 'pw group add ' + userList[i].toLowerCase() + '\n';
            commands += 'pw user add -m -p 01-Jan-1970 -n ' + userList[i] + ' -c ' + userList[i] + ' -g ' + userList[i] + ' -G wheel,shared -w random >> /root/vault' + '\n';
            commands += 'smbpasswd -a ' + userList[i] + '\n';
        }
    }
    else {
        commands += "\n# Check the configuration!  There must be at least one trusted user.\n"
    }
    commands += '\n# Creating regular user accounts.\n';
    if (regular.value) {
        userList = regular.value.split(' ');
        for (var i = 0; i < userList.length; i++) {
            commands += 'pw group add ' + userList[i].toLowerCase() + '\n';
            commands += 'pw user add -m -p 01-Jan-1970 -n ' + userList[i].toLowerCase() + ' -c ' + userList[i] + ' -g ' + userList[i].toLowerCase() + ' -G shared -w random >> /root/vault' + '\n';
            commands += 'smbpasswd -a ' + userList[i].toLowerCase() + '\n';
        }
    }
    commands += '\n# Securing initial password vault and disabling built-in backdoor accounts.\n';
    commands += 'chmod 400 /root/vault\n';
    commands += 'pw lock toor\n';
    commands += 'pw lock freebsd\n';
    commands += '\n# Temporary passwords for users in the order they were created.\n';
    commands += 'cat /root/vault\n';
    document.getElementById('user-summary').innerHTML = summary;
    document.getElementById('user-commands').innerHTML = commands;
}

function network() {
    var dhcp = document.getElementById('network-dhcp');
    var interface = document.getElementById('network-interface');
    var ipv4 = document.getElementById('network-ip');
    var mask = document.getElementById('network-mask');
    var gateway = document.getElementById('network-gateway');
    var summary = '';
    var commands = '';
    if (dhcp.value == 'Yes') {
        document.getElementById('network-static').style.display = 'none';
        summary += 'DHCP';
        commands = '# DHCP\n';
    }
    else {
        document.getElementById('network-static').style.display = 'block';
        warnBlank(interface);
        warnBlank(ipv4);
        warnBlank(mask);
        warnBlank(gateway);
        networkGateway = gateway.value;
        summary += ipv4.value + '/' + mask.value + ' &rarr; ' + gateway.value;
        commands = 'sysrc ifconfig_' + interface.value + ' ' + ipv4.value + ' netmask ' + mask.value + '\n';
        commands += 'sysrc defaultrouter="' + gateway.value + '"\n';
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
        warnBlank(primary);
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
    var dev = document.getElementById('storage-dev');
    var label = document.getElementById('storage-label');
    var mount = document.getElementById('storage-mount');
    warnBlank(dev);
    summary += '/dev/ufs/' + label.value + ' on ' + mount.value + '</span>';
    commands += 'sysrc fsck_y_enable="YES"\n';
    commands += 'if [ "$(gpart show ' + dev.value + ' | grep -i FreeBSD)" == "" ]; then\n';
    commands += '\n  # Delete existing partition scheme.\n'
    commands += '  gpart delete -i 1 ' + dev.value + '\n';
    commands += '  gpart destroy ' + dev.value + '\n';
    commands += '\n  # Create FreeBSD partition scheme.\n'
    commands += '  gpart create -s GPT ' + dev.value + '\n';
    commands += '  gpart add -t freebsd-ufs ' + dev.value + '\n';
    commands += '\n  # Create UFS filesystem (aka format.)\n'
    commands += '  newfs ' + label.value + ' ' + dev.value + 'p1\n';
    commands += 'fi\n';
    commands += '\n# Label as ' + label.value + ' and set soft journaling.\n'
    commands += 'tunefs -j -L ' + label.value + ' ' + dev.value + 'p1\n';
    commands += '\n# Write to fstab and mount\n';
    commands += 'echo "/dev/ufs/' + label.value + ' ' + mount.value + ' ufs rw,noatime 0 0" >> /etc/fstab\n';
    commands += 'fsck -fpy /dev/ufs/homefs\n';
    commands += 'mount ' + label.value + '\n';
    document.getElementById('storage-summary').innerHTML = summary;
    document.getElementById('storage-commands').innerHTML = commands;
}

function samba() {
    var workgroup = document.getElementById('samba-workgroup');
    var home = document.getElementById('samba-home');
    var shared = document.getElementById('samba-shared');
    var summary = workgroup.value.toUpperCase();
    var commands = 'pkg install -y samba48\n';
    warnBlank(workgroup);
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

function mail() {
    var alias = document.getElementById('mail-alias');
    var summary = '';
    var commands = '';
    if (!alias.value) {
        alias.value = firstTrustedUser.toLowerCase();
    }
    warnBlank(alias);
    summary += alias.value;
    commands += 'sed -i~ \'s/^# root:.*/root: ' + firstTrustedUser + '/\' /etc/mail/aliases\n';
    commands += 'newaliases\n';
    document.getElementById('mail-summary').innerHTML = summary;
    document.getElementById('mail-commands').innerHTML = commands;
}

/* TODO
function services() {
    var smtp = document.getElementById('services-smtp');

    var pop3 = document.getElementById('services-pop3');
    var www = document.getElementById('services-www');
    var monit = document.getElementById('services-monit');
    var summary = '';
    var commands = '';
    if (smtp.checked) {
        summary += 'SMTP ';
        commands += 'sysrc sendmail_enable="YES"\n';
        commands += 'sysrc sendmail_msp_queue_enable="YES"\n';
    }
    if (pop3.checked) {
        summary += 'POP3 ';
    }
    if (www.checked) {
        summary += 'Web';
    }
    if (monit.checked) {
        summary += 'Monit ';
    }
    summary += '</span>';
    document.getElementById('services-summary').innerHTML = summary;
    document.getElementById('services-commands').innerHTML = commands;
}
*/

function copyScript() {
}
