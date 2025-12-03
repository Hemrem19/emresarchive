# citavers Style Guide

## Design Philosophy

citavers uses a **"Deep Space" glassmorphism aesthetic** inspired by modern SaaS applications (Linear, Raycast). The design prioritizes:

- **Clarity & Focus**: Clean interfaces that reduce visual clutter
- **Depth & Hierarchy**: Layered glass panels create visual separation
- **Professional Polish**: High-end productivity tool feel
- **Dark Mode First**: Deep blue-black backgrounds with translucent overlays

---

## Color Palette

### Primary Colors

```css
Primary Blue:     #3b82f6  (rgb(59, 130, 246))
Primary Dark:     #2563eb  (rgb(37, 99, 235))
```

### Background Colors

```css
Dark Background:  #0B0F19  (Deep space blue-black)
Card Dark:        #111827  (Slightly lighter for cards)
Sidebar Dark:     #0f172a  (Translucent sidebar)
```

### Status Colors

```css
Reading:    Blue   (#3b82f6 / bg-blue-500)
To Read:    Yellow (#eab308 / bg-yellow-500)
Finished:   Green  (#22c55e / bg-green-500)
Archived:   Slate  (#64748b / bg-slate-500)
```

### Text Colors

```css
Primary Text:     White        (text-white)
Secondary Text:   Slate-300    (text-slate-300)
Tertiary Text:    Slate-400    (text-slate-400)
Muted Text:       Slate-500    (text-slate-500)
```

---

## Typography

### Font Family

**Manrope** - Modern, geometric sans-serif
- Weights: 300, 400, 500, 600, 700, 800
- Applied via `font-display` or `font-sans` class

### Type Scale

```css
Display:     text-2xl, text-3xl, text-4xl  (Headings)
Body Large:  text-lg                        (Important text)
Body:        text-base, text-sm             (Default text)
Small:       text-xs                       (Labels, metadata)
Tiny:        text-[11px]                   (Uppercase labels)
```

### Label Styling

Labels use uppercase with letter spacing:

```html
<label class="text-xs font-semibold uppercase tracking-wide text-slate-400">
    Field Name
</label>
```

---

## Glassmorphism Effects

### Glass Panel

Main container with backdrop blur:

```css
.glass-panel {
    background: rgba(11, 15, 25, 0.7);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
```

**Usage**: Headers, main content containers

### Glass Sidebar

Sidebar with stronger blur:

```css
.glass-sidebar {
    background: rgba(11, 15, 25, 0.85);
    backdrop-filter: blur(20px);
    border-right: 1px solid rgba(255, 255, 255, 0.05);
}
```

### Glass Card

Content cards with gradient:

```css
.glass-card {
    background: linear-gradient(180deg, 
        rgba(30, 41, 59, 0.4) 0%, 
        rgba(15, 23, 42, 0.4) 100%);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.05);
}
```

**Usage**: Feature cards, landing page sections

### Paper Card

Interactive paper list items:

```css
.paper-card {
    background: linear-gradient(180deg, 
        rgba(30, 41, 59, 0.3) 0%, 
        rgba(15, 23, 42, 0.3) 100%);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.03);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.paper-card:hover {
    background: linear-gradient(180deg, 
        rgba(30, 41, 59, 0.6) 0%, 
        rgba(15, 23, 42, 0.6) 100%);
    border-color: rgba(59, 130, 246, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
}
```

---

## Background Effects

### Grid Pattern

Subtle technical grid overlay:

```html
<div class="bg-[url('data:image/svg+xml;base64,...')] 
            [mask-image:linear-gradient(to_bottom,white,transparent)]">
</div>
```

### Hero Glow

Radial gradient at top center:

```css
background-image: radial-gradient(
    circle at 50% 0%, 
    rgba(59, 130, 246, 0.08) 0%, 
    transparent 60%
);
```

---

## Component Styles

### Buttons

#### Primary Button

```html
<button class="px-6 py-2.5 bg-primary hover:bg-blue-600 
               text-white text-sm font-semibold rounded-xl 
               shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 
               transition-all active:scale-95 
               border border-blue-400/20">
    Action
</button>
```

#### Secondary Button

```html
<button class="px-4 py-2.5 text-sm font-semibold 
               text-slate-200 border border-white/10 
               rounded-xl bg-white/5 hover:bg-white/10 
               transition-all">
    Action
</button>
```

#### Icon Button

