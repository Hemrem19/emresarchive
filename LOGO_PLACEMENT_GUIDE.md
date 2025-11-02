# Logo Placement Guide

This guide explains how to add the citavErs logos to the project.

## Required Logo Files

Place the following logo files in the `assets/logos/` directory:

### 1. Logo Mark (Icon Only)
- **File**: `logo-mark.png` or `logo-mark.svg`
- **Size**: At least 512x512 pixels (PNG) or scalable (SVG)
- **Description**: The stylized "C" with upward arrow and book icon (without text)
- **Use**: Appears in sidebars, mobile menu, small branding areas

### 2. Full Logo (Mark + Text)
- **File**: `logo-full.png` or `logo-full.svg`
- **Size**: At least 1024x512 pixels (PNG) or scalable (SVG)
- **Description**: Complete "citaVErs" logo with graphic mark on left and text on right
- **Use**: Header branding, documentation, marketing materials

### 3. Favicon Files

#### Favicon 32x32
- **File**: `favicon-32x32.png`
- **Size**: Exactly 32x32 pixels
- **Format**: PNG
- **Use**: Browser tab icon

#### Favicon 16x16
- **File**: `favicon-16x16.png`
- **Size**: Exactly 16x16 pixels
- **Format**: PNG
- **Use**: Small browser icon

#### Apple Touch Icon
- **File**: `apple-touch-icon.png`
- **Size**: Exactly 180x180 pixels
- **Format**: PNG
- **Use**: iOS home screen icon

### 4. PWA App Icons

#### Icon 192x192
- **File**: `icon-192.png`
- **Size**: Exactly 192x192 pixels
- **Format**: PNG
- **Use**: Progressive Web App icon (medium size)

#### Icon 512x512
- **File**: `icon-512.png`
- **Size**: Exactly 512x512 pixels
- **Format**: PNG
- **Use**: Progressive Web App icon (large size)

## Logo Specifications

Based on the provided logos:

### Colors
- **Primary**: Dark teal/blue-green (#137fec or similar)
- **Grey Elements**: Light grey with darker outline for bookmark
- **Background**: Transparent (for PNG) or white

### Typography
- **Text**: "citaVErs" (mixed case: cita + V + Ers)
- **Font**: Modern sans-serif (matches Manrope or similar)

### Graphic Elements
1. **Stylized "C"**: Large curved shape, 3D appearance with gradient
2. **Upward Arrow**: Points diagonally up-right from top-right of "C"
3. **Book/Bookmark**: Light grey shape within the "C" opening

## File Format Recommendations

### For Scalable Logos (Preferred)
- **Format**: SVG
- **Benefits**: Scales perfectly at any size, smaller file size
- **Use**: `logo-mark.svg` and `logo-full.svg`

### For Fixed-Size Icons
- **Format**: PNG
- **Benefits**: Better compatibility, supports transparency
- **Use**: All favicon and app icon files

## Logo Extraction Steps

If you have the logo images provided:

1. **Extract Logo Mark** (Icon Only):
   - Crop just the graphic mark (C + arrow + book)
   - Remove the text "citaVErs"
   - Save as `logo-mark.png` or `logo-mark.svg`
   - Ensure square aspect ratio

2. **Extract Full Logo**:
   - Keep the entire logo (mark + text)
   - Save as `logo-full.png` or `logo-full.svg`
   - Maintain original proportions

3. **Create Favicons**:
   - Use the logo mark (icon only)
   - Resize to required sizes (32x32, 16x16, 180x180)
   - Export as PNG files

4. **Create App Icons**:
   - Use the logo mark (icon only)
   - Resize to 192x192 and 512x512
   - Export as PNG files
   - Consider adding a subtle background color for better visibility

## Image Optimization

Before adding files:

1. **Compress PNG files** using tools like:
   - TinyPNG (https://tinypng.com/)
   - ImageOptim
   - Squoosh (https://squoosh.app/)

2. **Optimize SVG files** using:
   - SVGOMG (https://jakearchibald.github.io/svgomg/)
   - SVGO

3. **Target file sizes**:
   - Favicons: < 5KB each
   - Logo mark: < 50KB
   - Logo full: < 100KB
   - App icons: < 50KB each

## Current Implementation

The HTML has been updated to reference these logo files:

- **Favicon links**: In `<head>` section of `index.html`
- **Sidebar logos**: Both mobile and desktop sidebars use `logo-mark.png`
- **Fallback**: SVG placeholder logos will show if image files fail to load
- **Web Manifest**: PWA manifest configured in `assets/logos/site.webmanifest`

## Testing

After adding logo files:

1. **Test Favicon**: Check browser tab shows favicon
2. **Test Sidebar**: Verify logo appears in desktop and mobile sidebars
3. **Test PWA**: Install as app and verify home screen icon
4. **Test Dark Mode**: Ensure logos are visible in both light and dark themes
5. **Test Responsive**: Check logos scale properly on mobile devices

## Next Steps

1. ✅ Logo infrastructure created
2. ✅ HTML updated with logo references
3. ⏳ **Place logo image files in `assets/logos/` directory**
4. ⏳ **Test logo display in browser**
5. ⏳ **Optimize logo files for web**

---

**Note**: Currently, the app will use SVG placeholder logos until the actual logo image files are placed in `assets/logos/`. The placeholders will automatically hide when the real logos load successfully.

