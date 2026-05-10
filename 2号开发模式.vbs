' 月下写作 - 开发模式启动器 (热更新 + 自动刷新)
' 双击启动，修改代码后浏览器会自动刷新，无需手动 rebuild

Option Explicit

Dim WshShell, FSO
Dim ProjPath, Port, Url, Timeout
Dim LogPath, StartTime, IsReady, Count

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' 自动获取本 VBS 文件所在目录作为项目路径
ProjPath = FSO.GetParentFolderName(WScript.ScriptFullName)
Port     = 5173
Url      = "http://localhost:" & Port
Timeout  = 60
LogPath  = ProjPath & "\dev.log"

If Not FSO.FolderExists(ProjPath) Then
    MsgBox "项目文件夹不存在:" & vbCrLf & ProjPath, vbCritical, "错误"
    WScript.Quit 1
End If

If Not FSO.FileExists(ProjPath & "\package.json") Then
    MsgBox "package.json 未找到:" & vbCrLf & ProjPath, vbCritical, "错误"
    WScript.Quit 1
End If

On Error Resume Next
Dim NodeVer
NodeVer = WshShell.Exec("node --version").StdOut.ReadLine()
If Err.Number <> 0 Or NodeVer = "" Then
    MsgBox "未找到 Node.js!" & vbCrLf & vbCrLf & "请先安装 Node.js" & vbCrLf & "https://nodejs.org", vbCritical, "错误"
    WScript.Quit 1
End If
On Error GoTo 0

If IsPortReady(Port) Then
    MsgBox "端口 " & Port & " 已被占用，开发服务器可能已在运行。" & vbCrLf & vbCrLf & "将直接打开浏览器。", vbInformation, "提示"
    OpenUrl Url
    WScript.Quit 0
End If

On Error Resume Next
FSO.DeleteFile LogPath, True
On Error GoTo 0

Dim Cmd
Cmd = "cmd /c cd /d """ & ProjPath & """ && npm run dev > """ & LogPath & """ 2>&1"
WshShell.Run Cmd, 0, False

StartTime = Timer
IsReady   = False
Count     = 0

Do While (Timer - StartTime) < Timeout
    WScript.Sleep 1500
    Count = Count + 1
    If IsPortReady(Port) Then
        IsReady = True
        Exit Do
    End If
Loop

If IsReady Then
    WScript.Sleep 1000
    OpenUrl Url
    MsgBox "开发模式已启动！" & vbCrLf & vbCrLf & "URL: " & Url & vbCrLf & vbCrLf & "修改代码后会自动刷新浏览器。" & vbCrLf & "关闭此窗口不会停止服务器。", vbInformation, "开发模式"
Else
    MsgBox "开发服务器在 " & Timeout & " 秒内未能启动。" & vbCrLf & vbCrLf & "请查看日志:" & vbCrLf & LogPath, vbExclamation, "超时"
End If

WScript.Quit 0

' --------------------------------------------------
Function IsPortReady(P)
    On Error Resume Next
    Dim Http
    Set Http = CreateObject("MSXML2.XMLHTTP")
    Http.Open "GET", "http://localhost:" & P, False
    Http.Send
    IsPortReady = (Err.Number = 0 And Http.Status >= 200 And Http.Status < 400)
    Set Http = Nothing
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