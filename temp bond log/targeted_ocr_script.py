#!/usr/bin/env python3
"""
Targeted OCR Script for Bond Log Documents
Extracts text from specific pages containing target strings and creates searchable PDF
"""

import os
import sys
import cv2
import numpy as np
from PIL import Image, ImageEnhance
import pytesseract
import easyocr
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import transparent
import fitz  # PyMuPDF
import argparse
from pathlib import Path

class BondLogOCR:
    def __init__(self, input_dir):
        self.input_dir = Path(input_dir)
        self.target_strings = [
            "WEST, UNDRA D",
            "WHITE-COURT COPY", 
            "CPL H. ONEAL",
            "INTAKE DESK",
            "MDC INTAKE",
            "BAIL BOND AGENT COPY"
        ]
        self.target_pages = [1, 8]  # Based on analysis
        self.easyocr_reader = None
        
    def init_easyocr(self):
        """Initialize EasyOCR reader"""
        try:
            self.easyocr_reader = easyocr.Reader(['en'])
            return True
        except Exception as e:
            print(f"Failed to initialize EasyOCR: {e}")
            return False
    
    def preprocess_image(self, image_path, method='adaptive'):
        """
        Preprocess image for better OCR results
        """
        # Load image
        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        if method == 'adaptive':
            # Adaptive thresholding
            processed = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
        elif method == 'threshold':
            # Simple thresholding
            _, processed = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY)
        elif method == 'denoise':
            # Denoising + thresholding
            denoised = cv2.fastNlMeansDenoising(gray)
            _, processed = cv2.threshold(denoised, 128, 255, cv2.THRESH_BINARY)
        else:
            processed = gray
        
        return processed
    
    def enhance_image_pil(self, image_path):
        """
        Enhance image using PIL for better text recognition
        """
        img = Image.open(image_path)
        
        # Convert to grayscale if needed
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
        """
        Extract text using Tesseract OCR with multiple preprocessing methods
        """
        results = {}
        
        # Try different preprocessing methods
        methods = ['adaptive', 'threshold', 'denoise', 'original']
        
        for method in methods:
            try:
                if method == 'original':
                    # Use PIL enhancement for original
                    img = self.enhance_image_pil(image_path)
                    img_array = np.array(img)
                else:
                    # Use OpenCV preprocessing
                    img_array = self.preprocess_image(image_path, method)
                
                # Configure Tesseract
                config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:-/ '
                
                # Extract text
                text = pytesseract.image_to_string(img_array, config=config)
                results[method] = text.strip()
                
            except Exception as e:
                print(f"Tesseract {method} failed: {e}")
                results[method] = ""
        
        return results
    
    def extract_text_easyocr(self, image_path):
        """
        Extract text using EasyOCR
        """
        if not self.easyocr_reader:
            if not self.init_easyocr():
                return ""
        
        try:
            results = self.easyocr_reader.readtext(str(image_path))
            text = " ".join([result[1] for result in results])
            return text.strip()
        except Exception as e:
            print(f"EasyOCR failed: {e}")
            return ""
    
    def find_target_strings(self, text):
        """
        Find target strings in extracted text
        """
        found_strings = []
        text_upper = text.upper()
        
        for target in self.target_strings:
            if target.upper() in text_upper:
                found_strings.append(target)
        
        return found_strings
    
    def process_target_pages(self):
        """
        Process only the pages that contain target text
        """
        results = {}
        
        for page_num in self.target_pages:
            page_file = self.input_dir / f"page_{page_num}_sample.png"
            if not page_file.exists():
                print(f"Warning: {page_file} not found")
                continue
            
            print(f"\nProcessing Page {page_num}...")
            
            # Extract text using multiple methods
            tesseract_results = self.extract_text_tesseract(page_file)
            easyocr_text = self.extract_text_easyocr(page_file)
            
            # Find target strings in each result
            page_results = {
                'tesseract': {},
                'easyocr': {
                    'text': easyocr_text,
                    'found_targets': self.find_target_strings(easyocr_text)
                }
            }
            
            for method, text in tesseract_results.items():
                page_results['tesseract'][method] = {
                    'text': text,
                    'found_targets': self.find_target_strings(text)
                }
            
            results[page_num] = page_results
        
        return results
    
    def create_searchable_pdf(self, ocr_results, output_path):
        """
        Create a new PDF with extracted text as searchable layer
        """
        try:
            # Create new PDF document
            doc = fitz.open()
            
            for page_num in self.target_pages:
                page_file = self.input_dir / f"page_{page_num}_sample.png"
                if not page_file.exists():
                    continue
                
                # Add page with image
                img_doc = fitz.open(str(page_file))
                page = doc.new_page(width=img_doc[0].rect.width, height=img_doc[0].rect.height)
                
                # Insert image
                page.insert_image(page.rect, filename=str(page_file))
                
                # Get best OCR text for this page
                if page_num in ocr_results:
                    best_text = self.get_best_ocr_text(ocr_results[page_num])
                    
                    # Add invisible text layer
                    if best_text:
                        # Add text in small, transparent font across the page
                        text_rect = fitz.Rect(10, 10, page.rect.width - 10, page.rect.height - 10)
                        page.insert_textbox(
                            text_rect,
                            best_text,
                            fontsize=1,
                            color=(1, 1, 1),  # White text (invisible on white background)
                            overlay=False
                        )
            
            # Save the PDF
            doc.save(output_path)
            doc.close()
            
            print(f"Searchable PDF created: {output_path}")
            return True
            
        except Exception as e:
            print(f"Failed to create searchable PDF: {e}")
            return False
    
    def get_best_ocr_text(self, page_results):
        """
        Select the best OCR result based on target string detection
        """
        best_text = ""
        max_targets = 0
        
        # Check EasyOCR results
        easyocr_targets = len(page_results['easyocr']['found_targets'])
        if easyocr_targets > max_targets:
            max_targets = easyocr_targets
            best_text = page_results['easyocr']['text']
        
        # Check Tesseract results
        for method, result in page_results['tesseract'].items():
            targets_found = len(result['found_targets'])
            if targets_found > max_targets:
                max_targets = targets_found
                best_text = result['text']
        
        return best_text
    
    def verify_searchability(self, pdf_path):
        """
        Verify that target strings are searchable in the PDF
        """
        try:
            doc = fitz.open(pdf_path)
            found_targets = []
            
            for target in self.target_strings:
                # Search for target string in PDF
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    text_instances = page.search_for(target)
                    if text_instances:
                        found_targets.append(target)
                        print(f"✓ Found searchable text: '{target}' on page {page_num + 1}")
                        break
            
            doc.close()
            return found_targets
            
        except Exception as e:
            print(f"Failed to verify searchability: {e}")
            return []
    
    def run_analysis(self):
        """
        Run complete OCR analysis and create searchable PDF
        """
        print("=== Bond Log OCR Analysis ===")
        print(f"Input directory: {self.input_dir}")
        print(f"Target pages: {self.target_pages}")
        print(f"Target strings: {self.target_strings}")
        
        # Process target pages
        ocr_results = self.process_target_pages()
        
        # Print results summary
        print("\n=== OCR Results Summary ===")
        for page_num, results in ocr_results.items():
            print(f"\nPage {page_num}:")
            
            # EasyOCR results
            easyocr_targets = results['easyocr']['found_targets']
            print(f"  EasyOCR found: {easyocr_targets}")
            
            # Tesseract results
            for method, result in results['tesseract'].items():
                targets = result['found_targets']
                if targets:
                    print(f"  Tesseract ({method}) found: {targets}")
        
        # Create searchable PDF
        output_pdf = self.input_dir / "bond_log_searchable.pdf"
        if self.create_searchable_pdf(ocr_results, output_pdf):
            # Verify searchability
            print("\n=== Searchability Verification ===")
            found_targets = self.verify_searchability(output_pdf)
            
            if found_targets:
                print(f"✓ Successfully made {len(found_targets)} target strings searchable")
            else:
                print("⚠ Warning: No target strings found as searchable in PDF")
        
        return ocr_results

def main():
    parser = argparse.ArgumentParser(description='OCR Analysis for Bond Log Documents')
    parser.add_argument('input_dir', help='Directory containing page sample images')
    
    args = parser.parse_args()
    
    # Check if input directory exists
    if not os.path.exists(args.input_dir):
        print(f"Error: Input directory '{args.input_dir}' does not exist")
        sys.exit(1)
    
    # Run OCR analysis
    ocr = BondLogOCR(args.input_dir)
    results = ocr.run_analysis()
    
    print("\n=== Analysis Complete ===")

if __name__ == "__main__":
    main()