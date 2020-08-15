htdocs

The weenas-api is capable of serving up a limited number of static files.
This is the directory used to store those files. Sub-directories will not work.

The purpose of this functionality is to allow weenas-api to serve up its own
web-based administration pages and nothing more. If you're looking for a
general purpose web server, look elsewhere.

The only file extention / MIME type combinations recognized are:

* .css - text/css
* .html - text/html
* .ico - image/x-icon
* .js - text/javascript
* .jpg - image/jpeg
* .png - image/png
* .svg - image/svg+xml

Anything else is interpreted as a call to the API and will fail if a filename
is requested.
