import os, sys, time, shutil, subprocess, tempfile, requests
from packaging import version as v

GITHUB_URL = r'https://raw.githubusercontent.com/FirstLight1/tradeTracker/refs/heads/master/version.txt'
REPO = 'FirstLight1/tradeTracker'
URL = f"https://api.github.com/repos/{REPO}/releases/latest"
APP_NAME = 'run_app.exe'

#update database
#check name in releases and then compare version


def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(os.path.dirname(__file__))
    return os.path.join(base_path, relative_path)

def get_download_url():
    try:
        response = requests.get(URL, timeout=10)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        data = response.json()
        assets = data.get('assets', [])
        
        if assets:
            return assets[0]["browser_download_url"]
        else:
            print("No assets found in release. Skipping update check.")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch release info: {e}")
        return None
    
def check_version():
    try:
        # Read local version from version.txt file
        try:
            version_file_path = resource_path('version.txt')
            with open(version_file_path, 'r') as f:
                version_content = f.read()
            text, sep, LOCAL_VERSION = version_content.partition(':')
            if not LOCAL_VERSION:
                LOCAL_VERSION = "1"  # fallback version
            LOCAL_VERSION = LOCAL_VERSION.strip()
        except (FileNotFoundError, IOError):
            LOCAL_VERSION = "1"  # fallback version

        try:
            response = requests.get(GITHUB_URL, timeout=10)
            response.raise_for_status()
            text, sep, version = response.text.partition(':')
            if not version:
                print("Invalid version format from remote")
                return False
                
            print(f"Current version: {LOCAL_VERSION}")
            print(f"Latest version: {version.strip()}")

            if v.parse(version.strip()) > v.parse(LOCAL_VERSION):
                print('New update found! Downloading...')
                download_url = get_download_url()
                if download_url:
                    update_with_cmd(download_update(download_url), APP_NAME)
                else:
                    print("Failed to get download URL. Update skipped.")
            else:
                print("You have the latest version!")
                return False
        except requests.exceptions.RequestException as e:
            print(f"Failed to check for updates: {e}")
            return False
    except Exception as e:
        print(f"Error during version check: {e}")
        return False


def download_update(download_url):
    try:
        temp_path = os.path.join(tempfile.gettempdir(), "my_app_new.zip")
        with requests.get(download_url, stream=True, timeout=30) as r:
            r.raise_for_status()
            total_size = int(r.headers.get('content-length', 0))
            block_size = 1024  # 1 Kibibyte
            
            with open(temp_path, "wb") as f:
                for data in r.iter_content(block_size):
                    f.write(data)
                    # You could add a progress bar here if desired
                    
        print('Download complete! Starting update process...')
        return temp_path
    except Exception as e:
        print(f"Error downloading update: {e}")
        return None


def update_with_cmd(newFile, targetFile):
    if not newFile:
        print("Update file not available. Update cancelled.")
        return
        
    try:
        script = f"""
@echo off
echo Waiting for application to close...
ping 127.0.0.1 -n 2 > nul
del "{targetFile}"
echo Installing new version...
move "{newFile}" "{targetFile}"
echo Starting updated application...
start "" "{targetFile}"
del "%~f0"
"""
        temp_dir = tempfile.gettempdir()
        cmd_path = os.path.join(temp_dir, "update_app.cmd")
        with open(cmd_path, "w") as f:
            f.write(script)

        print("Starting update process...")
        # Run updater script and exit app
        subprocess.Popen(["cmd", "/c", cmd_path])
        sys.exit()
    except Exception as e:
        print(f"Error during update process: {e}")
        return False

if __name__ == "__main__":
    check_version()
