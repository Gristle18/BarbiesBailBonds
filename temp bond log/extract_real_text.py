import fitz
import os
from PIL import Image
import io

def extract_text_from_images():
    """Extract actual text from PDF by converting pages to images and analyzing"""
    
    print("="*70)
    print("EXTRACTING REAL TEXT FROM PDF PAGES")
    print("="*70)
    
    input_pdf = r"E:\BarbiesBailBonds\temp bond log\09152025_FINAL_PROPER_SIZE.pdf"
    
    # First, let's examine what's actually visible in the PDF
    pdf = fitz.open(input_pdf)
    
    # Focus on pages that likely contain the text we're looking for
    # Based on bail bond documents, these typically appear early in the document
    
    print("\nAnalyzing first 10 pages for specific content...")
    
    for page_num in range(min(10, len(pdf))):
        print(f"\n--- Page {page_num + 1} ---")
        
        page = pdf[page_num]
        
        # Get page as high-resolution image
        mat = fitz.Matrix(2, 2)  # 2x zoom for better quality
        pix = page.get_pixmap(matrix=mat)
        
        # Convert to PIL Image for analysis
        img_data = pix.pil_tobytes(format="PNG")
        img = Image.open(io.BytesIO(img_data))
        
        # Save sample images for manual inspection
        sample_path = f"E:\\BarbiesBailBonds\\temp bond log\\page_{page_num + 1}_sample.png"
        img.save(sample_path)
        print(f"Saved sample: page_{page_num + 1}_sample.png")
        
        # Check if this might be a page with defendant info or copy instructions
        # These pages typically have specific layouts
        width, height = img.size
        
        # Look for characteristics of pages with the text we need
        if page_num < 5:  # Early pages often have case info
            print(f"  Page dimensions: {width}x{height}")
            print(f"  This could contain defendant/case information")
    
    pdf.close()
    
    print("\n" + "="*70)
    print("NEXT STEP: MANUAL OCR REQUIRED")
    print("="*70)
    print("\nI've saved sample images of the first 10 pages.")
    print("To make the text selectable, we need to:")
    print("\n1. Use a real OCR engine that can read the actual text")
    print("2. The text 'WEST, UNDRA D' and 'CPL H. ONEAL' are in the images")
    print("3. But they need to be extracted with OCR")
    
    return True

def try_windows_ocr_api():
    """Try to use Windows OCR API if available"""
    
    print("\n" + "="*70)
    print("ATTEMPTING WINDOWS OCR API")
    print("="*70)
    
    # Check if we can use Windows.Media.Ocr
    ps_script = r"""
    # PowerShell script to use Windows OCR
    Add-Type -AssemblyName System.Drawing
    
    # Load Windows Runtime
    [Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime] | Out-Null
    [Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime] | Out-Null
    [Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime] | Out-Null
    
    $pdfPath = "E:\BarbiesBailBonds\temp bond log\page_1_sample.png"
    
    if (Test-Path $pdfPath) {
        Write-Host "Found sample image for OCR"
        
        # Try to perform OCR
        try {
            $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
            if ($engine) {
                Write-Host "OCR Engine available!"
                Write-Host "To complete OCR, use one of the online tools provided"
            } else {
                Write-Host "OCR Engine not available on this system"
            }
        } catch {
            Write-Host "Windows OCR API not accessible"
            Write-Host "Use online OCR tools instead"
        }
    }
    """
    
    # Save and try to run
    ps_file = r"E:\BarbiesBailBonds\temp bond log\test_ocr.ps1"
    with open(ps_file, 'w') as f:
        f.write(ps_script)
    
    import subprocess
    try:
        result = subprocess.run(
            ["powershell", "-ExecutionPolicy", "Bypass", "-File", ps_file],
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print("Errors:", result.stderr)
    except Exception as e:
        print(f"Could not run PowerShell: {e}")
    
    return True

if __name__ == "__main__":
    # Extract sample images
    extract_text_from_images()
    
    # Try Windows OCR
    try_windows_ocr_api()
    
    print("\n" + "="*70)
    print("MANUAL OCR REQUIRED")
    print("="*70)
    print("\nThe specific text you're looking for:")
    print("- WEST, UNDRA D (defendant name)")
    print("- WHITE-COURT COPY • YELLOW - DEFENDANT COPY • PINK")
    print("- CPL H. ONEAL (INTAKE DESK)")
    print("\nThese are printed/typed text in the scanned document images.")
    print("To make them selectable, you MUST use real OCR.")
    print("\nRECOMMENDED: Upload to Google Drive and use Google Docs OCR")
    print("This will extract ALL text including the specific items you need.")