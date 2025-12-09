# CLAUDE.md - AKIM Website Development Guide

This document provides AI assistants with comprehensive context about the AKIM website codebase, its structure, conventions, and development workflows.

## Project Overview

**AKIM Getriebetechnik Website**
- **Company**: AKIM AG - Swiss manufacturer of precision gear systems
- **Type**: Static website (HTML/CSS/JavaScript)
- **Current Status**: Temporary landing page due to provider issues
- **Languages**: German (primary) and English
- **Domain**: www.akim.ch

### Purpose
The repository contains:
1. **Current Site**: Temporary landing page with contact information
2. **Archive**: Complete previous website (`alte_seite/`) preserved for reference

## Repository Structure

```
/
├── index.html                    # Current temporary landing page
├── css/
│   └── style.css                # Main stylesheet with AKIM branding
├── assets/
│   ├── images/
│   │   ├── Akim_Signet_2014_gross.jpg    # Main logo (250KB)
│   │   └── Akim_Signet_2014_email.jpg    # Email logo (24KB)
│   └── icons/
│       └── favicon.ico          # Site favicon
├── alte_seite/                  # Archived previous website
│   ├── *.html                   # German pages
│   ├── eng-Seiten/              # English pages
│   ├── css/                     # Old stylesheets
│   ├── js/                      # Old JavaScript
│   ├── Bilder/                  # Old images
│   ├── Produkte/                # Product resources
│   ├── Referenzen/              # Reference projects
│   ├── PDFs/                    # Documentation
│   └── fonts/                   # Custom fonts
├── .gitignore                   # Git ignore rules
└── CLAUDE.md                    # This file
```

## Technology Stack

### Frontend
- **HTML5**: Semantic markup, proper accessibility
- **CSS3**: Custom properties (CSS variables), Flexbox, responsive design
- **JavaScript**: Vanilla ES6+ (no frameworks)
- **Fonts**: Google Fonts (Lato family)

### No Build Tools
- Pure static site - no Node.js, npm, webpack, or build process
- Direct file editing and deployment
- No transpilation or bundling required

## Current Site Details

### index.html
**Purpose**: Temporary landing page explaining service outage

**Structure**:
- Fixed header with company branding
- Centered content container with logo
- Bilingual content (German first, then English)
- Contact information for key personnel
- Footer with copyright

**Key Features**:
1. **Email Protection**: JavaScript obfuscation to prevent spam
   ```javascript
   // Emails assembled client-side using data attributes
   data-name="name" + data-domain="domain.com"
   ```

2. **Responsive Design**: Three breakpoints
   - Desktop: > 768px
   - Tablet: 481px - 768px
   - Mobile: ≤ 480px

3. **Smooth Scrolling**: Anchor link from German to English section

### CSS Architecture

**File**: `css/style.css`

**Design System** (CSS Custom Properties):
```css
--akim-bg: #8997B0           /* Page background */
--akim-text: #3D4771         /* Primary text */
--akim-text-dark: #414D5C    /* Secondary text */
--akim-header-text: #566473  /* Header text */
--akim-header-bg: #ffffff    /* Header background */
--akim-border: #c6d0da       /* Border color */
--akim-hover: #5f6f81        /* Hover state */
--akim-white: #ffffff        /* White */
--akim-orange: #D35F00       /* Accent/links */
```

**Typography**:
- Font family: Lato (300, 400, 700, 800 weights)
- Base size: 15px
- Line height: 1.6
- Letter spacing used for headings

**Components**:
- `.header-bar`: Fixed top navigation
- `.logo-container`: Centered logo with shadow
- `.message-box`: White content card with shadow
- `.contact-section`: Structured contact information
- `.footer-bar`: Copyright footer

## Development Workflows

### Making Changes

1. **Read Before Editing**: Always read files before making changes
2. **Preserve Structure**: Maintain existing HTML structure and class names
3. **Test Responsiveness**: Check all three breakpoints
4. **Bilingual Updates**: Update both German and English sections
5. **Email Protection**: Maintain obfuscation pattern for new emails

### Adding Content

