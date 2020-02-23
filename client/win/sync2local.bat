@echo off
REM sync2local.bat -- Robocopy files down from server home directory.

REM Set server hostname below:
set servername=weenas

REM Map a drive to check connectivity and credentials.
path c:\Windows\System32
net use Z: \\%servername%\%username%
if %ERRORLEVEL% NEQ 0 goto END

echo Syncing Documents...
robocopy Z:\Documents D:\users\%username%\Documents /E /XO /XF .~lock.*

choice /T 15 /D Y /M "Sync Music folder"
if %ERRORLEVEL%==2 goto SKIPMUSIC
echo Syncing Music...
robocopy Z:\Music d:\users\%username%\Music /E /XO

:SKIPMUSIC
net use /DELETE Z:
echo Sync complete.

:END
pause