```html
<button class="p-2 rounded-lg text-slate-400 
               hover:text-white hover:bg-white/10 
               transition-colors">
    <span class="material-symbols-outlined">icon</span>
</button>
```

### Input Fields

```html
<input class="w-full h-11 px-4 rounded-xl 
              border border-white/10 
              bg-slate-800/50 text-white 
              placeholder-slate-500 
              focus:border-blue-500 
              focus:ring-blue-500/40 
              focus:bg-slate-800/80 
              transition-all shadow-inner">
```

**Key Features**:
- Height: `h-11` (44px for touch targets)
- Rounded: `rounded-xl`
- Border: `border-white/10` (translucent)
- Background: `bg-slate-800/50` (semi-transparent)
- Focus: Blue ring with increased opacity

### Select Dropdowns

```html
<select class="h-9 bg-slate-800 border border-slate-600 
               rounded-lg focus:ring-blue-500 
               focus:border-blue-500 text-xs text-white px-2">
    <option>Option</option>
</select>
```

### Tags / Pills

#### Filter Pills

```html
<span class="px-3 py-1 rounded-full 
             bg-blue-500/10 border border-blue-500/20 
             text-blue-300 text-xs font-medium 
             flex items-center gap-1">
    <span class="material-symbols-outlined text-[14px]">icon</span>
    Label
    <button class="hover:bg-blue-500/20 rounded-full p-0.5">
        <span class="material-symbols-outlined text-[14px]">close</span>
    </button>
</span>
```

#### Paper Tags

```html
<span class="px-2 py-0.5 rounded text-[11px] font-semibold 
             bg-blue-500/10 text-blue-400 
             border border-blue-500/20 tracking-wide">
    #TAG
</span>
```

### Status Indicators

#### Status Dot

```html
<span class="w-2.5 h-2.5 rounded-full bg-blue-500 
             status-dot-reading"></span>
```

With glow effect:

```css
.status-dot-reading { 
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.6); 
}
```

#### Status Strip (Paper Cards)

```html
<div class="absolute left-0 top-0 bottom-0 w-1 
            bg-blue-500 rounded-l-xl 
            shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
```

### Cards

#### Paper Card Structure

```html
<div class="paper-card rounded-xl p-5 group cursor-pointer 
            relative overflow-hidden">
    <!-- Status strip -->
    <div class="absolute left-0 top-0 bottom-0 w-1 
                bg-blue-500 rounded-l-xl"></div>
    
    <!-- Icon box -->
    <div class="w-12 h-12 rounded-xl 
                bg-gradient-to-br from-slate-800 to-slate-900 
                border border-white/5 flex items-center justify-center">
        <span class="material-symbols-outlined text-[24px]">icon</span>
    </div>
    
    <!-- Content -->
    <h3 class="text-lg font-bold text-slate-100 
               group-hover:text-blue-400 transition-colors">
        Title
    </h3>
</div>
```

### Tabs

```html
<nav class="flex flex-wrap gap-2 px-4 pt-4 
            border-b border-white/5 bg-white/5">
    <button class="tab-btn px-4 py-2 rounded-xl 
                   border border-transparent 
                   text-xs font-semibold tracking-wide 
                   text-slate-400 hover:text-white 
                   hover:border-white/10 transition-all">
        Tab
    </button>
    <!-- Active tab -->
    <button class="tab-btn px-4 py-2 rounded-xl 
                   border border-primary 
                   text-xs font-semibold tracking-wide 
                   text-primary bg-primary/10 
                   shadow-inner shadow-blue-500/30">
        Active Tab
    </button>
</nav>
```

---

## Spacing & Layout

### Container Padding

```css
Mobile:   px-4 sm:px-6 lg:px-8
Desktop:  px-6 lg:px-8
```

### Section Spacing

```css
Between sections:  gap-6, gap-8
Within sections:   space-y-3, space-y-4, space-y-6
```

### Card Padding

```css
Small cards:   p-4, p-5
Medium cards:  p-6
Large cards:   p-8, p-10
```

---

## Shadows

### Card Shadows

```css
Default:  shadow-2xl shadow-black/30
Hover:    shadow-2xl shadow-black/40
Primary:  shadow-lg shadow-blue-500/20
```

### Button Shadows

```css
Primary:  shadow-lg shadow-blue-500/20
Hover:    shadow-lg shadow-blue-500/30
```

---

## Animations & Transitions

### Standard Transition

```css
transition-all duration-300
```

### Hover Lift Effect

