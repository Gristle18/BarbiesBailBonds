"""
Split large CSV file with embeddings into smaller files for Google Sheets import
"""

import csv
import json
import os
from datetime import datetime

def split_csv_file(input_file, output_prefix, rows_per_file=1500):
    """
    Split a large CSV file into smaller chunks

    Args:
        input_file: Path to the large CSV file
        output_prefix: Prefix for output files
        rows_per_file: Number of data rows per output file
    """

    # Read the header first
    with open(input_file, 'r', encoding='utf-8') as infile:
        reader = csv.reader(infile)
        header = next(reader)

        # Count total rows for progress tracking
        total_rows = sum(1 for row in reader)
        print(f"Total data rows: {total_rows}")

    # Calculate number of output files needed
    num_files = (total_rows + rows_per_file - 1) // rows_per_file
    print(f"Will create {num_files} files with ~{rows_per_file} rows each")

    # Reset to beginning and split
    with open(input_file, 'r', encoding='utf-8') as infile:
        reader = csv.reader(infile)
        header = next(reader)  # Skip header again

        file_num = 1
        row_count = 0
        current_file = None
        current_writer = None

        for row_idx, row in enumerate(reader, 1):
            # Start a new file if needed
            if row_count == 0:
                if current_file:
                    current_file.close()

                output_filename = f"{output_prefix}_part{file_num}.csv"
                print(f"\nCreating {output_filename}...")
                current_file = open(output_filename, 'w', newline='', encoding='utf-8')
                current_writer = csv.writer(current_file)
                current_writer.writerow(header)

            # Write the row
            current_writer.writerow(row)
            row_count += 1

            # Progress indicator
            if row_idx % 100 == 0:
                print(f"  Processed {row_idx}/{total_rows} rows...")

            # Check if we need to start a new file
            if row_count >= rows_per_file:
                print(f"  Completed {output_filename} with {row_count} rows")
                file_num += 1
                row_count = 0

        # Close the last file
        if current_file:
            current_file.close()
            print(f"  Completed {output_filename} with {row_count} rows")

    print(f"\n✅ Split complete! Created {file_num} files")

    # Print file sizes
    print("\nFile sizes:")
    for i in range(1, file_num + 1):
        filename = f"{output_prefix}_part{i}.csv"
        size_mb = os.path.getsize(filename) / (1024 * 1024)
        print(f"  {filename}: {size_mb:.1f} MB")

def main():
    """
    Main function to split the encoded defendant data CSV
    """
    input_file = "assets/encoded_defendant_data.csv"
    output_prefix = "assets/encoded_defendant_data"

    if not os.path.exists(input_file):
        print(f"❌ Error: {input_file} not found!")
        return

    print("=" * 60)
    print("CSV Splitter for AdminSearch Data")
    print("=" * 60)
    print(f"Input file: {input_file}")
    print(f"Output prefix: {output_prefix}_partN.csv")
    print(f"Target rows per file: 1,500")
    print("=" * 60)

    start_time = datetime.now()

    try:
        split_csv_file(input_file, output_prefix, rows_per_file=1500)

        elapsed = datetime.now() - start_time
        print(f"\n⏱️ Total time: {elapsed.total_seconds():.1f} seconds")

        print("\n📋 Next steps:")
        print("1. Upload each part file to a separate Google Sheet")
        print("2. Note the Sheet ID for each part")
        print("3. Update the Apps Script with all Sheet IDs")
        print("4. The Apps Script will search across all sheets automatically")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()