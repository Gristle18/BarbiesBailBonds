#!/usr/bin/env python3
"""
Setup script for OCR environment
Installs required packages and configures Tesseract
"""

import subprocess
import sys
import os
import urllib.request
import zipfile
from pathlib import Path

def install_requirements():
    """Install Python requirements"""
    print("Installing Python requirements...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ Python requirements installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to install requirements: {e}")
        return False

def setup_tesseract_windows():
    """Setup Tesseract for Windows"""
    print("Setting up Tesseract for Windows...")
    
    # Common Tesseract installation paths on Windows
    possible_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        r"C:\Users\{}\AppData\Local\Programs\Tesseract-OCR\tesseract.exe".format(os.getenv('USERNAME')),
    ]
    
    # Check if Tesseract is already installed
    for path in possible_paths:
        if os.path.exists(path):
            print(f"✓ Found Tesseract at: {path}")
            # Set environment variable for pytesseract
            os.environ['TESSERACT_CMD'] = path
            
            # Create a config file
            with open('tesseract_config.py', 'w') as f:
                f.write(f'import pytesseract\n')
                f.write(f'pytesseract.pytesseract.tesseract_cmd = r"{path}"\n')
            
            return True
    
    print("⚠ Tesseract not found in common locations")
    print("Please install Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki")
    print("Or specify the path manually in the script")
    return False

def test_ocr_setup():
    """Test OCR setup"""
    print("\nTesting OCR setup...")
    
    try:
        import pytesseract
        from PIL import Image
        import cv2
        import easyocr
        
        print("✓ All OCR libraries imported successfully")
        
        # Test Tesseract
        try:
            if os.path.exists('tesseract_config.py'):
                exec(open('tesseract_config.py').read())
            version = pytesseract.get_tesseract_version()
            print(f"✓ Tesseract version: {version}")
        except Exception as e:
            print(f"✗ Tesseract test failed: {e}")
        
        # Test EasyOCR (this will download models on first run)
        try:
            reader = easyocr.Reader(['en'], gpu=False)
            print("✓ EasyOCR initialized successfully")
        except Exception as e:
            print(f"✗ EasyOCR test failed: {e}")
        
        return True
        
    except ImportError as e:
        print(f"✗ Import test failed: {e}")
        return False

def main():
    print("=== OCR Environment Setup ===")
    
    # Install requirements
    if not install_requirements():
        print("Setup failed at requirements installation")
        return False
    
    # Setup Tesseract
    if not setup_tesseract_windows():
        print("⚠ Tesseract setup incomplete - manual configuration may be needed")
    
    # Test setup
    if test_ocr_setup():
        print("\n✓ OCR setup completed successfully!")
        print("\nYou can now run the OCR script with:")
        print('python targeted_ocr_script.py "E:\\BarbiesBailBonds\\temp bond log"')
    else:
        print("\n✗ OCR setup incomplete - please check error messages above")
    
    return True

if __name__ == "__main__":
    main()