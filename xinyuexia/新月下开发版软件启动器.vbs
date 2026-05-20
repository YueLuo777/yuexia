Option Explicit

Dim shell, fso, root, launcher
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
launcher = root & "\start-xinyuexia.vbs"

shell.CurrentDirectory = root
shell.Run "wscript.exe """ & launcher & """", 0, False
