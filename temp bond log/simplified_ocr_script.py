#!/usr/bin/env python3
"""
Simplified OCR Script for Bond Log Documents
Uses pytesseract and creates searchable PDF with extracted text
"""

import os
import sys
import cv2
import numpy as np
from PIL import Image, ImageEnhance
import pytesseract
import fitz  # PyMuPDF
from pathlib import Path

class SimplifiedBondLogOCR:
    def __init__(self, input_dir):
        self.input_dir = Path(input_dir)
        self.target_strings = [
            "WEST, UNDRA D",
            "WHITE-COURT COPY", 
            "CPL H. ONEAL",
            "INTAKE DESK",
            "MDC INTAKE",
            "BAIL BOND AGENT COPY",
            "CHANDLER, CHAD"
        ]
        self.target_pages = [1, 8]  # Based on analysis
        
        # Try to configure Tesseract
        self.configure_tesseract()
        
    def configure_tesseract(self):
        """Configure Tesseract path for Windows"""
        possible_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            r"C:\Users\{}\AppData\Local\Programs\Tesseract-OCR\tesseract.exe".format(os.getenv('USERNAME')),
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                print(f"Found Tesseract at: {path}")
                return True
        
        print("Warning: Tesseract not found in common locations")
        return False
    
    def preprocess_image(self, image_path, method='adaptive'):
        """Preprocess image for better OCR results"""
        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        if method == 'adaptive':
            processed = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
        elif method == 'threshold':
            _, processed = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY)
        elif method == 'denoise':
            denoised = cv2.fastNlMeansDenoising(gray)
            _, processed = cv2.threshold(denoised, 128, 255, cv2.THRESH_BINARY)
        else:
            processed = gray
        
        return processed
    
    def enhance_image_pil(self, image_path):
        """Enhance image using PIL"""
        img = Image.open(image_path)
        
        if img.mode != 'L':
            img = img.convert('L')
        
        # Enhance contrast
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.0)
        
        # Enhance sharpness
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(2.0)
        
        return img
    
    def extract_text_tesseract(self, image_path):
        """Extract text using Tesseract with multiple methods"""
        results = {}
        methods = ['adaptive', 'threshold', 'denoise', 'original']
        
        for method in methods:
            try:
                if method == 'original':
                    img = self.enhance_image_pil(image_path)
                    img_array = np.array(img)
                else:
                    img_array = self.preprocess_image(image_path, method)
                
                # Basic Tesseract configuration
                config = r'--oem 3 --psm 6'
                text = pytesseract.image_to_string(img_array, config=config)
                results[method] = text.strip()
                
            except Exception as e:
                print(f"Tesseract {method} failed: {e}")
                results[method] = ""
        
        return results
    
    def find_target_strings(self, text):
        """Find target strings in extracted text"""
        found_strings = []
        text_upper = text.upper()
        
        for target in self.target_strings:
            if target.upper() in text_upper:
                found_strings.append(target)
        
        return found_strings
    
    def process_all_pages(self):
        """Process all available page images"""
        results = {}
        
        # Find all page images
        page_files = list(self.input_dir.glob("page_*_sample.png"))
        
        for page_file in sorted(page_files):
            # Extract page number from filename
            page_num = page_file.stem.split('_')[1]
            
            print(f"\nProcessing {page_file.name}...")
            
            try:
                # Extract text using Tesseract
                tesseract_results = self.extract_text_tesseract(page_file)
                
                # Find target strings in each result
                page_results = {'tesseract': {}}
                
                for method, text in tesseract_results.items():
                    page_results['tesseract'][method] = {
                        'text': text,
                        'found_targets': self.find_target_strings(text)
                    }
                
                results[page_num] = page_results
                
            except Exception as e:
                print(f"Error processing {page_file.name}: {e}")
        
        return results
    
    def get_best_ocr_text(self, page_results):
        """Select the best OCR result"""
        best_text = ""
        max_targets = 0
        
        for method, result in page_results['tesseract'].items():
            targets_found = len(result['found_targets'])
            text_length = len(result['text'])
            
            # Prefer results with more targets found, or longer text if same targets
            if targets_found > max_targets or (targets_found == max_targets and text_length > len(best_text)):
                max_targets = targets_found
                best_text = result['text']
        
        return best_text
    
    def create_searchable_pdf(self, ocr_results, output_path):
        """Create searchable PDF with OCR text"""
        try:
            doc = fitz.open()
            
            # Find all page images and sort them
            page_files = sorted(list(self.input_dir.glob("page_*_sample.png")))
            
            for page_file in page_files:
                page_num = page_file.stem.split('_')[1]
                
                # Load image and get dimensions
                img = Image.open(page_file)
                width, height = img.size
                
                # Create new page with image dimensions
                page = doc.new_page(width=width, height=height)
                
                # Insert the image
                page.insert_image(fitz.Rect(0, 0, width, height), filename=str(page_file))
                
                # Add OCR text if available
                if page_num in ocr_results:
                    best_text = self.get_best_ocr_text(ocr_results[page_num])
                    
                    if best_text:
                        # Add invisible text layer
                        words = best_text.split()
                        if words:
                            # Distribute words across the page
                            words_per_line = max(1, len(words) // 20)  # Rough estimate
                            y_pos = 50
                            
                            for i in range(0, len(words), words_per_line):
                                line_words = words[i:i + words_per_line]
                                line_text = " ".join(line_words)
                                
                                # Insert text with very small, transparent font
                                text_rect = fitz.Rect(10, y_pos, width - 10, y_pos + 10)
                                page.insert_textbox(
                                    text_rect,
                                    line_text,
                                    fontsize=1,
                                    color=(1, 1, 1),  # White (invisible)
                                    overlay=False
                                )
                                y_pos += 15
                                
                                if y_pos > height - 20:
                                    break
            
            # Save PDF
            doc.save(output_path)
            doc.close()
            
            print(f"\nSearchable PDF created: {output_path}")
            return True
            
        except Exception as e:
            print(f"Failed to create searchable PDF: {e}")
            return False
    
    def verify_searchability(self, pdf_path):
        """Verify searchability of target strings"""
        try:
            doc = fitz.open(pdf_path)
            found_targets = []
            
            for target in self.target_strings:
                # Search in PDF
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    text_instances = page.search_for(target)
                    if text_instances:
                        found_targets.append(target)
                        print(f"Found searchable: '{target}' on page {page_num + 1}")
                        break
            
            doc.close()
            return found_targets
            
        except Exception as e:
            print(f"Verification failed: {e}")
            return []
    
    def run_analysis(self):
        """Run complete analysis"""
        print("=== Simplified Bond Log OCR Analysis ===")
        print(f"Input directory: {self.input_dir}")
        print(f"Target strings: {self.target_strings}")
        
        # Process all pages
        ocr_results = self.process_all_pages()
        
        # Print summary
        print("\n=== OCR Results Summary ===")
        for page_num, results in ocr_results.items():
            print(f"\nPage {page_num}:")
            
            for method, result in results['tesseract'].items():
                targets = result['found_targets']
                if targets:
                    print(f"  {method}: Found {targets}")
                elif len(result['text']) > 50:  # Show method with substantial text
                    print(f"  {method}: {len(result['text'])} characters extracted")
        
        # Create searchable PDF
        output_pdf = self.input_dir / "bond_log_searchable_simplified.pdf"
        if self.create_searchable_pdf(ocr_results, output_pdf):
            # Verify
            print("\n=== Searchability Test ===")
            found_targets = self.verify_searchability(output_pdf)
            
            if found_targets:
                print(f"Success: {len(found_targets)} target strings are now searchable!")
            else:
                print("Warning: Target strings may not be searchable yet")
                
                # Show some extracted text for debugging
                print("\nSample extracted text:")
                for page_num, results in list(ocr_results.items())[:2]:
                    best_text = self.get_best_ocr_text(results)
                    if best_text:
                        print(f"Page {page_num}: {best_text[:200]}...")
        
        return ocr_results

def main():
    if len(sys.argv) != 2:
        print("Usage: python simplified_ocr_script.py <input_directory>")
        sys.exit(1)
    
    input_dir = sys.argv[1]
    
    if not os.path.exists(input_dir):
        print(f"Error: Directory '{input_dir}' does not exist")
        sys.exit(1)
    
    # Run analysis
    ocr = SimplifiedBondLogOCR(input_dir)
    results = ocr.run_analysis()
    
    print("\n=== Analysis Complete ===")

if __name__ == "__main__":
    main()