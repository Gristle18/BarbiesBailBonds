import fitz
import os

def search_for_specific_text():
    """Search for specific text strings requested by user"""
    
    # Text to search for
    search_terms = [
        "WEST, UNDRA D",
        "WHITE-COURT COPY",
        "YELLOW - DEFENDANT COPY",
        "PINK",
        "ARRESTING OFFICER",
        "CPL H. ONEAL",
        "INTAKE DESK"
    ]
    
    # PDFs to check
    pdfs_to_check = [
        "09152025_COMPLETE_OCR.pdf",
        "09152025_FULL_TEXT_OVERLAY.pdf",
        "09152025_FINAL_PROPER_SIZE.pdf"
    ]
    
    print("="*70)
    print("SEARCHING FOR SPECIFIC TEXT IN PDFs")
    print("="*70)
    print("\nSearching for:")
    for term in search_terms:
        print(f"  - {term}")
    print()
    
    for pdf_name in pdfs_to_check:
        pdf_path = f"E:\\BarbiesBailBonds\\temp bond log\\{pdf_name}"
        
        if os.path.exists(pdf_path):
            print(f"\n{'='*70}")
            print(f"Checking: {pdf_name}")
            print("="*70)
            
            pdf = fitz.open(pdf_path)
            
            # Search through all pages
            found_items = {}
            
            for page_num in range(len(pdf)):
                page = pdf[page_num]
                text = page.get_text().upper()  # Convert to uppercase for case-insensitive search
                
                for search_term in search_terms:
                    if search_term.upper() in text:
                        if search_term not in found_items:
                            found_items[search_term] = []
                        found_items[search_term].append(page_num + 1)
            
            if found_items:
                print("\nFOUND:")
                for term, pages in found_items.items():
                    print(f"  FOUND: '{term}' on page(s): {', '.join(map(str, pages[:5]))}")
                    if len(pages) > 5:
                        print(f"    (and {len(pages)-5} more pages)")
            else:
                print("\nNONE of the search terms were found!")
                print("This means the PDF does NOT have selectable text for these items.")
                
            # Show a sample of what text IS in the PDF
            print("\nSample of text that IS in the PDF:")
            sample_page = pdf[0]
            sample_text = sample_page.get_text()[:500]
            if sample_text:
                print(sample_text)
            else:
                print("No extractable text found on first page")
            
            pdf.close()
    
    print("\n" + "="*70)
    print("CONCLUSION")
    print("="*70)
    print("\nThe current PDFs only have power numbers and basic terms embedded.")
    print("The specific text you're looking for (names, copy colors, officer names)")
    print("is NOT yet OCR'd and selectable.")
    print("\nTo make this text selectable, you need REAL OCR.")

if __name__ == "__main__":
    search_for_specific_text()