```css
transform: translateY(-2px);
transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

### Active Press

```css
active:scale-95
```

### Smooth Color Transitions

```css
transition-colors
```

---

## Icons

### Material Symbols Outlined

All icons use Material Symbols Outlined variant.

### Icon Sizes

```css
Small:   text-[14px], text-[16px]
Medium:  text-[20px], text-[24px]
Large:   text-[32px], text-[48px]
```

### Icon Colors

```css
Default:    text-slate-400
Hover:      text-white, text-blue-400
Active:     text-primary
Status:     text-blue-400, text-yellow-400, etc.
```

---

## Form Elements

### Form Container

```html
<div class="glass-panel border border-white/5 
            rounded-2xl shadow-2xl shadow-black/40 
            p-6 sm:p-8 lg:p-10">
    <!-- Form content -->
</div>
```

### Form Groups

```html
<div class="space-y-6">
    <div>
        <label class="block text-xs font-semibold 
                      uppercase tracking-wide text-slate-400 mb-2">
            Field Label
        </label>
        <input ...>
        <p class="mt-2 text-xs text-slate-500">
            Helper text
        </p>
    </div>
</div>
```

### File Upload Dropzone

```html
<div id="file-upload-dropzone" 
     class="flex justify-center rounded-xl 
            border-2 border-dashed border-white/10 
            bg-slate-800/30 px-6 pt-8 pb-8 
            cursor-pointer hover:border-blue-500/50 
            hover:bg-blue-500/5 transition-all group">
    <div class="space-y-3 text-center">
        <span class="material-symbols-outlined text-5xl 
                     text-slate-600 group-hover:text-blue-400">
            cloud_upload
        </span>
        <!-- Upload text -->
    </div>
</div>
```

---

## Search & Filters

### Search Input (Omnibar Style)

```html
<div class="relative flex-1 max-w-2xl group">
    <div class="absolute inset-y-0 left-0 pl-3 
                flex items-center pointer-events-none">
        <span class="material-symbols-outlined 
                     text-slate-500 group-focus-within:text-blue-400">
            search
        </span>
    </div>
    <input class="w-full h-10 pl-10 pr-10 
                  bg-slate-100 dark:bg-slate-800/40 
                  border border-transparent dark:border-slate-700/50 
                  rounded-xl focus:outline-none 
                  focus:ring-2 focus:ring-blue-500/50 
                  focus:border-blue-500/50 
                  focus:bg-white dark:focus:bg-slate-800/80 
                  text-sm placeholder-slate-500 
                  dark:text-slate-200 transition-all shadow-sm">
    <div class="absolute inset-y-0 right-0 pr-3 
                flex items-center pointer-events-none">
        <kbd class="hidden sm:inline-flex items-center h-5 px-2 
                    rounded border border-slate-300 dark:border-slate-700 
                    bg-slate-200 dark:bg-slate-800/50 
                    text-[10px] text-slate-500 font-sans font-bold">
            ⌘K
        </kbd>
    </div>
</div>
```

### Filter Pills

```html
<div class="flex items-center gap-2">
    <span class="px-3 py-1 rounded-full 
                 bg-blue-500/10 border border-blue-500/20 
                 text-blue-300 text-xs font-medium 
                 flex items-center gap-1">
        <span class="material-symbols-outlined text-[14px]">filter_list</span>
        Status: To Read
        <button class="hover:bg-blue-500/20 rounded-full p-0.5">
            <span class="material-symbols-outlined text-[14px]">close</span>
        </button>
    </span>
