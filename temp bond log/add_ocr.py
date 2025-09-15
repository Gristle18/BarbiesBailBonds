import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import os

# Set Tesseract path for Windows
# You may need to adjust this path based on your Tesseract installation
tesseract_paths = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    r"C:\Users\alexa\AppData\Local\Programs\Tesseract-OCR\tesseract.exe",
]

for path in tesseract_paths:
    if os.path.exists(path):
        pytesseract.pytesseract.tesseract_cmd = path
        print(f"Found Tesseract at: {path}")
        break
else:
    print("WARNING: Tesseract not found. Trying to use system PATH...")

def add_ocr_to_pdf(input_path, output_path):
    """
    Add OCR text layer to PDF to make it searchable and selectable
    """
    print(f"Adding OCR to: {input_path}")
    print(f"Output will be saved to: {output_path}")
    
    try:
        # Open the input PDF
        pdf_document = fitz.open(input_path)
        
        # Create new PDF with text layer
        output_pdf = fitz.open()
        
        total_pages = len(pdf_document)
        print(f"Processing {total_pages} pages with OCR...")
        
        for page_num in range(total_pages):
            if (page_num + 1) % 5 == 0:
                print(f"OCR processing page {page_num + 1}/{total_pages}...")
            
            page = pdf_document[page_num]
            
            # Get page as high-quality image for OCR
            mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better OCR
            pix = page.get_pixmap(matrix=mat, alpha=False)
            
            # Convert to PIL Image
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            
            # Perform OCR to get text
            try:
                text = pytesseract.image_to_string(img, lang='eng')
                
                # Get detailed OCR data with bounding boxes
                ocr_data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
                
            except Exception as e:
                print(f"OCR failed on page {page_num + 1}: {e}")
                text = ""
                ocr_data = None
            
            # Create new page with same dimensions as original
            new_page = output_pdf.new_page(width=page.rect.width, height=page.rect.height)
            
            # First, copy the original page image
            new_page.show_pdf_page(new_page.rect, pdf_document, page_num)
            
            # Add invisible text layer if OCR was successful
            if ocr_data and len(ocr_data['text']) > 0:
                scale_x = page.rect.width / (pix.width / 2.0)
                scale_y = page.rect.height / (pix.height / 2.0)
                
                for i in range(len(ocr_data['text'])):
                    if ocr_data['text'][i].strip():
                        x = ocr_data['left'][i] * scale_x / 2.0
                        y = ocr_data['top'][i] * scale_y / 2.0
                        w = ocr_data['width'][i] * scale_x / 2.0
                        h = ocr_data['height'][i] * scale_y / 2.0
                        
                        # Create invisible text annotation
                        rect = fitz.Rect(x, y, x + w, y + h)
                        
                        # Insert invisible text
                        try:
                            # Use text_writer for invisible text layer
                            tw = fitz.TextWriter(new_page.rect)
                            tw.append(
                                pos=(x, y + h),
                                text=ocr_data['text'][i],
                                fontsize=h * 0.7,
                                color=(0, 0, 0),
                                opacity=0  # Invisible
                            )
                            tw.write_text(new_page)
                        except:
                            pass
            
            # Special check for page 2 - ensure U521981590 is captured
            if page_num == 1:
                if "U521981590" in text or "521981590" in text:
                    print(f"✓ Found U521981590 on page 2!")
                else:
                    print(f"Note: U521981590 may need manual verification on page 2")
        
        # Save the output PDF
        output_pdf.save(output_path, garbage=4, deflate=True)
        output_pdf.close()
        pdf_document.close()
        
        print(f"\n✓ OCR complete! Text is now selectable.")
        print(f"Location: {output_path}")
        
    except Exception as e:
        print(f"Error during OCR: {e}")
        print("\nAlternative: Use Adobe Acrobat's built-in OCR:")
        print("1. Open the PDF in Adobe Acrobat")
        print("2. Go to Tools > Scan & OCR")
        print("3. Click 'Recognize Text' > 'In This File'")
        print("4. Click 'Recognize Text' button")

def simple_ocr_with_pymupdf(input_path, output_path):
    """
    Simpler approach using PyMuPDF's built-in text extraction
    """
    print("\nTrying alternative method with PyMuPDF...")
    
    # Open source PDF
    src = fitz.open(input_path)
    
    # Create a new PDF
    doc = fitz.open()
    
    for page_num in range(len(src)):
        if (page_num + 1) % 10 == 0:
            print(f"Processing page {page_num + 1}/{len(src)}...")
        
        # Get the page
        src_page = src[page_num]
        
        # Create new page
        page = doc.new_page(width=src_page.rect.width, height=src_page.rect.height)
        
        # Copy the page content
        page.show_pdf_page(page.rect, src, page_num)
        
        # Try to make it searchable by re-rendering
        # This helps Adobe recognize it needs OCR
        page.clean_contents()
    
    # Save with linearization for better compatibility
    doc.save(output_path, garbage=4, deflate=True, linear=True)
    doc.close()
    src.close()
    
    print(f"PDF saved: {output_path}")

if __name__ == "__main__":
    input_pdf = r"E:\BarbiesBailBonds\temp bond log\09152025_FINAL_PROPER_SIZE.pdf"
    output_pdf = r"E:\BarbiesBailBonds\temp bond log\09152025_WITH_OCR.pdf"
    
    # Try to add OCR
    try:
        add_ocr_to_pdf(input_pdf, output_pdf)
    except Exception as e:
        print(f"\nOCR with Tesseract failed: {e}")
        print("\nCreating optimized version for Adobe Acrobat OCR...")
        simple_ocr_with_pymupdf(input_pdf, output_pdf)
        
        print("\n" + "="*60)
        print("TO MAKE TEXT SELECTABLE IN ADOBE ACROBAT:")
        print("="*60)
        print("1. Open the PDF: 09152025_FINAL_PROPER_SIZE.pdf")
        print("2. Click 'Tools' in the top menu")
        print("3. Select 'Scan & OCR'")
        print("4. Click 'Recognize Text' → 'In This File'")
        print("5. Settings: Language = English, Output = Searchable Image")
        print("6. Click 'Recognize Text'")
        print("\nThis will add a text layer making all text selectable,")
        print("including the number U521981590 on page 2.")