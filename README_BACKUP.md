# JimL Backup System - Installation and Usage Guide

## Overview
This backup system creates mirror copies of specified folders from your D: drive to your external BitLocker-encrypted JimL drive, then creates a compressed archive of all backups.

## Files Included
1. **Run-JimLBackup.ps1** - The main PowerShell backup script
2. **Run_JimL_Backup.bat** - Double-click launcher for Windows Explorer

## Installation

### Step 1: Copy Files to JimL Drive
1. Plug in your JimL external USB SSD
2. Unlock the BitLocker encryption (double-click the drive in Explorer and enter password)
3. Copy both files to the **root** of the JimL drive:
   ```
   G:\Run-JimLBackup.ps1
   G:\Run_JimL_Backup.bat
   ```
   (Replace G: with whatever drive letter Windows assigns)

### Step 2: Verify Drive Label
- Ensure your external drive's volume label is exactly `JimL`
- To check: Right-click the drive in Explorer → Properties → General tab
- If needed, rename it: Right-click → Rename

## How to Run a Backup

### Method 1: Double-Click (Recommended)
1. Plug in the JimL drive
2. Unlock BitLocker (enter password when prompted)
3. Open the JimL drive in Explorer
4. **Double-click `Run_JimL_Backup.bat`**
5. Follow the on-screen prompts:
   - Review the backup summary
   - Type `Y` and press Enter to proceed
   - Wait for completion (console window will pause at the end)
   - Press any key to close

### Method 2: PowerShell (Advanced)
1. Open PowerShell as Administrator (optional, depends on folder permissions)
2. Navigate to the JimL drive:
   ```powershell
   cd G:\
   ```
3. Run the script:
   ```powershell
   .\Run-JimLBackup.ps1
   ```

## What Gets Backed Up

Current configuration backs up these folders:

| Source Folder | Destination on JimL Drive |
|---------------|---------------------------|
| `D:\Downloads` | `G:\Backup\Downloads` |
| `D:\Onedrive PLK` | `G:\Backup\PLK` |
| `D:\Onedrive DCT` | `G:\Backup\DCT` |

After syncing, all folders are compressed into: **`G:\Backup\Backup_Archive.zip`**

## Customizing Backup Folders

To add, remove, or modify backup folders:

1. Open `Run-JimLBackup.ps1` in a text editor (Notepad, VS Code, etc.)
2. Find the **CONFIGURATION** section near the top (around line 33)
3. Modify the `$BackupMappings` hashtable:

```powershell
$BackupMappings = @{
    "D:\Downloads"      = "Downloads"      # Existing
    "D:\Onedrive PLK"   = "PLK"           # Existing
    "D:\Onedrive DCT"   = "DCT"           # Existing
    "D:\MyNewFolder"    = "NewFolder"     # Add new folders like this
}
```

**Format:**
- **Key** (left side) = Full path to source folder on D: drive
- **Value** (right side) = Destination folder name (created under `Backup\`)

4. Save the file

## How It Works

1. **Drive Detection** - Script detects which drive it's running from and verifies it's the JimL drive
2. **Validation** - Checks that the drive is accessible and source folders exist
3. **Confirmation** - Shows you what will be backed up and asks for Y/N confirmation
4. **Mirroring** - Uses `robocopy /MIR` to create exact copies:
   - Copies new and modified files
   - Deletes files from backup that no longer exist in source
   - Preserves timestamps and attributes
5. **Compression** - Creates a single ZIP archive of all backup folders
6. **Summary** - Shows results and any errors

## Understanding Robocopy Mirror Mode

The `/MIR` option makes the destination an exact mirror of the source:
- ✅ Copies new files
- ✅ Updates changed files
- ✅ Removes files deleted from source
- ⚠️ **This means files only in the destination will be deleted**

This is intentional for keeping backups synchronized. If you need to preserve destination-only files, you can modify the `$RobocopyOptions` in the script to remove `/MIR` and use `/E` instead.

## Troubleshooting

### "Could not determine script drive location"
- Make sure you're running the script FROM the JimL drive, not from D: or C:

### "Drive has volume label 'X' but expected 'JimL'"
- Your drive's volume label doesn't match
- Rename the drive to `JimL` or edit the script's `$EXPECTED_VOLUME_LABEL` variable

### "Is the JimL BitLocker volume unlocked?"
- You must unlock BitLocker before running the script
- Double-click the drive in Explorer and enter your password

### "Source folder not found"
- One or more source folders don't exist on D:
- The script will continue with available folders
- Update the configuration to remove missing folders

### Robocopy Exit Code 8 or Higher
- Indicates errors during file copy (permissions, files in use, etc.)
- Check which files failed and ensure they're not locked by other programs
- Try closing applications that might be using those files

### Compression Fails
- Usually due to insufficient disk space or very large files
- Check available space on the JimL drive
- The backup folders are still valid even if compression fails

## Script Safety Features

- ✅ Verifies drive label before running
- ✅ Tests write access before backup
- ✅ Shows summary and asks for confirmation
- ✅ Validates all source folders exist
- ✅ Provides clear error messages
- ✅ Reports exit codes for diagnostics
- ✅ Keeps console window open so you can read results

## Performance

- Uses `robocopy /MT:8` for multi-threaded copying (faster on SSDs)
- Only copies changed files after initial backup
- Compression time depends on data size (typically 2-10 minutes for several GB)

## Future Enhancements (Not in V1)

Possible improvements for future versions:
- Versioned archives (keep multiple dated ZIP files)
- Task Scheduler integration for automatic backups
- Email notifications on completion/failure
- Backup rotation (delete old archives after N backups)
- Incremental backup support
- Log file generation with timestamps

## Support

If you encounter issues:
1. Read the error messages carefully - they're designed to be helpful
2. Check the Troubleshooting section above
3. Verify your drive is unlocked and accessible
4. Ensure source folders exist and are accessible
5. Try running PowerShell as Administrator if permission issues occur

---

**Version:** 1.0  
**Date:** November 23, 2025  
**Author:** Senior Windows Automation Engineer
