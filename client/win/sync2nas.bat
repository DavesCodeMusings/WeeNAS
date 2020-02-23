@echo off
REM sync2server.bat -- Robocopy files up to server home directory.

REM Set server hostname below:
set servername=weenas

REM Map a drive to check connectivity and credentials.
path c:\Windows\System32
net use Z: \\%servername%\%username%
if %ERRORLEVEL% NEQ 0 goto END

echo Syncing Documents...
robocopy D:\Users\%username%\Documents Z:\Documents /E /XO /XF .~lock.*

echo Syncing Warcraft Maps...
robocopy  "C:\Program Files (x86)\Warcraft II BNE\Maps\Horde" Z:\Maps /E /XO

choice /T 15 /D Y /M "Sync Music folder"
if %ERRORLEVEL% NEQ 1 goto SKIPMUSIC
echo Syncing Music...
robocopy d:\Users\%username%\Music Z:\Music /E /XO

:SKIPMUSIC
net use /DELETE Z:
echo Sync complete.

:END
pause