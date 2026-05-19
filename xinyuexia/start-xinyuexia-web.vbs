Option Explicit

Dim shell, fso, root, url, healthUrl, logFile, command, i
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
url = "http://127.0.0.1:18328/#/dashboard"
healthUrl = "http://127.0.0.1:18328/"
logFile = root & "\dev-server.log"

shell.CurrentDirectory = root

If Not IsReady(healthUrl) Then
  command = "cmd.exe /d /c ""cd /d """ & root & """ && npm.cmd run dev -- --host 127.0.0.1 --port 18328 >> """ & logFile & """ 2>&1"""
  shell.Run command, 0, False
  For i = 1 To 100
    If IsReady(healthUrl) Then Exit For
    WScript.Sleep 250
  Next
End If

shell.Run url, 1, False

Function IsReady(targetUrl)
  On Error Resume Next
  Dim http
  Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  http.setTimeouts 300, 300, 300, 300
  http.Open "GET", targetUrl, False
  http.Send
  IsReady = (Err.Number = 0 And http.Status >= 200 And http.Status < 500)
  Err.Clear
  On Error GoTo 0
End Function
