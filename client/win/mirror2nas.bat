@echo off
REM mirror2server.bat -- Robocopy files so that the server home directory exactly matches the local directory.

REM Set server hostname below:
set servername=weenas

echo.
echo Mirroring can potentially delete files from the server!
choice /T 15 /D N /M "Are you sure you want to do this"
if %ERRORLEVEL% NEQ 1 goto END

REM Map a drive to check connectivity and credentials.
path c:\Windows\System32
net use Z: \\%servername%\%username%
if %ERRORLEVEL% NEQ 0 goto END

echo Mirroring Documents...
robocopy D:\Users\%username%\Documents Z:\Documents /MIR

choice /T 15 /D N /M "Mirror Music folder"
if %ERRORLEVEL% NEQ 1 goto SKIPMUSIC
echo Mirroring Music...
robocopy d:\Users\%username%\Music Z:\Music /MIR

:SKIPMUSIC
net use /DELETE Z:
echo Mirror complete.

:END
pause