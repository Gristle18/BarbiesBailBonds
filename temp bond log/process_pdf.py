import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import PyPDF2
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
import io
import os

def process_pdf_with_opencv(input_path, output_path):
    """Process PDF using OpenCV for better OCR readability"""
    from PyPDF2 import PdfReader, PdfWriter
    from pdf2image import convert_from_path
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    import tempfile
    
    print(f"Processing PDF: {input_path}")
    
    # Create temporary directory for images
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Convert PDF to images
        print("Converting PDF to images...")
        images = convert_from_path(input_path, dpi=300)
        
        processed_images = []
        
        for i, img in enumerate(images):
            print(f"Processing page {i+1}/{len(images)}...")
            
            # Convert PIL to numpy array
            img_np = np.array(img)
            
            # Convert to grayscale
            gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
            
            # Apply different processing techniques
            
            # 1. Adaptive thresholding for text enhancement
            adaptive_thresh = cv2.adaptiveThreshold(gray, 255, 
                                                   cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                                   cv2.THRESH_BINARY, 11, 2)
            
            # 2. CLAHE (Contrast Limited Adaptive Histogram Equalization)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(gray)
            
            # 3. Denoise
            denoised = cv2.fastNlMeansDenoising(enhanced, None, 10, 7, 21)
            
            # 4. Sharpen
            kernel = np.array([[-1,-1,-1],
                              [-1, 9,-1],
                              [-1,-1,-1]])
            sharpened = cv2.filter2D(denoised, -1, kernel)
            
            # 5. Binary threshold with OTSU
            _, binary = cv2.threshold(sharpened, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Convert back to PIL Image
            processed_img = Image.fromarray(binary)
            
            # Additional PIL processing
            enhancer = ImageEnhance.Contrast(processed_img)
            processed_img = enhancer.enhance(1.5)
            
            processed_images.append(processed_img)
            
            # Save for verification
            temp_path = os.path.join(temp_dir, f"page_{i+1}.png")
            processed_img.save(temp_path)
        
        # Create new PDF from processed images
        print("Creating enhanced PDF...")
        processed_images[0].save(
            output_path,
            "PDF",
            resolution=300.0,
            save_all=True,
            append_images=processed_images[1:]
        )
        
        print(f"Enhanced PDF saved to: {output_path}")
        
        # Also save individual pages as high-contrast versions
        for i, img in enumerate(processed_images[:5]):  # Save first 5 pages as samples
            sample_path = output_path.replace('.pdf', f'_page{i+1}.png')
            img.save(sample_path)
            print(f"Sample page saved: {sample_path}")
            
    except Exception as e:
        print(f"Error processing PDF: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up temp directory
        import shutil
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

def process_pdf_simple(input_path, output_path):
    """Simpler processing focusing on contrast and brightness"""
    from pdf2image import convert_from_path
    import tempfile
    
    print(f"Processing PDF (Simple method): {input_path}")
    
    try:
        # Convert PDF to images at high DPI
        print("Converting PDF to images at high DPI...")
        images = convert_from_path(input_path, dpi=400)
        
        processed_images = []
        
        for i, img in enumerate(images):
            print(f"Processing page {i+1}/{len(images)}...")
            
            # Convert to grayscale
            img = img.convert('L')
            
            # Enhance contrast
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(2.0)
            
            # Enhance brightness
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(1.2)
            
            # Apply sharpening
            img = img.filter(ImageFilter.SHARPEN)
            
            # Convert to pure black and white
            img = img.point(lambda x: 0 if x < 128 else 255, '1')
            
            processed_images.append(img)
        
        # Save as new PDF
        print("Creating enhanced PDF...")
        processed_images[0].save(
            output_path,
            "PDF",
            resolution=400.0,
            save_all=True,
            append_images=processed_images[1:]
        )
        
        print(f"Enhanced PDF saved to: {output_path}")
        
        # Save page 2 specifically as it contains the target number
        if len(processed_images) > 1:
            page2_path = output_path.replace('.pdf', '_page2_enhanced.png')
            processed_images[1].save(page2_path)
            print(f"Page 2 (with U521981590) saved to: {page2_path}")
            
    except Exception as e:
        print(f"Error in simple processing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    input_pdf = r"E:\BarbiesBailBonds\temp bond log\New folder\09152025.pdf"
    
    # Try OpenCV method
    output_pdf_cv = r"E:\BarbiesBailBonds\temp bond log\09152025_enhanced_cv.pdf"
    process_pdf_with_opencv(input_pdf, output_pdf_cv)
    
    # Try simple method
    output_pdf_simple = r"E:\BarbiesBailBonds\temp bond log\09152025_enhanced_simple.pdf"
    process_pdf_simple(input_pdf, output_pdf_simple)