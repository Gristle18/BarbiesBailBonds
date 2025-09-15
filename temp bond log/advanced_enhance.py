import fitz  # PyMuPDF
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import cv2
import io
import os

def remove_pink_background(img):
    """Remove pink/red background from image"""
    # Convert PIL to numpy array
    img_np = np.array(img)
    
    # Convert RGB to HSV for better color detection
    hsv = cv2.cvtColor(img_np, cv2.COLOR_RGB2HSV)
    
    # Define range for pink/red colors (adjust these values)
    # Pink/red in HSV
    lower_pink = np.array([150, 20, 20])
    upper_pink = np.array([180, 255, 255])
    
    # Also catch lighter pinks
    lower_light_pink = np.array([0, 20, 20]) 
    upper_light_pink = np.array([20, 255, 255])
    
    # Create masks for pink colors
    mask1 = cv2.inRange(hsv, lower_pink, upper_pink)
    mask2 = cv2.inRange(hsv, lower_light_pink, upper_light_pink)
    mask = cv2.bitwise_or(mask1, mask2)
    
    # Invert mask to keep non-pink areas
    mask_inv = cv2.bitwise_not(mask)
    
    # Convert to grayscale
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    
    # Apply mask to remove pink background
    result = cv2.bitwise_and(gray, gray, mask=mask_inv)
    
    # Fill pink areas with white
    result[mask > 0] = 255
    
    return Image.fromarray(result)

def advanced_enhance_page2(input_path):
    """Special processing for page 2 to make U521981590 visible"""
    print(f"Opening PDF for advanced processing: {input_path}")
    
    pdf_document = fitz.open(input_path)
    
    if len(pdf_document) < 2:
        print("PDF has less than 2 pages!")
        return
    
    page = pdf_document[1]  # Page 2 (0-indexed)
    
    # Try different DPI settings
    for dpi in [300, 400, 500]:
        print(f"\nTrying DPI: {dpi}")
        
        # Get page at high resolution
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        
        # Convert to PIL Image
        img_data = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_data))
        
        # Method 1: Remove pink background first
        print("Method 1: Removing pink background...")
        img_no_pink = remove_pink_background(img)
        
        # Enhance contrast
        contrast = ImageEnhance.Contrast(img_no_pink)
        img_enhanced = contrast.enhance(3.0)
        
        # Try different thresholds
        for threshold in [50, 70, 90, 110, 130, 150]:
            img_thresh = img_enhanced.point(lambda x: 0 if x < threshold else 255, '1')
            output_path = f"E:\\BarbiesBailBonds\\temp bond log\\page2_dpi{dpi}_thresh{threshold}_nopink.png"
            img_thresh.save(output_path)
            print(f"Saved: {output_path}")
        
        # Method 2: Direct color channel manipulation
        print("Method 2: Color channel manipulation...")
        img_np = np.array(img)
        
        # Extract individual color channels
        if len(img_np.shape) == 3:
            r, g, b = img_np[:,:,0], img_np[:,:,1], img_np[:,:,2]
            
            # Try to enhance text by looking at channel differences
            # Text might be darker in all channels
            diff_rg = np.abs(r.astype(float) - g.astype(float))
            diff_rb = np.abs(r.astype(float) - b.astype(float))
            diff_gb = np.abs(g.astype(float) - b.astype(float))
            
            # Combine differences
            combined = (diff_rg + diff_rb + diff_gb) / 3
            
            # Normalize
            combined = ((combined - combined.min()) / (combined.max() - combined.min()) * 255).astype(np.uint8)
            
            # Invert (text should be dark)
            combined = 255 - combined
            
            img_diff = Image.fromarray(combined)
            img_diff = ImageEnhance.Contrast(img_diff).enhance(2.0)
            
            output_path = f"E:\\BarbiesBailBonds\\temp bond log\\page2_dpi{dpi}_channel_diff.png"
            img_diff.save(output_path)
            print(f"Saved: {output_path}")
        
        # Method 3: Adaptive processing with OpenCV
        print("Method 3: Adaptive OpenCV processing...")
        gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
        
        # Apply CLAHE
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        # Adaptive threshold
        adaptive = cv2.adaptiveThreshold(enhanced, 255, 
                                       cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                       cv2.THRESH_BINARY, 21, 10)
        
        img_adaptive = Image.fromarray(adaptive)
        output_path = f"E:\\BarbiesBailBonds\\temp bond log\\page2_dpi{dpi}_adaptive.png"
        img_adaptive.save(output_path)
        print(f"Saved: {output_path}")
        
        # Method 4: Morphological operations
        print("Method 4: Morphological operations...")
        kernel = np.ones((2,2), np.uint8)
        
        # Try to enhance faint text
        dilated = cv2.dilate(255 - enhanced, kernel, iterations=1)
        eroded = cv2.erode(dilated, kernel, iterations=1)
        
        img_morph = Image.fromarray(255 - eroded)
        output_path = f"E:\\BarbiesBailBonds\\temp bond log\\page2_dpi{dpi}_morphological.png"
        img_morph.save(output_path)
        print(f"Saved: {output_path}")
    
    pdf_document.close()
    print("\nProcessing complete! Check the generated images for U521981590 visibility.")

def extract_page2_region(input_path):
    """Extract just the region where U521981590 should be"""
    print("\nExtracting specific region where U521981590 should appear...")
    
    pdf_document = fitz.open(input_path)
    page = pdf_document[1]  # Page 2
    
    # Get page at very high resolution
    zoom = 6.0  # Very high zoom
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    
    # Convert to PIL Image
    img_data = pix.tobytes("png")
    img = Image.open(io.BytesIO(img_data))
    
    # Crop to approximate region where POWER NO. appears (top right)
    # You may need to adjust these coordinates
    width, height = img.size
    # Top right region
    left = int(width * 0.6)
    top = int(height * 0.05)
    right = int(width * 0.95)
    bottom = int(height * 0.15)
    
    cropped = img.crop((left, top, right, bottom))
    
    # Process the cropped region with various methods
    for method_name, processed in [
        ("original", cropped),
        ("grayscale", cropped.convert('L')),
        ("high_contrast", ImageEnhance.Contrast(cropped.convert('L')).enhance(4.0)),
        ("inverted", ImageOps.invert(cropped.convert('L'))),
    ]:
        output_path = f"E:\\BarbiesBailBonds\\temp bond log\\page2_region_{method_name}.png"
        processed.save(output_path)
        print(f"Saved region: {output_path}")
        
        # Also try different thresholds on each
        if method_name != "original":
            for thresh in [80, 100, 120]:
                thresh_img = processed.point(lambda x: 0 if x < thresh else 255, '1')
                output_path = f"E:\\BarbiesBailBonds\\temp bond log\\page2_region_{method_name}_thresh{thresh}.png"
                thresh_img.save(output_path)
    
    pdf_document.close()

if __name__ == "__main__":
    input_pdf = r"E:\BarbiesBailBonds\temp bond log\New folder\09152025.pdf"
    
    # Run advanced enhancement
    advanced_enhance_page2(input_pdf)
    
    # Extract specific region
    extract_page2_region(input_pdf)