</div>
```

---

## Scrollbars

### Custom Scrollbar

```css
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
    background: #475569;
}
```

---

## Responsive Design

### Breakpoints

```css
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
```

### Mobile Considerations

- Touch targets: Minimum 44px height
- Input font size: 16px minimum (prevents iOS zoom)
- Sidebar: Slides in from left on mobile
- Cards: Stack vertically on mobile

---

## Accessibility

### Focus States

All interactive elements have visible focus rings:

```css
focus:ring-2 focus:ring-blue-500/50
focus:border-blue-500/50
```

### Color Contrast

- Text on dark backgrounds: White (#ffffff) on #0B0F19
- Secondary text: Slate-300 (#cbd5e1) minimum
- Interactive elements: Blue-400 (#60a5fa) for hover states

### Keyboard Navigation

- Tab order follows visual hierarchy
- All buttons and links are keyboard accessible
- Modals trap focus

---

## Implementation Notes

### Tailwind Configuration

Custom colors and utilities are defined in `index.html`:

```javascript
tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#3b82f6",
                "primary-dark": "#2563eb",
                "dark-bg": "#0B0F19",
                "card-dark": "#111827",
                "sidebar-dark": "#0f172a",
            },
            fontFamily: {
                "display": ["Manrope", "sans-serif"],
                "sans": ["Manrope", "sans-serif"]
            },
            backgroundImage: {
                'hero-glow': "radial-gradient(...)",
                'grid-pattern': "...",
            }
        },
    },
}
```

### CSS Classes

Custom utility classes are defined in `<style>` tag in `index.html`:

- `.glass-panel`
- `.glass-sidebar`
- `.glass-card`
- `.paper-card`
- `.status-dot-reading`, `.status-dot-toread`, `.status-dot-finished`

### Dark Mode

The app is **dark mode only**. All components are designed for dark backgrounds. The `dark:` prefix in Tailwind classes is used for consistency, but the app always operates in dark mode.

---

## Design Patterns

### Card Hover States

Cards lift slightly on hover with increased opacity:

```css
.paper-card:hover {
    transform: translateY(-2px);
    border-color: rgba(59, 130, 246, 0.3);
    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
}
```

### Hidden Actions

Edit/Delete buttons appear on hover:

```html
<div class="opacity-0 group-hover:opacity-100 
            transition-all transform translate-x-2 
            group-hover:translate-x-0">
    <button>Edit</button>
</div>
```

### Status Color Mapping

- **Reading**: Blue (`bg-blue-500`)
- **To Read**: Yellow (`bg-yellow-500`)
- **Finished**: Green (`bg-green-500`)
- **Archived**: Slate (`bg-slate-500`)

---

## Examples

### Complete Paper Card

```html
<div class="paper-card rounded-xl p-5 group cursor-pointer 
            relative overflow-hidden">
    <!-- Status strip -->
    <div class="absolute left-0 top-0 bottom-0 w-1 
                bg-blue-500 rounded-l-xl"></div>
    
    <div class="flex items-start gap-4 pl-2">
        <!-- Icon -->
        <div class="w-12 h-12 rounded-xl 
                    bg-gradient-to-br from-slate-800 to-slate-900 
                    border border-white/5 flex items-center justify-center">
            <span class="material-symbols-outlined text-[24px]">
                description
            </span>
        </div>
        
        <!-- Content -->
        <div class="flex-1 min-w-0">
            <h3 class="text-lg font-bold text-slate-100 
                       group-hover:text-blue-400 transition-colors">
                Paper Title
            </h3>
            <p class="text-sm text-slate-400 mb-3">
                Author 1, Author 2 - 2024
            </p>
            <!-- Tags, metadata, etc. -->
        </div>
        
        <!-- Actions (hidden until hover) -->
        <div class="opacity-0 group-hover:opacity-100 transition-all">
            <button>Edit</button>
        </div>
    </div>
</div>
```

### Complete Form Section

```html
<div class="glass-panel border border-white/5 rounded-2xl 
            shadow-2xl shadow-black/40 p-8">
    <h2 class="text-2xl font-bold text-white mb-6">
        Section Title
    </h2>
    
    <div class="space-y-6">
        <div>
            <label class="block text-xs font-semibold 
                          uppercase tracking-wide text-slate-400 mb-2">
                Field Label
            </label>
            <input class="w-full h-11 px-4 rounded-xl 
                          border border-white/10 bg-slate-800/50 
                          text-white placeholder-slate-500 
                          focus:border-blue-500 
                          focus:ring-blue-500/40 
                          focus:bg-slate-800/80 transition-all">
        </div>
    </div>
</div>
```

---

## Best Practices

1. **Always use glass panels** for main content containers
2. **Maintain consistent spacing** using Tailwind's spacing scale
3. **Use uppercase labels** with tracking for form fields
4. **Apply hover states** to all interactive elements
5. **Use status colors** consistently across the app
6. **Keep borders translucent** (`border-white/5` or `border-white/10`)
7. **Apply backdrop blur** to glass elements
8. **Use rounded-xl** for cards and inputs
9. **Maintain 44px minimum** touch target sizes
10. **Test in dark mode** - the app is dark-only

---

## Resources

- **Font**: [Manrope on Google Fonts](https://fonts.google.com/specimen/Manrope)
- **Icons**: [Material Symbols Outlined](https://fonts.google.com/icons)
- **Color Reference**: Tailwind CSS Slate palette
- **Design Inspiration**: Linear, Raycast, modern SaaS applications

---

*Last Updated: December 2024*

