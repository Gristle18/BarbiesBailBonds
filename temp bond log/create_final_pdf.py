import fitz  # PyMuPDF
import numpy as np
from PIL import Image, ImageEnhance
import cv2
import io

def create_enhanced_pdf_final(input_path, output_path):
    """
    Create the final enhanced PDF using the optimal settings discovered
    Uses morphological operations which showed U521981590 clearly
    """
    print(f"Creating final enhanced PDF from: {input_path}")
    print(f"Output will be saved to: {output_path}")
    
    # Open the PDF
    pdf_document = fitz.open(input_path)
    
    # Create a new PDF for output
    output_pdf = fitz.open()
    
    total_pages = len(pdf_document)
    print(f"Processing {total_pages} pages...")
    
    for page_num in range(total_pages):
        if (page_num + 1) % 10 == 0:
            print(f"Processing page {page_num + 1}/{total_pages}...")
        
        page = pdf_document[page_num]
        
        # Use high DPI for better quality (500 worked best)
        zoom = 500 / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        
        # Convert to numpy array
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
        img_processed.save(img_bytes, format='PNG', dpi=(500, 500))
        img_bytes.seek(0)
        
        # Create a new page in output PDF with the processed image
        img_doc = fitz.open(stream=img_bytes.getvalue(), filetype="png")
        rect = img_doc[0].rect
        
        # Create new page with proper dimensions
        new_page = output_pdf.new_page(width=rect.width/zoom, height=rect.height/zoom)
        new_page.insert_image(new_page.rect, stream=img_bytes.getvalue())
        
        img_doc.close()
    
    # Save the enhanced PDF
    output_pdf.save(output_path)
    output_pdf.close()
    pdf_document.close()
    
    print(f"\n✓ Final enhanced PDF saved successfully!")
    print(f"Location: {output_path}")
    print(f"\nThe number U521981590 should now be clearly visible on page 2.")
    print("You can now use Adobe Acrobat's OCR tool to make the text selectable.")

if __name__ == "__main__":
    input_pdf = r"E:\BarbiesBailBonds\temp bond log\New folder\09152025.pdf"
    output_pdf = r"E:\BarbiesBailBonds\temp bond log\09152025_FINAL_ENHANCED.pdf"
    
    create_enhanced_pdf_final(input_pdf, output_pdf)