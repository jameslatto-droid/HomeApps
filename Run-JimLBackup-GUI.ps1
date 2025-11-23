#Requires -Version 5.1
<#
.SYNOPSIS
    GUI Backup script for JimL BitLocker-encrypted external drive.

.DESCRIPTION
    This script provides a graphical interface for backing up specified folders 
    from D: drive to the external JimL drive with visual progress tracking.

.NOTES
    Author: Senior Windows Automation Engineer
    Date: November 23, 2025
    Version: 2.0 (GUI Edition)
#>

# Try to hide the PowerShell console window
try {
    Add-Type -Name Window -Namespace Console -MemberDefinition '
    [DllImport("Kernel32.dll")]
    public static extern IntPtr GetConsoleWindow();

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, Int32 nCmdShow);
    ' -ErrorAction SilentlyContinue

    $consolePtr = [Console.Window]::GetConsoleWindow()
    if ($consolePtr -ne [IntPtr]::Zero) {
        [Console.Window]::ShowWindow($consolePtr, 0) | Out-Null
    }
} catch {
    # If console hiding fails, continue anyway
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName Microsoft.VisualBasic

# ============================================================================
# CONFIGURATION
# ============================================================================

$EXPECTED_VOLUME_LABEL = "JimL"

# Default backup mappings - will be loaded from config file if exists
$BackupMappings = @{
    "D:\Downloads"      = "Downloads"
    "D:\Onedrive PLK"   = "PLK"
    "D:\Onedrive DCT"   = "DCT"
}

# Default backup folder name (can be changed by user)
$script:BackupFolderName = "BK"

# Skip compression option (useful for long paths)
$script:SkipCompression = $false

# Configuration file path (will be set after drive detection)
$script:ConfigFilePath = ""

$RobocopyOptions = @("/MIR", "/R:3", "/W:5", "/NFL", "/NDL", "/NP", "/MT:8", "/256", "/XD", ".smart-env", "*_private", "/XF", "*.tmp", "~$*", "desktop.ini", ".DS_Store", "Thumbs.db", ".*", "*.ajson")

# ============================================================================
# GLOBAL VARIABLES
# ============================================================================

$script:backupDrive = $null
$script:cancelRequested = $false
$script:backupRunning = $false
$script:activityTimer = $null
$script:activityFrame = 0
$script:robocopyProcess = $null

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Enable-LongPaths {
    try {
        # Check if already enabled
        $currentValue = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -ErrorAction SilentlyContinue
        
        if ($currentValue.LongPathsEnabled -eq 1) {
            return $true
        }
        
        # Try to enable it
        New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force -ErrorAction Stop | Out-Null
        
        return $true
        
    } catch {
        return $false
    }
}

function Get-BackupDrive {
    $scriptDrive = Split-Path -Qualifier $PSScriptRoot
    
    if ([string]::IsNullOrEmpty($scriptDrive)) {
        return $null
    }
    
    try {
        $volume = Get-Volume -DriveLetter $scriptDrive.TrimEnd(':') -ErrorAction Stop
        
        if ($volume.FileSystemLabel -ne $EXPECTED_VOLUME_LABEL) {
            return $null
        }
        
        return $scriptDrive
        
    } catch {
        return $null
    }
}

function Test-DriveAccess {
    param([string]$DriveLetter)
    
    $backupRoot = Join-Path $DriveLetter "Backup"
    
    try {
        if (-not (Test-Path $backupRoot)) {
            New-Item -Path $backupRoot -ItemType Directory -Force | Out-Null
        }
        
        $testFile = Join-Path $backupRoot ".test_access"
        "test" | Out-File -FilePath $testFile -Force -ErrorAction Stop
        Remove-Item -Path $testFile -Force -ErrorAction SilentlyContinue
        
        return $true
        
    } catch {
        return $false
    }
}

function Update-Status {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    
    # Map color names to System.Drawing.Color objects
    $colorMap = @{
        "Black" = [System.Drawing.Color]::White
        "White" = [System.Drawing.Color]::White
        "Red" = [System.Drawing.Color]::FromArgb(220, 60, 60)
        "Green" = [System.Drawing.Color]::FromArgb(80, 220, 100)
        "Blue" = [System.Drawing.Color]::FromArgb(70, 130, 255)
        "Orange" = [System.Drawing.Color]::FromArgb(255, 160, 50)
        "Yellow" = [System.Drawing.Color]::FromArgb(255, 200, 50)
    }
    
    $actualColor = if ($colorMap.ContainsKey($Color)) { $colorMap[$Color] } else { [System.Drawing.Color]::White }
    
    $statusBox.SelectionStart = $statusBox.TextLength
    $statusBox.SelectionLength = 0
    $statusBox.SelectionColor = $actualColor
    $statusBox.AppendText("$Message`r`n")
    $statusBox.SelectionColor = $statusBox.ForeColor
    $statusBox.ScrollToCaret()
    
    [System.Windows.Forms.Application]::DoEvents()
}

function Start-ActivityIndicator {
    $script:activityFrame = 0
    
    # Create timer for animation
    $script:activityTimer = New-Object System.Windows.Forms.Timer
    $script:activityTimer.Interval = 150
    $script:activityTimer.Add_Tick({
        $frames = @("|", "/", "-", "\\", "|", "/", "-", "\\")
        $lblActivity.Text = $frames[$script:activityFrame % $frames.Length]
        $script:activityFrame++
        [System.Windows.Forms.Application]::DoEvents()
    })
    
    $lblActivity.Visible = $true
    $lblActivityText.Visible = $true
    $script:activityTimer.Start()
}

function Stop-ActivityIndicator {
    if ($script:activityTimer) {
        $script:activityTimer.Stop()
        $script:activityTimer.Dispose()
        $script:activityTimer = $null
    }
    $lblActivity.Visible = $false
    $lblActivityText.Visible = $false
}

function Save-Configuration {
    if (-not [string]::IsNullOrEmpty($script:ConfigFilePath)) {
        try {
            $config = @{
                BackupFolderName = $script:BackupFolderName
                SkipCompression = $script:SkipCompression
                Mappings = $BackupMappings
            }
            $config | ConvertTo-Json | Set-Content -Path $script:ConfigFilePath -Force
        } catch {
            # Silently fail - not critical
        }
    }
}

function Load-Configuration {
    if (-not [string]::IsNullOrEmpty($script:ConfigFilePath) -and (Test-Path $script:ConfigFilePath)) {
        try {
            $config = Get-Content -Path $script:ConfigFilePath -Raw | ConvertFrom-Json
            $script:BackupFolderName = $config.BackupFolderName
            
            if ($config.PSObject.Properties.Name -contains 'SkipCompression') {
                $script:SkipCompression = $config.SkipCompression
            }
            
            # Clear and reload mappings
            $BackupMappings.Clear()
            $config.Mappings.PSObject.Properties | ForEach-Object {
                $BackupMappings[$_.Name] = $_.Value
            }
            
            return $true
        } catch {
            return $false
        }
    }
    return $false
}

function Invoke-BackupWithProgress {
    $script:cancelRequested = $false
    $script:backupRunning = $true
    
    $btnStart.Enabled = $false
    $btnCancel.Enabled = $true
    $progressOverall.Value = 0
    $progressCurrent.Value = 0
    $statusBox.Clear()
    
    Start-ActivityIndicator
    
    # Validate drive
    Update-Status "Detecting backup drive..." "Blue"
    $script:backupDrive = Get-BackupDrive
    
    if (-not $script:backupDrive) {
        Update-Status "ERROR: Could not detect JimL drive!" "Red"
        Update-Status "Please ensure you're running this from the JimL drive." "Red"
        $script:backupRunning = $false
        $btnStart.Enabled = $true
        $btnCancel.Enabled = $false
        return
    }
    
    Update-Status "[OK] Found backup drive: $script:backupDrive" "Green"
    $lblDrive.Text = "$script:backupDrive (JimL) - Backup in progress..."
    $lblDrive.ForeColor = [System.Drawing.Color]::FromArgb(70, 130, 255)
    $lblStatusIcon.Text = "..."
    $lblStatusIcon.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
    $lblStatusIcon.ForeColor = [System.Drawing.Color]::FromArgb(70, 130, 255)
    
    # Test access
    if (-not (Test-DriveAccess -DriveLetter $script:backupDrive)) {
        Update-Status "ERROR: Cannot access backup drive. Is BitLocker unlocked?" "Red"
        $script:backupRunning = $false
        $btnStart.Enabled = $true
        $btnCancel.Enabled = $false
        return
    }
    
    Update-Status "[OK] Drive is accessible and writable" "Green"
    Update-Status "" "Black"
    
    # Count total folders
    $totalFolders = $BackupMappings.Keys.Count
    $currentFolder = 0
    $backupRoot = Join-Path $script:backupDrive $script:BackupFolderName
    $failedBackups = @()
    
    # Backup each folder
    foreach ($source in $BackupMappings.Keys) {
        if ($script:cancelRequested) {
            Update-Status "Backup cancelled by user." "Orange"
            break
        }
        
        $currentFolder++
        $destFolderName = $BackupMappings[$source]
        $destination = Join-Path $backupRoot $destFolderName
        
        $progressOverall.Value = [int](($currentFolder / ($totalFolders + 1)) * 100)
        $lblCurrentTask.Text = "Backing up: $source"
        
        Update-Status "========================================" "Blue"
        Update-Status "[$currentFolder/$totalFolders] $source -> $destFolderName" "Blue"
        
        # Check if source exists
        if (-not (Test-Path $source)) {
            Update-Status "[WARN] Source folder not found - skipping" "Orange"
            Update-Status "" "Black"
            continue
        }
        
        # Create destination
        if (-not (Test-Path $destination)) {
            New-Item -Path $destination -ItemType Directory -Force | Out-Null
        }
        
        # Run robocopy
        $progressCurrent.Value = 0
        Update-Status "Running robocopy..." "White"
        $lblActivityText.Text = "Transferring files..."
        $lblStats.Visible = $true
        
        $robocopyArgs = @("`"$source`"", "`"$destination`"") + $RobocopyOptions
        
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        
        # Start robocopy with output capture
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "robocopy.exe"
        $psi.Arguments = $robocopyArgs -join " "
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        
        $script:robocopyProcess = [System.Diagnostics.Process]::Start($psi)
        
        # Read output asynchronously for statistics
        $outputBuffer = New-Object System.Text.StringBuilder
        $errorBuffer = New-Object System.Text.StringBuilder
        $script:robocopyProcess.OutputDataReceived.Add({
            param($sender, $e)
            if ($e.Data) {
                [void]$outputBuffer.AppendLine($e.Data)
            }
        })
        $script:robocopyProcess.ErrorDataReceived.Add({
            param($sender, $e)
            if ($e.Data) {
                [void]$errorBuffer.AppendLine($e.Data)
            }
        })
        $script:robocopyProcess.BeginOutputReadLine()
        $script:robocopyProcess.BeginErrorReadLine()
        
        # Wait for completion or cancellation with live updates
        $lastUpdate = [DateTime]::Now
        while (-not $script:robocopyProcess.HasExited) {
            if ($script:cancelRequested) {
                try {
                    $script:robocopyProcess.Kill()
                    $script:robocopyProcess.WaitForExit(2000)
                } catch {}
                break
            }
            
            # Update stats every 500ms
            if (([DateTime]::Now - $lastUpdate).TotalMilliseconds -gt 500) {
                $output = $outputBuffer.ToString()
                
                # Parse robocopy output for statistics
                if ($output -match "Files\s*:\s*(\d+)") {
                    $totalFiles = $matches[1]
                }
                if ($output -match "Bytes\s*:\s*([\d\.]+\s*[kmgt]?)") {
                    $totalBytes = $matches[1]
                }
                if ($output -match "Speed\s*:\s*([\d,]+)\s*Bytes/sec") {
                    $speed = [int]($matches[1] -replace ',','')
                    $speedMB = [math]::Round($speed / 1MB, 2)
                    $lblStats.Text = "Files: $totalFiles | Size: $totalBytes | Speed: $speedMB MB/s | Elapsed: $([math]::Round($sw.Elapsed.TotalSeconds, 1))s"
                } else {
                    $lblStats.Text = "Scanning files... Elapsed: $([math]::Round($sw.Elapsed.TotalSeconds, 1))s"
                }
                
                $lastUpdate = [DateTime]::Now
                [System.Windows.Forms.Application]::DoEvents()
            }
            
            Start-Sleep -Milliseconds 100
            [System.Windows.Forms.Application]::DoEvents()
        }
        
        $sw.Stop()
        $lblStats.Visible = $false
        $exitCode = if ($script:robocopyProcess.HasExited) { $script:robocopyProcess.ExitCode } else { 999 }
        $elapsed = $sw.Elapsed.TotalSeconds
        
        # Save full robocopy output to log file for debugging
        $logFile = Join-Path $backupRoot "robocopy_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
        $fullOutput = $outputBuffer.ToString()
        try {
            $fullOutput | Out-File -FilePath $logFile -Encoding UTF8 -ErrorAction SilentlyContinue
        } catch {}
        
        $progressCurrent.Value = 100
        
        if ($exitCode -ge 8) {
            Update-Status "[FAIL] FAILED (exit code: $exitCode)" "Red"
            
            # Decode robocopy exit code
            $errorMsg = switch ($exitCode) {
                8  { "Some files or directories could not be copied" }
                9  { "Files copied + extra files/dirs exist + some failed" }
                10 { "Serious error - access denied or file in use" }
                16 { "Serious error - robocopy did not copy any files" }
                default { "Unknown error occurred" }
            }
            Update-Status "[INFO] $errorMsg" "Orange"
            
            # Show error output if available
            $errors = $errorBuffer.ToString().Trim()
            if ($errors) {
                Update-Status "[ERROR] $($errors.Split("`n")[0])" "Red"
            }
            
            # Check for path length issues
            if ($exitCode -eq 8 -or $exitCode -eq 16) {
                Update-Status "[WARN] Some files exceed Windows 260-character path limit" "Orange"
                Update-Status "[TIP] Enable Long Paths: Run as Admin in PowerShell:" "Yellow"
                Update-Status "      New-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name 'LongPathsEnabled' -Value 1 -Force" "White"
                Update-Status "[TIP] Or backup specific subfolders with shorter paths" "Yellow"
            }
            
            $failedBackups += $source
        } elseif ($exitCode -eq 0) {
            Update-Status "[OK] No changes needed (${elapsed}s)" "Green"
        } else {
            Update-Status "[OK] Completed successfully (${elapsed}s, exit code: $exitCode)" "Green"
        }
        
        Update-Status "" "Black"
    }
    
    # Compression
    if (-not $script:cancelRequested) {
        if ($script:SkipCompression) {
            Update-Status "Skipping compression (disabled in settings)" "Yellow"
        } else {
            $progressOverall.Value = [int]((($totalFolders) / ($totalFolders + 1)) * 100)
            $lblCurrentTask.Text = "Creating compressed archive..."
            
            Update-Status "========================================" "Blue"
            Update-Status "Creating ZIP archive..." "Blue"
        
        $archivePath = Join-Path $backupRoot "Backup_Archive.zip"
        
        # Remove old archive
        if (Test-Path $archivePath) {
            Update-Status "Removing old archive..." "Black"
            Remove-Item -Path $archivePath -Force -ErrorAction SilentlyContinue
        }
        
        # Get items to compress
        $itemsToCompress = Get-ChildItem -Path $backupRoot | Where-Object { $_.Name -ne "Backup_Archive.zip" }
        
        if ($itemsToCompress.Count -eq 0) {
            Update-Status "[WARN] No items to compress" "Orange"
        } else {
            Update-Status "Compressing $($itemsToCompress.Count) folders..." "Black"
            $lblActivityText.Text = "Creating archive..."
            
            try {
                $progressCurrent.Value = 0
                $itemCount = 0
                
                foreach ($item in $itemsToCompress) {
                    if ($script:cancelRequested) { break }
                    
                    $itemCount++
                    $progressCurrent.Value = [int](($itemCount / $itemsToCompress.Count) * 100)
                    Update-Status "  Adding: $($item.Name)" "Black"
                    
                    # Keep UI responsive
                    [System.Windows.Forms.Application]::DoEvents()
                    
                    if (Test-Path $archivePath) {
                        Compress-Archive -Path $item.FullName -DestinationPath $archivePath -Update -ErrorAction Stop
                    } else {
                        Compress-Archive -Path $item.FullName -DestinationPath $archivePath -ErrorAction Stop
                    }
                    
                    # Keep UI responsive after compression
                    [System.Windows.Forms.Application]::DoEvents()
                }
                
                if (-not $script:cancelRequested) {
                    $archiveSize = (Get-Item $archivePath).Length / 1MB
                    Update-Status "[OK] Archive created: $([math]::Round($archiveSize, 2)) MB" "Green"
                }
                
            } catch {
                Update-Status "[FAIL] Compression failed: $($_.Exception.Message)" "Red"
                Update-Status "[WARN] Skipping compression due to long file paths" "Orange"
                Update-Status "[INFO] Your backups are still safe in the individual folders" "White"
                Update-Status "[TIP] You can disable compression in settings to avoid this" "Yellow"
            }
        }
    }
}
    
    # Summary
    $progressOverall.Value = 100
    $progressCurrent.Value = 100
    $lblCurrentTask.Text = "Backup complete!"
    Stop-ActivityIndicator
    
    Update-Status "" "Black"
    Update-Status "========================================" "Blue"
    Update-Status "BACKUP SUMMARY" "Blue"
    Update-Status "========================================" "Blue"
    
    if ($script:cancelRequested) {
        Update-Status "Status: CANCELLED" "Orange"
    } elseif ($failedBackups.Count -eq 0) {
        Update-Status "Status: SUCCESS" "Green"
        Update-Status "All backups completed successfully!" "Green"
    } else {
        Update-Status "Status: COMPLETED WITH ERRORS" "Orange"
        Update-Status "Failed backups:" "Orange"
        foreach ($failed in $failedBackups) {
            Update-Status "  - $failed" "Red"
        }
    }
    
    $script:backupRunning = $false
    $btnStart.Enabled = $true
    $btnCancel.Enabled = $false
}

# ============================================================================
# GUI CONSTRUCTION
# ============================================================================

# Main Form
$form = New-Object System.Windows.Forms.Form
$form.Text = ""
$form.Size = New-Object System.Drawing.Size(750, 750)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "None"
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(30, 35, 50)
$form.ForeColor = [System.Drawing.Color]::White

# Add rounded corners effect (simulate with border)
$form.Region = New-Object System.Drawing.Region([System.Drawing.Rectangle]::new(0, 0, 750, 750))

# Handle form closing event
$form.Add_FormClosing({
    param($sender, $e)
    
    if ($script:backupRunning -and -not $script:cancelRequested) {
        $result = [System.Windows.Forms.MessageBox]::Show("Backup is currently running. Are you sure you want to cancel and exit?", "Confirm Exit", "YesNo", "Warning")
        if ($result -eq "No") {
            $e.Cancel = $true
            return
        }
    }
    
    # Kill robocopy if running
    $script:cancelRequested = $true
    if ($script:robocopyProcess -and -not $script:robocopyProcess.HasExited) {
        try {
            $script:robocopyProcess.Kill()
            $script:robocopyProcess.WaitForExit(1000)
        } catch {}
    }
    
    Stop-ActivityIndicator
})

# Close Button
$btnClose = New-Object System.Windows.Forms.Button
$btnClose.Location = New-Object System.Drawing.Point(700, 20)
$btnClose.Size = New-Object System.Drawing.Size(30, 30)
$btnClose.Text = "X"
$btnClose.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$btnClose.BackColor = [System.Drawing.Color]::Transparent
$btnClose.ForeColor = [System.Drawing.Color]::FromArgb(150, 150, 150)
$btnClose.FlatStyle = "Flat"
$btnClose.FlatAppearance.BorderSize = 0
$btnClose.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnClose.Add_Click({ 
    if ($script:backupRunning) {
        $result = [System.Windows.Forms.MessageBox]::Show("Backup is currently running. Are you sure you want to cancel and exit?", "Confirm Exit", "YesNo", "Warning")
        if ($result -eq "Yes") {
            $script:cancelRequested = $true
            
            # Kill robocopy if running
            if ($script:robocopyProcess -and -not $script:robocopyProcess.HasExited) {
                try {
                    $script:robocopyProcess.Kill()
                } catch {}
            }
            
            Stop-ActivityIndicator
            $form.Close()
        }
    } else {
        $form.Close()
    }
})
$form.Controls.Add($btnClose)

# Title Label
$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Location = New-Object System.Drawing.Point(40, 30)
$lblTitle.Size = New-Object System.Drawing.Size(500, 35)
$lblTitle.Text = "JimL Backup System"
$lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
$lblTitle.ForeColor = [System.Drawing.Color]::White
$lblTitle.BackColor = [System.Drawing.Color]::Transparent
$form.Controls.Add($lblTitle)

# Version Label
$lblVersion = New-Object System.Windows.Forms.Label
$lblVersion.Location = New-Object System.Drawing.Point(345, 38)
$lblVersion.Size = New-Object System.Drawing.Size(100, 25)
$lblVersion.Text = "v2.0"
$lblVersion.Font = New-Object System.Drawing.Font("Segoe UI", 12)
$lblVersion.ForeColor = [System.Drawing.Color]::FromArgb(120, 120, 140)
$lblVersion.BackColor = [System.Drawing.Color]::Transparent
$form.Controls.Add($lblVersion)

# Status Icon and Label Panel
$pnlStatus = New-Object System.Windows.Forms.Panel
$pnlStatus.Location = New-Object System.Drawing.Point(40, 85)
$pnlStatus.Size = New-Object System.Drawing.Size(670, 50)
$pnlStatus.BackColor = [System.Drawing.Color]::Transparent
$form.Controls.Add($pnlStatus)

# Drive Status Icon
$lblStatusIcon = New-Object System.Windows.Forms.Label
$lblStatusIcon.Location = New-Object System.Drawing.Point(0, 5)
$lblStatusIcon.Size = New-Object System.Drawing.Size(40, 40)
$lblStatusIcon.Text = "!"
$lblStatusIcon.Font = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Bold)
$lblStatusIcon.ForeColor = [System.Drawing.Color]::FromArgb(220, 60, 60)
$lblStatusIcon.TextAlign = "MiddleCenter"
$lblStatusIcon.BackColor = [System.Drawing.Color]::Transparent
$pnlStatus.Controls.Add($lblStatusIcon)

# Drive Label
$lblDrive = New-Object System.Windows.Forms.Label
$lblDrive.Location = New-Object System.Drawing.Point(50, 10)
$lblDrive.Size = New-Object System.Drawing.Size(600, 30)
$lblDrive.Text = "NOT DETECTED"
$lblDrive.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$lblDrive.ForeColor = [System.Drawing.Color]::FromArgb(220, 60, 60)
$lblDrive.BackColor = [System.Drawing.Color]::Transparent
$pnlStatus.Controls.Add($lblDrive)

# Current Task Label
$lblCurrentTask = New-Object System.Windows.Forms.Label
$lblCurrentTask.Location = New-Object System.Drawing.Point(40, 145)
$lblCurrentTask.Size = New-Object System.Drawing.Size(670, 25)
$lblCurrentTask.Text = "Ready to start backup"
$lblCurrentTask.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$lblCurrentTask.ForeColor = [System.Drawing.Color]::FromArgb(160, 160, 180)
$lblCurrentTask.BackColor = [System.Drawing.Color]::Transparent
$form.Controls.Add($lblCurrentTask)

# Transfer Statistics Label
$lblStats = New-Object System.Windows.Forms.Label
$lblStats.Location = New-Object System.Drawing.Point(40, 170)
$lblStats.Size = New-Object System.Drawing.Size(670, 20)
$lblStats.Text = ""
$lblStats.Font = New-Object System.Drawing.Font("Consolas", 9)
$lblStats.ForeColor = [System.Drawing.Color]::FromArgb(70, 130, 255)
$lblStats.BackColor = [System.Drawing.Color]::Transparent
$lblStats.Visible = $false
$form.Controls.Add($lblStats)

# Activity Indicator (Spinner)
$lblActivity = New-Object System.Windows.Forms.Label
$lblActivity.Location = New-Object System.Drawing.Point(600, 145)
$lblActivity.Size = New-Object System.Drawing.Size(30, 25)
$lblActivity.Text = "|"
$lblActivity.Font = New-Object System.Drawing.Font("Consolas", 14, [System.Drawing.FontStyle]::Bold)
$lblActivity.ForeColor = [System.Drawing.Color]::FromArgb(70, 130, 255)
$lblActivity.BackColor = [System.Drawing.Color]::Transparent
$lblActivity.TextAlign = "MiddleCenter"
$lblActivity.Visible = $false
$form.Controls.Add($lblActivity)

# Activity Text
$lblActivityText = New-Object System.Windows.Forms.Label
$lblActivityText.Location = New-Object System.Drawing.Point(630, 145)
$lblActivityText.Size = New-Object System.Drawing.Size(80, 25)
$lblActivityText.Text = "Working..."
$lblActivityText.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$lblActivityText.ForeColor = [System.Drawing.Color]::FromArgb(70, 130, 255)
$lblActivityText.BackColor = [System.Drawing.Color]::Transparent
$lblActivityText.Visible = $false
$form.Controls.Add($lblActivityText)

# Folder Configuration Section
$lblFolders = New-Object System.Windows.Forms.Label
$lblFolders.Location = New-Object System.Drawing.Point(40, 200)
$lblFolders.Size = New-Object System.Drawing.Size(300, 22)
$lblFolders.Text = "Backup Folders Configuration"
$lblFolders.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$lblFolders.ForeColor = [System.Drawing.Color]::White
$lblFolders.BackColor = [System.Drawing.Color]::Transparent
$form.Controls.Add($lblFolders)

# Backup folder name setting
$lblBackupFolder = New-Object System.Windows.Forms.Label
$lblBackupFolder.Location = New-Object System.Drawing.Point(360, 200)
$lblBackupFolder.Size = New-Object System.Drawing.Size(80, 22)
$lblBackupFolder.Text = "Backup To:"
$lblBackupFolder.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$lblBackupFolder.ForeColor = [System.Drawing.Color]::FromArgb(160, 160, 180)
$lblBackupFolder.BackColor = [System.Drawing.Color]::Transparent
$form.Controls.Add($lblBackupFolder)

$txtBackupFolder = New-Object System.Windows.Forms.TextBox
$txtBackupFolder.Location = New-Object System.Drawing.Point(445, 198)
$txtBackupFolder.Size = New-Object System.Drawing.Size(80, 25)
$txtBackupFolder.Text = $script:BackupFolderName
$txtBackupFolder.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$txtBackupFolder.BackColor = [System.Drawing.Color]::FromArgb(40, 45, 60)
$txtBackupFolder.ForeColor = [System.Drawing.Color]::White
$txtBackupFolder.BorderStyle = "FixedSingle"
$txtBackupFolder.Add_TextChanged({
    $script:BackupFolderName = $txtBackupFolder.Text
    Save-Configuration
})
$form.Controls.Add($txtBackupFolder)

# Skip compression checkbox
$chkSkipCompression = New-Object System.Windows.Forms.CheckBox
$chkSkipCompression.Location = New-Object System.Drawing.Point(545, 200)
$chkSkipCompression.Size = New-Object System.Drawing.Size(18, 18)
$chkSkipCompression.Checked = $script:SkipCompression
$chkSkipCompression.BackColor = [System.Drawing.Color]::Transparent
$chkSkipCompression.FlatStyle = "Flat"
$chkSkipCompression.Add_CheckedChanged({
    $script:SkipCompression = $chkSkipCompression.Checked
    Save-Configuration
})
$form.Controls.Add($chkSkipCompression)

$lblSkipZip = New-Object System.Windows.Forms.Label
$lblSkipZip.Location = New-Object System.Drawing.Point(567, 198)
$lblSkipZip.Size = New-Object System.Drawing.Size(60, 22)
$lblSkipZip.Text = "Skip ZIP"
$lblSkipZip.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$lblSkipZip.ForeColor = [System.Drawing.Color]::FromArgb(160, 160, 180)
$lblSkipZip.BackColor = [System.Drawing.Color]::Transparent
$form.Controls.Add($lblSkipZip)

# Folder List DataGridView
$dgvFolders = New-Object System.Windows.Forms.DataGridView
$dgvFolders.Location = New-Object System.Drawing.Point(40, 230)
$dgvFolders.Size = New-Object System.Drawing.Size(670, 150)
$dgvFolders.BackgroundColor = [System.Drawing.Color]::FromArgb(20, 25, 35)
$dgvFolders.ForeColor = [System.Drawing.Color]::White
$dgvFolders.GridColor = [System.Drawing.Color]::FromArgb(50, 55, 70)
$dgvFolders.BorderStyle = "None"
$dgvFolders.ColumnHeadersDefaultCellStyle.BackColor = [System.Drawing.Color]::FromArgb(40, 45, 60)
$dgvFolders.ColumnHeadersDefaultCellStyle.ForeColor = [System.Drawing.Color]::White
$dgvFolders.ColumnHeadersDefaultCellStyle.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$dgvFolders.EnableHeadersVisualStyles = $false
$dgvFolders.DefaultCellStyle.BackColor = [System.Drawing.Color]::FromArgb(30, 35, 50)
$dgvFolders.DefaultCellStyle.ForeColor = [System.Drawing.Color]::White
$dgvFolders.DefaultCellStyle.SelectionBackColor = [System.Drawing.Color]::FromArgb(70, 130, 255)
$dgvFolders.DefaultCellStyle.SelectionForeColor = [System.Drawing.Color]::White
$dgvFolders.AllowUserToAddRows = $false
$dgvFolders.AllowUserToDeleteRows = $false
$dgvFolders.ReadOnly = $true
$dgvFolders.SelectionMode = "FullRowSelect"
$dgvFolders.MultiSelect = $false
$dgvFolders.RowHeadersVisible = $false
$dgvFolders.AutoSizeColumnsMode = "Fill"

# Add columns
$colSource = New-Object System.Windows.Forms.DataGridViewTextBoxColumn
$colSource.Name = "Source"
$colSource.HeaderText = "Source Folder"
$colSource.FillWeight = 60
$dgvFolders.Columns.Add($colSource)

$colDest = New-Object System.Windows.Forms.DataGridViewTextBoxColumn
$colDest.Name = "Destination"
$colDest.HeaderText = "Destination Name"
$colDest.FillWeight = 40
$dgvFolders.Columns.Add($colDest)

# Populate with current mappings
foreach ($source in $BackupMappings.Keys) {
    $dgvFolders.Rows.Add($source, $BackupMappings[$source])
}

$form.Controls.Add($dgvFolders)

# Folder management buttons
$btnAddFolder = New-Object System.Windows.Forms.Button
$btnAddFolder.Location = New-Object System.Drawing.Point(40, 395)
$btnAddFolder.Size = New-Object System.Drawing.Size(80, 30)
$btnAddFolder.Text = "Add"
$btnAddFolder.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$btnAddFolder.BackColor = [System.Drawing.Color]::FromArgb(50, 130, 80)
$btnAddFolder.ForeColor = [System.Drawing.Color]::White
$btnAddFolder.FlatStyle = "Flat"
$btnAddFolder.FlatAppearance.BorderSize = 0
$btnAddFolder.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnAddFolder.Add_Click({
    # Browse for source folder
    $folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog
    $folderBrowser.Description = "Select source folder to backup"
    $folderBrowser.ShowNewFolderButton = $false
    
    if ($folderBrowser.ShowDialog() -eq "OK") {
        $sourcePath = $folderBrowser.SelectedPath
        $folderName = [System.IO.Path]::GetFileName($sourcePath)
        
        # Prompt for destination name
        $destName = [Microsoft.VisualBasic.Interaction]::InputBox("Enter destination folder name:", "Destination Name", $folderName)
        
        if (-not [string]::IsNullOrWhiteSpace($destName)) {
            # Add to grid and hashtable
            $dgvFolders.Rows.Add($sourcePath, $destName)
            $BackupMappings[$sourcePath] = $destName
            Save-Configuration
        }
    }
})
$form.Controls.Add($btnAddFolder)

$btnRemoveFolder = New-Object System.Windows.Forms.Button
$btnRemoveFolder.Location = New-Object System.Drawing.Point(130, 395)
$btnRemoveFolder.Size = New-Object System.Drawing.Size(80, 30)
$btnRemoveFolder.Text = "Remove"
$btnRemoveFolder.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$btnRemoveFolder.BackColor = [System.Drawing.Color]::FromArgb(150, 50, 50)
$btnRemoveFolder.ForeColor = [System.Drawing.Color]::White
$btnRemoveFolder.FlatStyle = "Flat"
$btnRemoveFolder.FlatAppearance.BorderSize = 0
$btnRemoveFolder.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnRemoveFolder.Add_Click({
    if ($dgvFolders.SelectedRows.Count -gt 0) {
        $selectedRow = $dgvFolders.SelectedRows[0]
        $sourcePath = $selectedRow.Cells[0].Value
        
        # Remove from hashtable
        $BackupMappings.Remove($sourcePath)
        
        # Remove from grid
        $dgvFolders.Rows.Remove($selectedRow)
        
        Save-Configuration
    }
})
$form.Controls.Add($btnRemoveFolder)

# Overall Progress Label
$lblOverall = New-Object System.Windows.Forms.Label
$lblOverall.Location = New-Object System.Drawing.Point(40, 435)
$lblOverall.Size = New-Object System.Drawing.Size(670, 22)
$lblOverall.Text = "Overall Progress"
$lblOverall.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$lblOverall.ForeColor = [System.Drawing.Color]::White
$lblOverall.BackColor = [System.Drawing.Color]::Transparent
$form.Controls.Add($lblOverall)

# Overall Progress Bar
$progressOverall = New-Object System.Windows.Forms.ProgressBar
$progressOverall.Location = New-Object System.Drawing.Point(40, 462)
$progressOverall.Size = New-Object System.Drawing.Size(670, 12)
$progressOverall.Style = "Continuous"
$progressOverall.ForeColor = [System.Drawing.Color]::FromArgb(70, 130, 255)
$form.Controls.Add($progressOverall)

# Current Task Progress Label
$lblCurrent = New-Object System.Windows.Forms.Label
$lblCurrent.Location = New-Object System.Drawing.Point(40, 485)
$lblCurrent.Size = New-Object System.Drawing.Size(670, 22)
$lblCurrent.Text = "Current Task Progress"
$lblCurrent.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$lblCurrent.ForeColor = [System.Drawing.Color]::White
$lblCurrent.BackColor = [System.Drawing.Color]::Transparent
$form.Controls.Add($lblCurrent)

# Current Progress Bar
$progressCurrent = New-Object System.Windows.Forms.ProgressBar
$progressCurrent.Location = New-Object System.Drawing.Point(40, 512)
$progressCurrent.Size = New-Object System.Drawing.Size(670, 12)
$progressCurrent.Style = "Continuous"
$progressCurrent.ForeColor = [System.Drawing.Color]::FromArgb(70, 130, 255)
$form.Controls.Add($progressCurrent)

# Status RichTextBox
$statusBox = New-Object System.Windows.Forms.RichTextBox
$statusBox.Location = New-Object System.Drawing.Point(40, 535)
$statusBox.Size = New-Object System.Drawing.Size(670, 115)
$statusBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$statusBox.BackColor = [System.Drawing.Color]::FromArgb(20, 25, 35)
$statusBox.ForeColor = [System.Drawing.Color]::FromArgb(200, 200, 210)
$statusBox.ReadOnly = $true
$statusBox.BorderStyle = "None"
$form.Controls.Add($statusBox)

# Info Label
$lblInfo = New-Object System.Windows.Forms.Label
$lblInfo.Location = New-Object System.Drawing.Point(40, 660)
$lblInfo.Size = New-Object System.Drawing.Size(450, 45)
$lblInfo.Text = "Configure folders above, then click Start Backup.`nBackup will be stored on the JimL drive."
$lblInfo.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$lblInfo.ForeColor = [System.Drawing.Color]::FromArgb(120, 120, 140)
$lblInfo.BackColor = [System.Drawing.Color]::Transparent
$form.Controls.Add($lblInfo)

# Start Button
$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Location = New-Object System.Drawing.Point(510, 685)
$btnStart.Size = New-Object System.Drawing.Size(110, 45)
$btnStart.Text = "Start Backup"
$btnStart.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$btnStart.BackColor = [System.Drawing.Color]::FromArgb(70, 130, 255)
$btnStart.ForeColor = [System.Drawing.Color]::White
$btnStart.FlatStyle = "Flat"
$btnStart.FlatAppearance.BorderSize = 0
$btnStart.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(70, 130, 255)
$btnStart.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnStart.Add_Click({
    Invoke-BackupWithProgress
})
$form.Controls.Add($btnStart)

# Cancel Button
$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Location = New-Object System.Drawing.Point(630, 685)
$btnCancel.Size = New-Object System.Drawing.Size(80, 45)
$btnCancel.Text = "Cancel"
$btnCancel.Font = New-Object System.Drawing.Font("Segoe UI", 11)
$btnCancel.BackColor = [System.Drawing.Color]::FromArgb(150, 50, 50)
$btnCancel.ForeColor = [System.Drawing.Color]::White
$btnCancel.FlatStyle = "Flat"
$btnCancel.FlatAppearance.BorderSize = 0
$btnCancel.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnCancel.Enabled = $false
$btnCancel.Add_Click({
    if (-not $script:cancelRequested) {
        $script:cancelRequested = $true
        $btnCancel.Text = "Cancelling..."
        $btnCancel.BackColor = [System.Drawing.Color]::FromArgb(100, 100, 100)
        Update-Status "Cancelling backup..." "Orange"
        
        # Try to kill robocopy process
        if ($script:robocopyProcess -and -not $script:robocopyProcess.HasExited) {
            try {
                $script:robocopyProcess.Kill()
            } catch {}
        }
    }
})
$form.Controls.Add($btnCancel)

# ============================================================================
# INITIALIZATION
# ============================================================================

# Initial drive detection
$script:backupDrive = Get-BackupDrive

if ($script:backupDrive) {
    # Set config file path
    $script:ConfigFilePath = Join-Path $script:backupDrive "JimL_Backup_Config.json"
    
    # Load saved configuration
    if (Load-Configuration) {
        # Reload grid with saved mappings
        $dgvFolders.Rows.Clear()
        foreach ($source in $BackupMappings.Keys) {
            $dgvFolders.Rows.Add($source, $BackupMappings[$source])
        }
        $txtBackupFolder.Text = $script:BackupFolderName
        $chkSkipCompression.Checked = $script:SkipCompression
    }
    
    $lblDrive.Text = "$script:backupDrive (JimL) - Ready"
    $lblDrive.ForeColor = [System.Drawing.Color]::FromArgb(80, 220, 100)
    $lblStatusIcon.Text = "OK"
    $lblStatusIcon.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
    $lblStatusIcon.ForeColor = [System.Drawing.Color]::FromArgb(80, 220, 100)
    Update-Status "Ready to start backup" "Green"
    Update-Status "Backup drive detected: $script:backupDrive" "Blue"
    Update-Status "" "White"
    Update-Status "Configured folders:" "White"
    foreach ($source in $BackupMappings.Keys) {
        $dest = $BackupMappings[$source]
        Update-Status "  * $source -> $dest" "White"
    }
} else {
    $lblDrive.Text = "NOT DETECTED"
    $lblDrive.ForeColor = [System.Drawing.Color]::FromArgb(220, 60, 60)
    $lblStatusIcon.Text = "!"
    $lblStatusIcon.ForeColor = [System.Drawing.Color]::FromArgb(220, 60, 60)
    Update-Status "Could not detect JimL drive." "Red"
    Update-Status "Make sure you're running this from the JimL drive." "Red"
    $btnStart.Enabled = $false
}

# ============================================================================
# SHOW FORM
# ============================================================================

# Add event handler for when form is shown
$form.Add_Shown({
    # Try to enable Long Paths support on startup
    $longPathsEnabled = Enable-LongPaths
    if ($longPathsEnabled) {
        Update-Status "[OK] Windows Long Paths support is enabled" "Green"
    } else {
        Update-Status "[WARN] Could not enable Long Paths - some deep folders may fail" "Orange"
    }
    Update-Status "" "Black"
})

[void]$form.ShowDialog()
