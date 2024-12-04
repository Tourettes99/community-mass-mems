Option Explicit
On Error Resume Next

Dim objShell, objFSO
Dim currentDir, psCommand

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get current directory
currentDir = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Build the PowerShell command
psCommand = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -NoProfile -File """ & currentDir & "\background_sync.ps1"""

' Run PowerShell script hidden
objShell.Run psCommand, 0, False

If Err.Number <> 0 Then
    MsgBox "Error: " & Err.Description, vbCritical, "Error Running Sync"
End If
