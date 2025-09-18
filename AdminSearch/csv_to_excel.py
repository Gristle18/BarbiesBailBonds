#!/usr/bin/env python3
"""
Convert the encoded CSV to Excel format for easy Google Sheets import
"""

import pandas as pd
from pathlib import Path

def convert_csv_to_excel():
    """Convert the encoded CSV to Excel format"""
    
    csv_file = Path("assets/encoded_defendant_data.csv")
    excel_file = Path("assets/encoded_defendant_data.xlsx")
    
    if not csv_file.exists():
        print(f"CSV file not found: {csv_file}")
        return
    
    print(f"Converting {csv_file} to {excel_file}...")
    
    try:
        # Read CSV
        df = pd.read_csv(csv_file)
        print(f"Loaded {len(df)} records from CSV")
        
        # Write to Excel
        df.to_excel(excel_file, index=False, engine='openpyxl')
        
        print(f"Successfully created {excel_file}")
        print(f"File size: {excel_file.stat().st_size / (1024*1024):.1f} MB")
        
        # Show sample of data
        print("\nSample data:")
        print(df.head()[['Row Index', 'Indemnitor Name', 'Defendant Name', 'Primary Phone']].to_string())
        
    except Exception as e:
        print(f"Error converting to Excel: {e}")

if __name__ == "__main__":
    convert_csv_to_excel()