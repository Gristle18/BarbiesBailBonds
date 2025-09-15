#!/usr/bin/env python3
"""
Verify PDF Searchability Script
Tests if specific target strings are searchable in the generated PDF
"""

import sys
import fitz  # PyMuPDF
from pathlib import Path

def verify_pdf_searchability(pdf_path):
    """Verify that target strings are searchable in the PDF"""
    target_strings = [
        "WEST, UNDRA D",
        "WHITE-COURT COPY", 
        "CPL H. ONEAL",
        "INTAKE DESK",
        "MDC INTAKE",
        "BAIL BOND AGENT COPY",
        "CHANDLER, CHAD",
        "PALM BEACH COUNTY",
        "SHERIFF",
        "BOOKING FACE SHEET"
    ]
    
    try:
        doc = fitz.open(pdf_path)
        found_targets = []
        search_results = {}
        
        print(f"Analyzing PDF: {pdf_path}")
        print(f"Total pages: {len(doc)}")
        print("\n=== Search Results ===")
        
        for target in target_strings:
            search_results[target] = []
            
            # Search across all pages
            for page_num in range(len(doc)):
                page = doc[page_num]
                text_instances = page.search_for(target)
                
                if text_instances:
                    found_targets.append(target)
                    search_results[target].append(page_num + 1)
                    print(f"FOUND: '{target}' on page {page_num + 1}")
                    break
        
        doc.close()
        
        # Summary
        print(f"\n=== Summary ===")
        print(f"Target strings searched: {len(target_strings)}")
        print(f"Target strings found: {len(found_targets)}")
        print(f"Success rate: {len(found_targets)/len(target_strings)*100:.1f}%")
        
        if found_targets:
            print(f"\nSuccessfully searchable strings:")
            for target in found_targets:
                pages = search_results[target]
                print(f"  - '{target}' (pages: {pages})")
        
        not_found = [t for t in target_strings if t not in found_targets]
        if not_found:
            print(f"\nStrings not found:")
            for target in not_found:
                print(f"  - '{target}'")
        
        return found_targets
        
    except Exception as e:
        print(f"Error verifying PDF: {e}")
        return []

def extract_sample_text(pdf_path, max_pages=3):
    """Extract sample text from PDF pages for debugging"""
    try:
        doc = fitz.open(pdf_path)
        
        print(f"\n=== Sample Text Extraction ===")
        
        for page_num in range(min(max_pages, len(doc))):
            page = doc[page_num]
            text = page.get_text()
            
            print(f"\nPage {page_num + 1} text ({len(text)} characters):")
            if text.strip():
                # Show first 200 characters
                sample = text.strip()[:200]
                print(f"  {sample}...")
            else:
                print("  [No extractable text found]")
        
        doc.close()
        
    except Exception as e:
        print(f"Error extracting sample text: {e}")

def main():
    if len(sys.argv) != 2:
        print("Usage: python verify_pdf_searchability.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    if not Path(pdf_path).exists():
        print(f"Error: PDF file '{pdf_path}' does not exist")
        sys.exit(1)
    
    # Verify searchability
    found_targets = verify_pdf_searchability(pdf_path)
    
    # Extract sample text for debugging
    extract_sample_text(pdf_path)
    
    # Final result
    if found_targets:
        print(f"\n*** SUCCESS: PDF contains {len(found_targets)} searchable target strings! ***")
    else:
        print(f"\n*** WARNING: No target strings found as searchable ***")

if __name__ == "__main__":
    main()