**New Contact Person**:
```html
<div class="contact-item">
    <h2>Rolle:</h2>
    <p>Name</p>
    <p>E-Mail: <a href="#" class="email-link"
                   data-name="username"
                   data-domain="greenmail.ch"></a></p>
    <p>Telefon: <a href="tel:+41554518500"
                    class="phone-link">+41 55 451 85 00</a></p>
</div>
```

**New Section**:
- Add to both German and English parts
- Use existing CSS classes
- Maintain consistent spacing

### Styling Guidelines

1. **Colors**: Use CSS custom properties, never hardcode colors
2. **Spacing**: Use consistent margins (20px, 25px, 30px, 40px)
3. **Typography**: Use existing font weights (300, 400, 600, 700, 800)
4. **Shadows**: Follow pattern: `7px 7px 15px -5px rgba(51, 51, 51, 0.5)`
5. **Transitions**: `transition: color 0.3s ease` for hover effects

### Responsive Design Rules

**Tablet (max-width: 768px)**:
- Reduce header height: 60px → 50px
- Scale down font sizes by ~0.8x
- Adjust padding: 100px → 80px top

**Mobile (max-width: 480px)**:
- Further reduce header: 50px → 45px
- Minimum viable font sizes (0.9em - 0.95em)
- Tighter padding: 25px → 20px

## Git Workflow

### Branch Strategy

**Current Development Branch**: `claude/claude-md-miykmtpm49i1zmwv-01RzqsrCLDYGY1hvqxeNsLnd`

**Branch Naming Convention**:
- Feature branches: `claude/descriptive-name-session-id`
- Must start with `claude/` prefix
- Must end with matching session ID
- Push failures (403) indicate incorrect branch naming

### Commit Guidelines

**Message Format**:
```
Brief imperative description

- Detailed change 1
- Detailed change 2
```

**Recent Commits** (for context):
- `b9b9644`: Sprach-Link nach oben verschoben (Language link moved up)
- `c325758`: Link zur englischen Version hinzugefügt (Link to English added)
- `e338f2d`: Englische Version und Formatierung verbessert (English improved)
- `6e65ae1`: Telefonnummern hinzugefügt (Phone numbers added)
- `34d47c5`: Temporäre Landing-Page für AKIM (Temporary landing page)

**Best Practices**:
- Clear, concise commit messages
- Logical, atomic commits
- Test before committing
- Update both languages in single commit

### Push Protocol

```bash
# Always use -u flag for branch tracking
git push -u origin <branch-name>

# Retry logic for network failures (up to 4 times)
# Exponential backoff: 2s, 4s, 8s, 16s
```

### Fetch/Pull

```bash
# Prefer specific branches
git fetch origin <branch-name>
git pull origin <branch-name>

# Same retry logic applies for network issues
```

## Deployment & Vercel Integration

### Current Setup

**Vercel Configuration**:
- Connected to GitHub repository `mtn-mover/akim-website`
- Auto-deploy from `master` branch
- Production URL: Configured in Vercel dashboard
- `.vercel` directory in `.gitignore`

### Deployment Workflow

**Current Process (with Branch Protection)**:
1. AI pushes changes to `claude/*` branch ✅
2. Create Pull Request on GitHub (manually or via link)
3. Merge PR to `master` branch
4. Vercel automatically deploys from `master` ✅

**Push to master is protected** - only branches starting with `claude/` can be pushed directly by AI assistants.

### Enabling Direct Deployment (Optional)

If you want AI to push directly to `master` for instant Vercel deployment:

**GitHub Settings → Branches → Branch Protection Rules**:

1. Navigate to: `https://github.com/mtn-mover/akim-website/settings/branches`

2. For `master` branch protection rule, adjust:
   - ☐ Uncheck "Require a pull request before merging" (for direct pushes)
   - OR add AI service account to bypass list
   - OR configure GitHub Actions for auto-merge

3. Alternative: Keep protection but add automation:
   ```yaml
   # .github/workflows/auto-deploy.yml
   name: Auto Deploy
   on:
     push:
       branches: ['claude/**']
   jobs:
     merge-to-master:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Merge to master
           run: |
             git config user.name "GitHub Actions"
             git config user.email "actions@github.com"
             git fetch origin master
             git checkout master
             git merge --ff-only ${{ github.ref }}
             git push origin master
   ```

### Manual Deployment (if needed)

