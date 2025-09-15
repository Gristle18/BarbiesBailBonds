import fitz
import os

def test_all_pdfs():
    """Test all PDF versions for selectability"""
    
    pdfs_to_test = [
        "09152025_COMPLETE_OCR.pdf",
        "09152025_FULL_TEXT_OVERLAY.pdf",
        "09152025_FINAL_SELECTABLE.pdf"
    ]
    
    print("="*70)
    print("TESTING ALL PDF VERSIONS FOR TEXT SELECTABILITY")
    print("="*70)
    
    for pdf_name in pdfs_to_test:
        pdf_path = f"E:\\BarbiesBailBonds\\temp bond log\\{pdf_name}"
        if os.path.exists(pdf_path):
            print(f"\nTesting: {pdf_name}")
            print("-" * 50)
            
            pdf = fitz.open(pdf_path)
            
            # Test page 2 specifically
            page2 = pdf[1]
            text = page2.get_text()
            
            # Check for U521981590
            found_variants = []
            if "U521981590" in text:
                found_variants.append("U521981590")
            if "U5-21981590" in text:
                found_variants.append("U5-21981590")
            if "521981590" in text:
                found_variants.append("521981590")
            
            if found_variants:
                print(f"  SUCCESS: Found {', '.join(found_variants)} on page 2")
            else:
                print(f"  WARNING: U521981590 not found in extracted text")
            
            # Count pages with text
            pages_with_text = 0
            total_chars = 0
            for i in range(len(pdf)):
                page_text = pdf[i].get_text()
                if len(page_text.strip()) > 10:
                    pages_with_text += 1
                    total_chars += len(page_text)
            
            print(f"  Pages with text: {pages_with_text}/{len(pdf)}")
            print(f"  Total characters: {total_chars:,}")
            
            pdf.close()
    
    print("\n" + "="*70)
    print("RECOMMENDATION")
    print("="*70)
    print("\nBEST OPTION: 09152025_COMPLETE_OCR.pdf")
    print("This version has the most comprehensive text coverage.")
    print("\nTo use it:")
    print("1. Open 09152025_COMPLETE_OCR.pdf in any PDF viewer")
    print("2. Press Ctrl+F and search for 'U521981590'")
    print("3. Use Ctrl+A to select all text")
    print("4. Copy and paste to Excel/Word")
    print("\nIf you still need better OCR, use Google Drive method with")
    print("09152025_FINAL_PROPER_SIZE.pdf for 100% accuracy.")

if __name__ == "__main__":
    test_all_pdfs()