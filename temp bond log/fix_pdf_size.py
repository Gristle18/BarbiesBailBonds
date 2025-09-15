import fitz  # PyMuPDF
import numpy as np
from PIL import Image, ImageEnhance
import cv2
import io

def create_properly_sized_pdf(input_path, output_path):
    """
    Create an enhanced PDF with proper page dimensions (standard letter size)
    """
    print(f"Creating properly sized enhanced PDF from: {input_path}")
    print(f"Output will be saved to: {output_path}")
    
    # Open the PDF
    pdf_document = fitz.open(input_path)
    
    # Create a new PDF for output
    output_pdf = fitz.open()
    
    total_pages = len(pdf_document)
    print(f"Processing {total_pages} pages...")
    
    # Standard US Letter size in points (8.5 x 11 inches)
    standard_width = 8.5 * 72  # 612 points
    standard_height = 11 * 72  # 792 points
    
    for page_num in range(total_pages):
        if (page_num + 1) % 10 == 0:
            print(f"Processing page {page_num + 1}/{total_pages}...")
        
        page = pdf_document[page_num]
        
        # Get original page dimensions
        orig_rect = page.rect
        orig_width = orig_rect.width
        orig_height = orig_rect.height
        
        # Calculate zoom to get high quality while maintaining aspect ratio
        # Use 300 DPI for good OCR quality
        zoom_x = 300 / 72.0  # 300 DPI
        zoom_y = 300 / 72.0  # 300 DPI
        mat = fitz.Matrix(zoom_x, zoom_y)
        
        # Get high-quality pixmap
        pix = page.get_pixmap(matrix=mat, alpha=False)
        
        # Convert to numpy array for processing
        img_data = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_data))
        img_np = np.array(img)
        
        # Convert to grayscale
        if len(img_np.shape) == 3:
            gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_np
        
        # Apply CLAHE for contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        # Morphological operations to enhance faint text
        kernel = np.ones((2,2), np.uint8)
        
        # Dilate to make text thicker
        dilated = cv2.dilate(255 - enhanced, kernel, iterations=1)
        # Erode to clean up
        eroded = cv2.erode(dilated, kernel, iterations=1)
        
        # Invert back
        final = 255 - eroded
        
        # Convert back to PIL Image
        img_processed = Image.fromarray(final)
        
        # Enhance contrast one more time
        contrast = ImageEnhance.Contrast(img_processed)
        img_processed = contrast.enhance(1.2)
        
        # Convert to RGB for PDF
        img_processed = img_processed.convert('RGB')
        
        # Save the processed image to bytes
        img_bytes = io.BytesIO()
        img_processed.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        # Create new page with STANDARD dimensions
        # Use original aspect ratio to determine if portrait or landscape
        if orig_width <= orig_height:
            # Portrait
            new_page = output_pdf.new_page(width=standard_width, height=standard_height)
        else:
            # Landscape
            new_page = output_pdf.new_page(width=standard_height, height=standard_width)
        
        # Insert the processed image to fit the page
        new_page.insert_image(new_page.rect, stream=img_bytes.getvalue())
        
        img_doc = fitz.open(stream=img_bytes.getvalue(), filetype="png")
        img_doc.close()
    
    # Set proper metadata
    output_pdf.set_metadata({
        'producer': 'Enhanced for OCR',
        'creator': 'Barbie\'s Bail Bonds PDF Processor',
        'title': 'Enhanced Bond Document',
        'subject': 'OCR-optimized document',
        'author': 'Barbie\'s Bail Bonds'
    })
    
    # Save the enhanced PDF with compression
    output_pdf.save(output_path, garbage=4, deflate=True, clean=True)
    output_pdf.close()
    pdf_document.close()
    
    print(f"\nPDF saved successfully with proper dimensions!")
    print(f"Location: {output_path}")
    print(f"\nThe PDF now has standard page sizes and should display correctly in Adobe Acrobat.")
    print("The number U521981590 on page 2 should be clearly visible and ready for OCR.")

def check_pdf_info(pdf_path):
    """Check and display PDF information"""
    doc = fitz.open(pdf_path)
    print(f"\nPDF Information for: {pdf_path}")
    print(f"Number of pages: {len(doc)}")
    
    # Check first few pages dimensions
    for i in range(min(3, len(doc))):
        page = doc[i]
        rect = page.rect
        width_inches = rect.width / 72
        height_inches = rect.height / 72
        print(f"Page {i+1}: {width_inches:.2f}\" x {height_inches:.2f}\" ({rect.width:.0f} x {rect.height:.0f} points)")
    
    doc.close()

if __name__ == "__main__":
    input_pdf = r"E:\BarbiesBailBonds\temp bond log\New folder\09152025.pdf"
    output_pdf = r"E:\BarbiesBailBonds\temp bond log\09152025_FINAL_PROPER_SIZE.pdf"
    
    # Create the properly sized PDF
    create_properly_sized_pdf(input_pdf, output_pdf)
    
    # Check the dimensions
    check_pdf_info(output_pdf)