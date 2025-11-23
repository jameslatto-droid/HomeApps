Set objShell = CreateObject("Shell.Application")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get the directory where this VBS file is located
strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
strPSScript = strScriptPath & "\Run-JimLBackup-GUI.ps1"

' Run PowerShell as Administrator - GUI will show itself
objShell.ShellExecute "powershell.exe", "-ExecutionPolicy Bypass -NoProfile -Command ""& '" & strPSScript & "'""", "", "runas", 0
