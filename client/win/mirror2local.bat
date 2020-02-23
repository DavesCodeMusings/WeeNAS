@echo off
REM mirror2local.bat -- Robocopy files so that the local directories exactly match the server.

REM Set server hostname below:
set servername=weenas

echo.
echo Mirroring can potentially delete files from this PC!
choice /T 15 /D N /M "Are you sure you want to do this"
if %ERRORLEVEL% NEQ 1 goto END

REM Map a drive to check connectivity and credentials.
path c:\Windows\System32
net use Z: \\%servername%\%username%
if %ERRORLEVEL% NEQ 0 goto END

echo Mirroring Documents...
robocopy Z:\Documents D:\users\%username%\Documents /MIR

choice /T 15 /D N /M "Mirror Music folder"
if %ERRORLEVEL%==2 goto SKIPMUSIC
echo Syncing Music...
robocopy Z:\Music d:\users\%username%\Music /MIR

:SKIPMUSIC
net use /DELETE Z:
echo Mirror complete.

:END
pause