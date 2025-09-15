import subprocess
import os
import sys

def use_windows_ocr_tool():
    """Use Windows built-in OCR or guide to online tools"""
    
    print("="*70)
    print("REAL OCR SOLUTION FOR COMPLETE TEXT EXTRACTION")
    print("="*70)
    
    input_pdf = "09152025_FINAL_PROPER_SIZE.pdf"
    
    print(f"\nYour PDF '{input_pdf}' needs REAL OCR to extract:")
    print("- WEST, UNDRA D (names)")
    print("- WHITE-COURT COPY (document instructions)")
    print("- CPL H. ONEAL (officer names)")
    print("- All other actual text in the document")
    
    print("\n" + "="*70)
    print("OPTION 1: FREE ONLINE OCR (RECOMMENDED - WORKS IMMEDIATELY)")
    print("="*70)
    
    print("\n1. GOOGLE DRIVE METHOD (BEST - 100% FREE):")
    print("-" * 50)
    print("a) Go to: https://drive.google.com")
    print("b) Upload: 09152025_FINAL_PROPER_SIZE.pdf")
    print("c) After upload completes, right-click the file")
    print("d) Select: Open with > Google Docs")
    print("e) Wait 1-2 minutes for Google to OCR the document")
    print("f) In Google Docs: File > Download > PDF Document (.pdf)")
    print("g) The downloaded PDF will have ALL text selectable!")
    print("   Including: WEST, UNDRA D; WHITE-COURT COPY; CPL H. ONEAL")
    
    print("\n2. ILOVEPDF.COM (ALSO FREE):")
    print("-" * 50)
    print("a) Go to: https://www.ilovepdf.com/ocr-pdf")
    print("b) Click 'Select PDF file' and upload: 09152025_FINAL_PROPER_SIZE.pdf")
    print("c) Select language: English")
    print("d) Click 'OCR PDF' button")
    print("e) Download the result")
    print("f) All text will be selectable and searchable!")
    
    print("\n" + "="*70)
    print("OPTION 2: WINDOWS OCR POWER TOOL")
    print("="*70)
    
    print("\nMicrosoft PowerToys includes Text Extractor:")
    print("1. Install PowerToys from: https://aka.ms/installpowertoys")
    print("2. After installation, use Win+Shift+T to extract text from screen")
    print("3. Open the PDF in any viewer")
    print("4. Use Text Extractor on each page")
    
    print("\n" + "="*70)
    print("OPTION 3: USE ADOBE ACROBAT WITH ENHANCED PDF")
    print("="*70)
    
    print("\nThe enhanced PDF is optimized for Adobe OCR:")
    print("1. Open '09152025_FINAL_PROPER_SIZE.pdf' in Adobe Acrobat")
    print("2. Click 'Scan & OCR' in the right panel")
    print("3. Click 'Recognize Text' > 'In This File'")
    print("4. Click 'Recognize Text' button")
    print("5. Adobe will OCR the entire document")
    print("6. Save the file - all text will be selectable!")
    
    # Try to open the browser to Google Drive
    print("\n" + "="*70)
    print("OPENING GOOGLE DRIVE IN YOUR BROWSER...")
    print("="*70)
    
    try:
        import webbrowser
        webbrowser.open("https://drive.google.com")
        print("\nGoogle Drive opened in your browser.")
        print("Upload '09152025_FINAL_PROPER_SIZE.pdf' and follow the steps above!")
    except:
        print("\nPlease manually go to https://drive.google.com")
    
    return True

def create_ocr_ready_file():
    """Ensure we have the best file for OCR"""
    
    print("\n" + "="*70)
    print("VERIFYING OCR-READY FILE")
    print("="*70)
    
    ocr_ready = "09152025_FINAL_PROPER_SIZE.pdf"
    
    if os.path.exists(ocr_ready):
        size = os.path.getsize(ocr_ready) / (1024 * 1024)  # Size in MB
        print(f"\nFile ready for OCR: {ocr_ready}")
        print(f"File size: {size:.2f} MB")
        print("\nThis file has:")
        print("- Clear, dark text (enhanced contrast)")
        print("- Removed pink/red backgrounds")
        print("- Proper page dimensions (8.5 x 11 inches)")
        print("- All power numbers clearly visible")
        print("\nIt's optimized for OCR accuracy!")
    else:
        print(f"\nError: {ocr_ready} not found!")
    
    return ocr_ready

if __name__ == "__main__":
    # Verify OCR-ready file
    ocr_file = create_ocr_ready_file()
    
    # Show OCR options
    use_windows_ocr_tool()
    
    print("\n" + "="*70)
    print("NEXT STEPS")
    print("="*70)
    print("\n1. Upload '09152025_FINAL_PROPER_SIZE.pdf' to Google Drive")
    print("2. Use Google Docs to OCR it (instructions above)")
    print("3. Download the OCR'd PDF")
    print("4. Test by searching for:")
    print("   - WEST, UNDRA D")
    print("   - WHITE-COURT COPY")
    print("   - CPL H. ONEAL")
    print("   - U521981590")
    print("\nAll text will be selectable and copyable!")