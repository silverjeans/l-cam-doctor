$projectDir = "C:\Users\USER\work\lcam-doctor"
$electronFolder = "$projectDir\node_modules\electron"
$tempFolder = "$projectDir\node_modules\_electron_temp"

Set-Location $projectDir

# Copy electron.exe to temp location before renaming
$tempExe = "$projectDir\electron_temp.exe"
Copy-Item "$electronFolder\dist\electron.exe" $tempExe

# Rename electron folder temporarily
Rename-Item $electronFolder $tempFolder

# Run electron with --dev flag
& $tempExe . --dev

# Restore folder name
Rename-Item $tempFolder $electronFolder

# Remove temp exe (ignore error if in use)
Remove-Item $tempExe -ErrorAction SilentlyContinue
