import fitz

# Open the final PDF and extract page 2 to verify
pdf = fitz.open(r"E:\BarbiesBailBonds\temp bond log\09152025_FINAL_ENHANCED.pdf")
page2 = pdf[1]

# Save page 2 as image to verify
pix = page2.get_pixmap()
pix.save(r"E:\BarbiesBailBonds\temp bond log\FINAL_page2_check.png")

print(f"Total pages in final PDF: {len(pdf)}")
print("Page 2 extracted and saved as FINAL_page2_check.png")
print("\nThe enhanced PDF is ready for OCR processing!")
print("You can now use Adobe Acrobat's OCR tool to make the text searchable and selectable.")
print("\nFile location: E:\\BarbiesBailBonds\\temp bond log\\09152025_FINAL_ENHANCED.pdf")

pdf.close()