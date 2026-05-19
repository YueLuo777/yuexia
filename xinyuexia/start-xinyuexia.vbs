Option Explicit

Dim shell, fso, root, healthUrl, logFile, viteCommand, electronExe, electronCommand, i
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
healthUrl = "http://127.0.0.1:18328/"
logFile = root & "\dev-server.log"

shell.CurrentDirectory = root

If Not IsReady(healthUrl) Then
  If Not HasDevServerProcess() Then
    viteCommand = "cmd.exe /d /c ""cd /d """ & root & """ && npm.cmd run dev -- --host 127.0.0.1 --port 18328 >> """ & logFile & """ 2>&1"""
    shell.Run viteCommand, 0, False
  End If

  For i = 1 To 100
    If IsReady(healthUrl) Then Exit For
    WScript.Sleep 250
  Next
End If

electronExe = root & "\node_modules\electron\dist\electron.exe"
electronCommand = """" & electronExe & """ """ & root & "\electron\main.cjs"""
shell.Run electronCommand, 1, False

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

Function HasDevServerProcess()
  On Error Resume Next
  Dim wmi, processes, process, query
  query = "SELECT CommandLine FROM Win32_Process WHERE Name = 'node.exe' OR Name = 'cmd.exe'"
  Set wmi = GetObject("winmgmts:\\.\root\cimv2")
  Set processes = wmi.ExecQuery(query)
  HasDevServerProcess = False

  For Each process In processes
    If Not IsNull(process.CommandLine) Then
      If InStr(1, process.CommandLine, "xinyuexia", vbTextCompare) > 0 _
        And InStr(1, process.CommandLine, "18328", vbTextCompare) > 0 _
        And (InStr(1, process.CommandLine, "vite", vbTextCompare) > 0 _
          Or InStr(1, process.CommandLine, "npm.cmd run dev", vbTextCompare) > 0) Then
        HasDevServerProcess = True
        Exit Function
      End If
    End If
  Next

  On Error GoTo 0
End Function
