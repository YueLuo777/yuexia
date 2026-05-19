' YueXia Workbench - Dev Launcher (port 17328)

Option Explicit

Dim WshShell, FSO
Dim ProjPath, Port, Url, NodeModulesPath
Dim Cmd

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

ProjPath = FSO.GetParentFolderName(WScript.ScriptFullName)
Port     = 17328
Url      = "http://localhost:" & Port
NodeModulesPath = ProjPath & "\node_modules"

If Not FSO.FolderExists(ProjPath) Then
    MsgBox "Project folder not found:" & vbCrLf & ProjPath, vbCritical, "Error"
    WScript.Quit 1
End If

If Not FSO.FileExists(ProjPath & "\package.json") Then
    MsgBox "package.json not found:" & vbCrLf & ProjPath, vbCritical, "Error"
    WScript.Quit 1
End If

If Not FSO.FolderExists(NodeModulesPath) Then
    MsgBox "Project dependencies are missing." & vbCrLf & vbCrLf & _
           "Please run the following in the project folder first:" & vbCrLf & _
           "cmd /c npm install" & vbCrLf & vbCrLf & _
           "Project path:" & vbCrLf & ProjPath, vbCritical, "Error"
    WScript.Quit 1
End If

On Error Resume Next
Dim NodeVer
NodeVer = WshShell.Exec("node --version").StdOut.ReadLine()
If Err.Number <> 0 Or NodeVer = "" Then
    MsgBox "Node.js not found! Please install Node.js" & vbCrLf & "https://nodejs.org", vbCritical, "Error"
    WScript.Quit 1
End If
On Error GoTo 0

If IsPortReady(Port) Then
    OpenUrl Url
    WScript.Quit 0
End If

Cmd = "cmd /c cd /d """ & ProjPath & """ && node launcher\dev-launcher.cjs"
WshShell.Run Cmd, 0, False

WScript.Quit 0

Function IsPortReady(P)
    On Error Resume Next
    Dim Exec, Output
    Set Exec = WshShell.Exec("cmd /c netstat -ano | findstr :" & P & " ")
    Output = Exec.StdOut.ReadAll()
    IsPortReady = (Output <> "")
    Set Exec = Nothing
    On Error GoTo 0
End Function

Sub OpenUrl(U)
    On Error Resume Next
    WshShell.Run "explorer.exe """ & U & """", 1, False
    If Err.Number <> 0 Then
        WshShell.Run "cmd /c start """ & U & """", 1, False
    End If
    On Error GoTo 0
End Sub
