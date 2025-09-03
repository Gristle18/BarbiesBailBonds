# Claude Instructions for BarbiesBailBonds Repository

## Git Commit Policy

**IMPORTANT**: After making ANY change to files in this repository, you MUST:

1. **Commit immediately** after each file modification
2. Use descriptive commit messages following this format:
   - `feat:` for new features
   - `fix:` for bug fixes  
   - `docs:` for documentation changes
   - `style:` for formatting changes
   - `refactor:` for code refactoring
   - `test:` for test additions/changes
   - `chore:` for maintenance tasks

3. **Example workflow**:
   - Make a change to a file
   - Run: `git add .`
   - Run: `git commit -m "feat: add form validation"`
   - Continue with next task

4. **Push to GitHub** after every 3-5 commits or when explicitly requested

## Repository Context

This is the Barbie's Bail Bonds website project. The main goal is to create a form that connects to Google Sheets for managing bail bond inquiries.

## Link Behavior Rules

**IMPORTANT**: Follow these link behavior rules for all pages:

- **Internal navigation** (within Barbie's Bail Bonds site): Links should open in the same tab (no `target="_blank"`)
  - Examples: Navigation between pages, application links to Google Sites forms
- **External links** (to other websites): Links should open in new tab (`target="_blank"`)
  - Examples: PBSO Inmate Locator, YouTube videos, Google Maps, external resources

## Phone Number Formatting Rules

**IMPORTANT**: Ensure phone numbers never break across lines:

- **Always** add `white-space: nowrap;` CSS property to phone numbers
- This prevents phone numbers from wrapping and breaking across multiple lines
- Apply to all instances of the phone number 561-247-0018
- Example: `<strong style="color: var(--brand); white-space: nowrap;">561-247-0018</strong>`

## Development Session Log

### Step 1: Warrant Page Creation and Structure
- Created E:\BarbiesBailBonds\Warrant\ folder structure
- Added index.html, README.txt, instructions.txt, assets/, scripts/ folders
- Established foundation for warrant information page

### Step 2: Warrant Page Content Implementation
- Added comprehensive warrant information from instructions.txt
- Implemented Traffic & Misdemeanor section with walkthrough bond process
- Added detailed 7-step walkthrough bail bond process list
- Implemented Felony section with "speedy booking" process explanation
- Added YouTube video embed (K6WxiOXH4XQ) instead of plain link
- Integrated phone number 561-247-0018 throughout content

### Step 3: Warrant Page Design Updates
- Removed logo and made background transparent with white text
- Created full-width banner structure using viewport CSS (100vw)
- Implemented cards-within-banners layout architecture
- Added prominent "no arrest or booking" highlighted card
- Positioned Traffic & Misdemeanor section at top after subtitle
- Changed section backgrounds to white with black text for readability

### Step 4: Interactive Features Implementation
- Added warrant type selection buttons (Traffic/Misdemeanor vs Felony)
- Implemented smooth scrolling JavaScript functionality with preventDefault
- Added proper scroll offset using scroll-margin-top: 100px CSS
- Created card-style selection buttons with hover effects and icons (🚗, ⚖️)
- Added descriptive text for each warrant type option
- Positioned selection buttons prominently under subtitle text

### Step 5: Styling Refinements and Color Updates
- Changed banners from orange gradient to white backgrounds with black text
- Updated buttons from orange to black with dark hover states
- Removed text underlines and replaced with bold text on hover
- Made urgent service banner cream-colored (#fff2d1) instead of red
- Applied orange color (var(--brand)) to all phone numbers consistently
- Updated "no arrest" card with white background and black border
- Removed duplicate sections and cleaned up layout structure

### Step 6: Spanish Translation Implementation
- Created complete Spanish version of Warrant page (Warrant-spanish/index.html)
- Translated all content: titles, descriptions, process steps, buttons
- Maintained identical functionality and styling as English version
- Updated warrant type descriptions for Spanish speakers
- Applied same interactive features and smooth scrolling
- Ensured consistent phone number formatting and styling

## Remember

- Always commit after EVERY file change
- Keep commits atomic and focused
- Write clear, concise commit messages
- Follow link behavior rules for consistent user experience
- This ensures full tracking of all development progress