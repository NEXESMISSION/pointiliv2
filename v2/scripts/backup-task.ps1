# "Pointili backup" in Windows' Task Scheduler: scripts/backup.mjs every day at 13:00, and ten
# minutes after logging on (a day that already has its copy is skipped, so the two never make
# two). A computer that was off at 13:00 runs it as soon as it can; a failed run tries again
# every 30 minutes, three times. It runs out of sight: no window opens.
# (ASCII only: Windows PowerShell reads a file without a BOM as ANSI.)
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\backup-task.ps1
#   (again any time: it replaces the task; Unregister-ScheduledTask "Pointili backup" removes it)
$ErrorActionPreference = "Stop"
$v2 = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node).Source
$script = Join-Path $v2 "scripts\backup.mjs"
$user = "$env:USERDOMAIN\$env:USERNAME"

$daily = New-ScheduledTaskTrigger -Daily -At "13:00"
$logon = New-ScheduledTaskTrigger -AtLogOn -User $user
$logon.Delay = "PT10M"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RunOnlyIfNetworkAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 1) -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 30)
$about = "A copy of Pointili's database and logos into Desktop\Pointili Backups (v2\scripts\backup.mjs)."

# out of sight: as the user, whether or not a window can open (S4U: no password kept); or, where
# Windows refuses that without an administrator, in the user's session through a console with no window
try {
  $action = New-ScheduledTaskAction -Execute $node -Argument "`"$script`"" -WorkingDirectory $v2
  $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType S4U -RunLevel Limited
  Register-ScheduledTask -TaskName "Pointili backup" -Action $action -Trigger $daily, $logon -Settings $settings -Principal $principal -Description $about -Force | Out-Null
  Write-Output "registered (S4U): $node $script"
} catch {
  $action = New-ScheduledTaskAction -Execute "conhost.exe" -Argument "--headless `"$node`" `"$script`"" -WorkingDirectory $v2
  $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
  Register-ScheduledTask -TaskName "Pointili backup" -Action $action -Trigger $daily, $logon -Settings $settings -Principal $principal -Description $about -Force | Out-Null
  Write-Output "registered (interactive, headless console): $node $script - S4U refused: $($_.Exception.Message)"
}
