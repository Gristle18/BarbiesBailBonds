import os
import re

# Files to update (excluding AdminSearch as requested)
files_to_update = [
    'bail-bond-application/bail-bond-application.html',
    'bail-bond-application-spanish/bail-bond-application-spanish.html',
    'AboutUs/index.html',
    'IDUpload/index.html',
    'InmateLocator/index.html',
    'Warrant/index.html',
    'Warrant-spanish/index.html',
    'components/chatbot.html',
    'components/chatbot-embed.html'
]

# OnlineApplication-spanish/index.html already updated

old_url = 'https://script.google.com/macros/s/AKfycbwvJ8utZ62xKjZt2nz8wZnBJb5vbOsCD38RJnDZ0yFZGppsfWnmv7_YIuz5yV9lZz7z/exec'
new_url = 'https://script.google.com/macros/s/AKfycbyBDZhRuMme-LjdzVzW1nM6gl6wfqOlFWFm7YOY8ni6t0UAVQHhGYRQUb-3tv_mOZM0/exec'

changes_made = []

for file_path in files_to_update:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Replace the URL
        content = content.replace(old_url, new_url)
        
        # Fix response.answer to response.response
        content = re.sub(r'response\.answer\b', 'response.response', content)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            changes_made.append(file_path)
            print(f"Updated: {file_path}")
        else:
            print(f"No changes needed: {file_path}")
    else:
        print(f"File not found: {file_path}")

print(f"\nTotal files updated: {len(changes_made)}")