If you have Vercel CLI installed locally:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Deploy to preview
vercel
```

### Vercel Configuration File

Create `vercel.json` for custom configuration (optional):
```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.html",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

### Deployment Checklist

Before merging to `master`:
- [ ] All changes committed and pushed to feature branch
- [ ] Changes reviewed and tested
- [ ] Both German and English sections updated
- [ ] No console errors
- [ ] Responsive design verified
- [ ] Email obfuscation working
- [ ] Links functional

After merge:
- [ ] Verify Vercel deployment started
- [ ] Check deployment logs in Vercel dashboard
- [ ] Test live site
- [ ] Verify DNS/domain configuration

## Key Conventions

### HTML
- **Semantic tags**: Use `<header>`, `<main>`, `<footer>`, `<section>`
- **Accessibility**: Include `alt` attributes, proper heading hierarchy
- **Meta tags**: Complete SEO meta information in `<head>`
- **Language**: `lang="de"` on `<html>` tag
- **Comments**: Mark language sections clearly

### CSS
- **Methodology**: Component-based, no BEM or other strict methodology
- **Variables**: Always use CSS custom properties for colors
- **Mobile-first**: Media queries use `max-width` (desktop → mobile)
- **Units**:
  - `px` for fixed measurements
  - `em` for relative sizing
  - `%` for responsive widths
- **Vendor prefixes**: Not needed (modern browsers only)

### JavaScript
- **ES6+**: Use modern syntax (const/let, arrow functions, template literals)
- **DOM**: `querySelector`, `querySelectorAll` for selection
- **Events**: `addEventListener('DOMContentLoaded', ...)`
- **No jQuery**: Pure vanilla JavaScript only
- **Comments**: German acceptable for inline comments

### File Organization
- **Assets**: Organized by type (images, icons, fonts)
- **Names**: Descriptive, consistent casing
- **Archive**: `alte_seite/` - DO NOT modify, reference only
- **Paths**: Relative paths from root

## Working with the Archive (`alte_seite/`)

### Purpose
Complete previous AKIM website preserved for:
- Reference for future redesign
- Asset recovery (images, PDFs, content)
- Understanding previous site structure

### Structure
- **German pages**: Root level `AKIM-*.html`
- **English pages**: `eng-Seiten/AKIM-*.html`
- **Resources**: Organized in subdirectories
- **Navigation**: Complex dropdown menu system

### Guidelines
- **Read-only**: Do not modify archived files
- **Reference**: Extract content/assets as needed
- **Learn**: Study design patterns and structure
- **Migrate**: Copy relevant content to new site when appropriate

## Common Tasks

### Update Contact Information
1. Locate contact section in `index.html` (line 57-83 German, 108-134 English)
2. Update in both language sections
3. Maintain email obfuscation pattern
4. Test email assembly in browser

### Change Colors
1. Edit CSS variables in `css/style.css` (lines 11-21)
2. Changes propagate automatically
3. Check contrast for accessibility

### Add New Page Section
1. Add after existing sections in `index.html`
2. Follow existing HTML structure
3. Use existing CSS classes or extend stylesheet
4. Include in both German and English sections
5. Ensure responsive behavior

### Restore Full Website
1. Reference `alte_seite/` for content structure
2. Modernize HTML/CSS based on current style
3. Maintain bilingual structure
4. Update content and contact information
5. Test thoroughly across devices

## Security Considerations

### Email Protection
Current implementation uses JavaScript obfuscation:
- Emails split into `data-name` and `data-domain` attributes
- Assembled client-side with `String.fromCharCode(64)` for @
- Prevents simple scraping

**Enhancement Opportunities**:
- Add honeypot fields
- Implement CAPTCHA for contact forms
- Consider email contact form instead

### Content Security
- No user input currently
- No forms or data submission
- Static content only - minimal attack surface

## Testing Checklist

Before committing changes:

- [ ] HTML validates (W3C validator)
- [ ] CSS has no syntax errors
- [ ] JavaScript executes without console errors
- [ ] Desktop view (> 768px) renders correctly
- [ ] Tablet view (481-768px) renders correctly
- [ ] Mobile view (≤ 480px) renders correctly
- [ ] All links work (including anchors)
- [ ] Email obfuscation functions
- [ ] Phone links work on mobile
- [ ] Images load correctly
- [ ] Typography is readable at all sizes
- [ ] Colors follow brand guidelines
- [ ] Both German and English sections updated
- [ ] Browser testing (Chrome, Firefox, Safari, Edge)

