import fitz  # PyMuPDF
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import io
import os

def enhance_pdf_for_ocr(input_path, output_path):
    """
    Enhance PDF for better OCR by adjusting contrast, brightness, and applying filters
    """
    print(f"Opening PDF: {input_path}")
    
    # Open the PDF
    pdf_document = fitz.open(input_path)
    
    # Create a new PDF for output
    output_pdf = fitz.open()
    
    # Process each page
    for page_num in range(len(pdf_document)):
        print(f"Processing page {page_num + 1}/{len(pdf_document)}...")
        
        page = pdf_document[page_num]
        
        # Increase resolution for better quality
        mat = fitz.Matrix(3.0, 3.0)  # 3x zoom for higher resolution
        pix = page.get_pixmap(matrix=mat, alpha=False)
        
        # Convert to PIL Image
        img_data = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_data))
        
        # Convert to grayscale if not already
        if img.mode != 'L':
            img = img.convert('L')
        
        # Apply various enhancements
        
        # 1. Increase contrast significantly
        contrast = ImageEnhance.Contrast(img)
        img = contrast.enhance(2.5)
        
        # 2. Adjust brightness
        brightness = ImageEnhance.Brightness(img)
        img = brightness.enhance(1.3)
        
        # 3. Apply sharpening filter
        img = img.filter(ImageFilter.SHARPEN)
        img = img.filter(ImageFilter.SHARPEN)  # Apply twice for more effect
        
        # 4. Apply edge enhancement
        img = img.filter(ImageFilter.EDGE_ENHANCE)
        
        # 5. Convert to high contrast black and white
        # This helps with faint text
        threshold = 100  # Adjust this value to catch faint text
        img = img.point(lambda x: 0 if x < threshold else 255, '1')
        
        # Convert back to RGB for PDF
        img = img.convert('RGB')
        
        # Save the processed image
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        # Create a new page in output PDF with the processed image
        img_doc = fitz.open(stream=img_bytes.getvalue(), filetype="png")
        rect = img_doc[0].rect
        
        # Create new page with same dimensions
        new_page = output_pdf.new_page(width=rect.width, height=rect.height)
        new_page.insert_image(rect, stream=img_bytes.getvalue())
        
        # Save page 2 separately to check if U521981590 is visible
        if page_num == 1:  # Page 2 (0-indexed)
            page2_path = output_path.replace('.pdf', '_page2_check.png')
            img.save(page2_path)
            print(f"Page 2 saved separately to: {page2_path}")
    
    # Save the enhanced PDF
    output_pdf.save(output_path)
    output_pdf.close()
    pdf_document.close()
    
    print(f"Enhanced PDF saved to: {output_path}")

def create_multiple_versions(input_path):
    """
    Create multiple enhanced versions with different settings
    """
    base_name = os.path.splitext(input_path)[0]
    
    # Version 1: Standard enhancement
    output1 = f"{base_name}_enhanced_v1.pdf"
    enhance_pdf_for_ocr(input_path, output1)
    
    # Version 2: Extra high contrast
    print("\nCreating extra high contrast version...")
    pdf_document = fitz.open(input_path)
    output_pdf = fitz.open()
    
    for page_num in range(min(5, len(pdf_document))):  # Process first 5 pages
        print(f"Processing page {page_num + 1} (high contrast)...")
        
        page = pdf_document[page_num]
        mat = fitz.Matrix(4.0, 4.0)  # Even higher resolution
        pix = page.get_pixmap(matrix=mat, alpha=False)
        
        img_data = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_data))
        
        # Convert to grayscale
        img = img.convert('L')
        
        # Extreme contrast
        contrast = ImageEnhance.Contrast(img)
        img = contrast.enhance(4.0)
        
        # Lower threshold for catching faint text
        threshold = 80
        img = img.point(lambda x: 0 if x < threshold else 255, '1')
        
        # Save page 2 with different thresholds
        if page_num == 1:
            for thresh in [60, 80, 100, 120, 140]:
                test_img = Image.open(io.BytesIO(img_data))
                test_img = test_img.convert('L')
                test_img = ImageEnhance.Contrast(test_img).enhance(3.0)
                test_img = test_img.point(lambda x: 0 if x < thresh else 255, '1')
                test_path = f"{base_name}_page2_threshold_{thresh}.png"
                test_img.save(test_path)
                print(f"Page 2 with threshold {thresh} saved to: {test_path}")
        
        img = img.convert('RGB')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        img_doc = fitz.open(stream=img_bytes.getvalue(), filetype="png")
        rect = img_doc[0].rect
        new_page = output_pdf.new_page(width=rect.width, height=rect.height)
        new_page.insert_image(rect, stream=img_bytes.getvalue())
    
    output2 = f"{base_name}_enhanced_v2_high_contrast.pdf"
    output_pdf.save(output2)
    output_pdf.close()
    pdf_document.close()
    print(f"High contrast version saved to: {output2}")

if __name__ == "__main__":
    input_pdf = r"E:\BarbiesBailBonds\temp bond log\New folder\09152025.pdf"
    output_pdf = r"E:\BarbiesBailBonds\temp bond log\09152025_enhanced.pdf"
    
    # Create the standard enhanced version
    enhance_pdf_for_ocr(input_pdf, output_pdf)
    
    # Create multiple test versions
    create_multiple_versions(input_pdf)