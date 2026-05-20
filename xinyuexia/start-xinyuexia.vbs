Option Explicit

Dim shell, fso, root, launcher, nodeExe, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Function ResolveNodeExe(projectRoot)
  Dim candidates, i
  candidates = Array( _
    "C:\Program Files\nodejs\node.exe", _
    "C:\Program Files (x86)\nodejs\node.exe", _
    projectRoot & "\node.exe" _
  )

  For i = 0 To UBound(candidates)
    If fso.FileExists(candidates(i)) Then
      ResolveNodeExe = candidates(i)
      Exit Function
    End If
  Next

  ResolveNodeExe = "node.exe"
End Function

root = fso.GetParentFolderName(WScript.ScriptFullName)
launcher = root & "\launch-xinyuexia.mjs"
nodeExe = ResolveNodeExe(root)

shell.CurrentDirectory = root
command = """" & nodeExe & """ """ & launcher & """ desktop"
shell.Run command, 0, False
