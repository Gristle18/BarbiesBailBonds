import os
import urllib.request
import zipfile
import subprocess

def download_and_install_tesseract():
    """Download and set up Tesseract for Windows"""
    
    print("Downloading Tesseract OCR installer...")
    
    # Download URL for Tesseract Windows installer
    url = "https://github.com/UB-Mannheim/tesseract/releases/download/v5.3.3.20231005/tesseract-ocr-w64-setup-5.3.3.20231005.exe"
    
    installer_path = r"E:\BarbiesBailBonds\temp bond log\tesseract_installer.exe"
    
    try:
        # Download the installer
        print(f"Downloading from: {url}")
        urllib.request.urlretrieve(url, installer_path)
        print(f"Downloaded to: {installer_path}")
        
        print("\n" + "="*70)
        print("TESSERACT INSTALLER DOWNLOADED")
        print("="*70)
        print("\nTo install Tesseract:")
        print(f"1. Run the installer: {installer_path}")
        print("2. Click through the installation (use default settings)")
        print("3. After installation, run the OCR script again")
        
        # Try to run installer silently
        print("\nAttempting silent installation...")
        subprocess.run([installer_path, "/S"], check=False)
        
    except Exception as e:
        print(f"Error downloading: {e}")
        
        # Alternative: Use portable version
        print("\nTrying portable version instead...")
        portable_url = "https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.3.3.20231005.exe"
        
        try:
            urllib.request.urlretrieve(portable_url, installer_path)
            print(f"Alternative download complete: {installer_path}")
        except:
            print("Please download Tesseract manually from:")
            print("https://github.com/UB-Mannheim/tesseract/wiki")

if __name__ == "__main__":
    download_and_install_tesseract()