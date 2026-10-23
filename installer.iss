[Setup]
AppName=Deal Tracker
AppVersion=1.0.0
AppPublisher=Deal Tracker Team
AppPublisherURL=https://github.com/dealtracker
DefaultDirName={autopf}\Deal Tracker
DefaultGroupName=Deal Tracker
OutputDir=dist\installers
OutputBaseFilename=Deal-Tracker-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
SetupIconFile=public\icon.ico
UninstallDisplayIcon={app}\deal-tracker.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "dist\deal-tracker-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Deal Tracker"; Filename: "{app}\deal-tracker.exe"
Name: "{group}\{cm:UninstallProgram,Deal Tracker}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Deal Tracker"; Filename: "{app}\deal-tracker.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\deal-tracker.exe"; Description: "{cm:LaunchProgram,Deal Tracker}"; Flags: nowait postinstall skipifsilent