## Browser Support

**Target Browsers**:
- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile Safari (iOS 12+)
- Chrome Mobile (last 2 versions)

**Features Used**:
- CSS Grid & Flexbox
- CSS Custom Properties
- ES6 JavaScript
- Smooth scroll behavior

## Performance

**Current Metrics**:
- **HTML**: ~8KB (index.html)
- **CSS**: ~3KB (style.css)
- **JavaScript**: Inline, ~500 bytes
- **Images**:
  - Logo: 250KB (could be optimized)
  - Favicon: minimal
- **Fonts**: Google Fonts (external)

**Optimization Opportunities**:
1. Compress/optimize Akim_Signet_2014_gross.jpg
2. Consider WebP format for images
3. Implement lazy loading if page grows
4. Self-host fonts for faster loading

## Deployment

### Current Setup
- Static file hosting
- No build/deploy pipeline
- Direct file upload to server

### Deployment Process
1. Test locally (open index.html in browser)
2. Commit changes to git
3. Push to branch
4. Deploy files to hosting provider
5. Verify on live site

### Files to Deploy
```
index.html
css/style.css
assets/images/*
assets/icons/*
```

**Do NOT deploy**: `.git/`, `alte_seite/`, `CLAUDE.md`, `.gitignore`

## Future Considerations

### Short Term
- Restore full website functionality
- Migrate content from `alte_seite/`
- Add contact form
- Optimize images

### Long Term
- Consider static site generator (Hugo, Jekyll)
- Implement CDN for assets
- Add analytics
- Enhance SEO
- Multilingual routing
- Product catalog system

## Company Context

**AKIM AG** specializes in:
- Cycloidal gearboxes (Zykloid Getriebe)
- Precision gear systems (Präzisionsgetriebe)
- Servo gearboxes (Servogetriebe)
- Play-free gearboxes (Spielfreie Getriebe)
- Swiss Made quality

**Key Personnel**:
- Thomas Kaufmann - Management (Geschäftsführung)
- Stefano Torricini - Sales (Verkauf)
- Christoph Stocker - Production Management (Produktionsleitung)

**Contact**:
- Main: +41 55 451 85 00
- Location: Switzerland (domain: akim.ch)

## AI Assistant Guidelines

When working with this codebase:

1. **Always read files before editing** - Never assume structure
2. **Maintain bilingual content** - German and English must match
3. **Preserve email obfuscation** - Don't expose plain email addresses
4. **Follow existing patterns** - Don't introduce new methodologies
5. **Test responsively** - Check all breakpoints
6. **Keep it simple** - No over-engineering, this is a static site
7. **Respect the archive** - `alte_seite/` is read-only
8. **Use CSS variables** - Never hardcode colors
9. **Commit atomically** - One logical change per commit
10. **Document changes** - Clear commit messages in German or English

## Questions & Troubleshooting

### "Where should I add X?"
- New content: Add to `index.html` in appropriate section
- New styles: Add to `css/style.css` following existing patterns
- New images: Place in `assets/images/`

### "Should I use a framework?"
- No - this is intentionally a simple static site
- Vanilla HTML/CSS/JS only

### "How do I test locally?"
- Open `index.html` directly in a browser
- Use Live Server extension in VS Code for hot reload
- No build process needed

### "Can I modify alte_seite/?"
- No - treat as read-only archive
- Extract content/assets to current site instead

### "What about SEO?"
- Meta tags already in place
- Ensure proper heading hierarchy
- Add alt text to images
- Maintain semantic HTML

## Resources

- **MDN Web Docs**: https://developer.mozilla.org/
- **W3C HTML Validator**: https://validator.w3.org/
- **CSS Validation**: https://jigsaw.w3.org/css-validator/
- **Google Fonts**: https://fonts.google.com/specimen/Lato

---

**Last Updated**: 2025-12-09
**Version**: 1.0
**Maintainer**: AKIM Development Team

This document should be updated whenever significant changes are made to the codebase structure, workflows, or conventions.
