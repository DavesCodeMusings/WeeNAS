var networkGateway = '';  /* Global, because it's also used as a DNS provider choice. */

function refreshAll() {
    users();
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
    let host = document.getElementById('hostname-host');
    let domain = document.getElementById('hostname-domain');
    warnBlank(host);
    warnBlank(domain);
    let summary = host.value + '.' + domain.value;
    let commands = 'sysrc hostname="' + host.value + '.' + domain.value + '"\n';
    document.getElementById('hostname-summary').innerHTML = summary;
    document.getElementById('hostname-commands').innerHTML = commands;
}

function time() {
    let timezone = document.getElementById('time-area').value + '/' + document.getElementById('time-location').value;
    let summary = timezone;
    let commands = '';
    commands += 'sysrc ntpd_enable="YES"\n';
    commands += 'sysrc ntpd_sync_on_start="YES"\n';
    commands += 'ln -s /usr/share/zoneinfo/' + timezone + ' /etc/localtime\n';
    commands += 'service ntpd start\n';
    document.getElementById('time-summary').innerHTML = summary;
    document.getElementById('time-commands').innerHTML = commands;
}

function users() {
    let trusted = document.getElementById('user-trusted');
    warnBlank(trusted);
    let summary = trusted.value.toLowerCase();
    let commands = '\n# Creating shared group.\n';
    commands += 'pw groupadd shared -g 1000\n';  /* user groups start at 1001 and go up, 1000 is unused. */
    commands += '\n# Creating trusted user account(s). These are the users that can su to root.\n';
    /* .split(' ') on an empty string results in a length of 1, hence the conditional below. */
    if (trusted.value) {
        let userList = trusted.value.split(' ');
        for (let i = 0; i < userList.length; i++) {
            commands += 'smbpasswd -a ' + userList[i].toLowerCase() + '\n';
            commands += 'passwd ' + userList[i].toLowerCase() + '\n';
            commands += 'pw usermod ' + userList[i].toLowerCase() + ' -G shared,wheel -s /bin/sh\n';
        }
    }
    else {
        commands += "\n# Check the configuration!  There must be at least one trusted user.\n";
    }
    commands += '\n# Locking built-in accounts.\n';
    commands += 'pw lock toor\n';
    commands += 'pw lock freebsd\n';
    document.getElementById('user-summary').innerHTML = summary;
    document.getElementById('user-commands').innerHTML = commands;
}

function network() {
    let dhcp = document.getElementById('network-dhcp');
    let interface = document.getElementById('network-interface');
    let ipv4 = document.getElementById('network-ip');
    let mask = document.getElementById('network-mask');
    let gateway = document.getElementById('network-gateway');
    let summary = '';
    let commands = '';
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
    let dhcp = document.getElementById('dns-dhcp');
    let router = document.getElementById('dns-router');
    let google = document.getElementById('dns-google');
    let opendns = document.getElementById('dns-opendns');
    let other = document.getElementById('dns-other');
    let primary = document.getElementById('dns-primary');
    let secondary = document.getElementById('dns-secondary');
    let summary = '';
    let commands = '';
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
    let summary = '';
    let commands = '';
    let dev = document.getElementById('storage-dev');
    let label = document.getElementById('storage-label');
    let mount = document.getElementById('storage-mount');
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
    commands += '\n# Create a shared directory with sticky bit to help protect files.\n';
    commands += 'mkdir /home/shared\n';
    commands += 'chgrp 1000 /home/shared\n';
    commands += 'chmod 1775 /home/shared\n';
    document.getElementById('storage-summary').innerHTML = summary;
    document.getElementById('storage-commands').innerHTML = commands;
}

function samba() {
    let workgroup = document.getElementById('samba-workgroup');
    let shared = document.getElementById('samba-shared');
    let summary = workgroup.value.toUpperCase();
    let commands = 'pkg install -y samba410\n';
    warnBlank(workgroup);
    commands += '\n# Copy boilerplate Samba config file.\n';
    commands += 'cp /root/weenas/etc/smb4.conf /usr/local/etc/\n';
    if (workgroup.value.toUpperCase() !== 'WORKGROUP') {
        commands += '\n# Updating workgroup name.\n';
        commands += 'sed -i~ \'s/WORKGROUP/' + workgroup.value.toUpperCase() + '/\' /usr/local/etc/smb4.conf\n';
    }
    if (shared.value == 'Yes') {
        summary += ' with shared directory';
    }
    else {
        commands += '\n# Commenting out shared directory.\n';
        commands += 'sed -i~ \'/^\\[shared\\]/,$s/^/#/\' /usr/local/etc/smb4.conf\n';
    }
    commands += 'sysrc samba_server_enable="YES"\n';
    commands += 'service samba_server start\n';
    document.getElementById('samba-summary').innerHTML = summary;
    document.getElementById('samba-commands').innerHTML = commands;
}
