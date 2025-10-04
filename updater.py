import os, sys, time, shutil, subprocess, tempfile, requests
from packaging import version as v

GITHUB_URL = r'https://raw.githubusercontent.com/FirstLight1/tradeTracker/refs/heads/master/version.txt'
REPO = 'FirstLight1/tradeTracker'
URL = f"https://api.github.com/repos/{REPO}/releases/latest"
response = requests.get(URL).json()
assets = response.get('assets', [])

if assets:
    DOWNLOAD_URL = assets[0]["browser_download_url"]
else:
    raise ValueError("No assets found in release response")

APP_NAME = 'run_app.exe'
def check_version():
    with open("version.txt", "r") as versionFile:
        fileContent = versionFile.read()
        text, sep, LOCAL_VERSION = fileContent.partition(':')

    response = requests.get(GITHUB_URL)
    text, sep, version = response.text.partition(':')
    if v.parse(version) > v.parse(LOCAL_VERSION):
        print('New update found! Downloading...')
        update_with_cmd(download_update(), APP_NAME)
    else:
        return False


def download_update():
    temp_path = os.path.join(tempfile.gettempdir(), "my_app_new.zip")
    with requests.get(DOWNLOAD_URL, stream=True) as r:
            with open(temp_path, "wb") as f:
                shutil.copyfileobj(r.raw, f)
    print('Updating!')
    return temp_path


def update_with_cmd(newFile, targetFile):
    
    script = f"""
@echo off
ping 127.0.0.1 -n 2 > nul
del "{targetFile}"
move "{newFile}" "{targetFile}"
start "" "{targetFile}"
del "%~f0"
"""
    temp_dir = tempfile.gettempdir()
    cmd_path = os.path.join(temp_dir, "update_app.cmd")
    with open(cmd_path, "w") as f:
        f.write(script)

    # Run updater script and exit app
    subprocess.Popen(["cmd", "/c", cmd_path])
    sys.exit()

check_version()
