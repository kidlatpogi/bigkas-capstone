# Design System Inspired by Apple (Bigkas Edition)

## 1. Visual Theme & Atmosphere

The Bigkas interface is a masterclass in controlled drama — vast expanses of deep navy and light mint serve as cinematic backdrops for the AI voice analysis features. The design philosophy is reductive to its core: every pixel exists in service of the voice coach, and the interface itself retreats until it becomes invisible. This is not minimalism as aesthetic preference; it is minimalism as reverence for the student's progress.

The typography anchors everything. San Francisco (SF Pro Display for large sizes, SF Pro Text for body) is the proprietary typeface, engineered with optical sizing. At display sizes (56px), weight 600 with a tight line-height of 1.07 and subtle negative letter-spacing (-0.28px) creates headlines that feel machined rather than typeset — precise, confident, and unapologetically direct. At body sizes (17px), the tracking loosens slightly (-0.374px) and line-height opens to 1.47, creating a reading rhythm that is comfortable for long practice sessions.

The color story is starkly binary and organic. Product sections alternate between **Deep Navy (#0B3954)** backgrounds with white text and **Light Mint (#D3E3BC)** backgrounds with **Slate Charcoal (#3C4952)** text. This creates a cinematic pacing — dark sections feel immersive and premium for AI analysis, light sections feel open and informational. The **Primary chromatic accent is Forest Green (#5A7863)**, reserved exclusively for standard interactive elements, links, and buttons, giving every clickable element unmistakable visibility against the organic palette.

**Key Characteristics:**
- SF Pro Display/Text with optical sizing — letterforms adapt automatically to size context
- Binary light/dark section rhythm: Deep Navy (#0B3954) alternating with Light Mint (#D3E3BC)
- **Primary accent color: Forest Green (#5A7863)** reserved exclusively for interactive elements
- Product-as-hero photography on solid color fields — no gradients, no textures, no distractions
- Extremely tight headline line-heights (1.07-1.14) creating compressed, billboard-like impact
- Full-width section layout with centered content — the viewport IS the canvas
- Pill-shaped CTAs (980px radius) creating soft, approachable action buttons
- Generous whitespace between sections allowing each learning moment to breathe

## 2. Color Palette & Roles

### Primary
- **Forest Green (#5A7863):** **The Primary Brand Color.** Used for all primary CTAs, active states, and successful progress indicators.
- **Deep Navy (#0B3954):** Hero section backgrounds, immersive product showcases. The darkest canvas for the brightest feedback.
- **Light Mint (#D3E3BC):** Alternate section backgrounds, informational areas. Provides a fresh, organic reading surface.
- **Slate Charcoal (#3C4952):** Primary text on light backgrounds, dark button fills.

### Interactive & Accents
- **Vibrant Orange (#F18F01):** High-priority "Record" states, critical alerts, and feedback highlights.
- **Soft Sage (#90AB8B):** Hover states for primary buttons and secondary toggles.
- **Mint-White (#D3E3BC):** Subtle surface backgrounds and card containers.

### Text
- **White (#FFFFFF):** Text on dark backgrounds, button text on Navy/Green CTAs.
- **Slate Charcoal (#3C4952):** Primary body text on light backgrounds.
- **Navy 80% (rgba(11, 57, 84, 0.8)):** Secondary text, nav items on light backgrounds.
- **Navy 48% (rgba(11, 57, 84, 0.48)):** Tertiary text, disabled states, carousel controls.

### Shadows
- **Card Shadow (rgba(11, 57, 84, 0.22) 3px 5px 30px 0px):** Soft, diffused elevation for product cards. Offset and wide blur create a natural, photographic shadow tinted with Deep Navy.

## 3. Typography Rules

### Font Family
- **Display**: `SF Pro Display`, with fallbacks: `SF Pro Icons, Helvetica Neue, Helvetica, Arial, sans-serif`
- **Body**: `SF Pro Text`, with fallbacks: `SF Pro Icons, Helvetica Neue, Helvetica, Arial, sans-serif`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Display Hero | SF Pro Display | 56px | 600 | 1.07 | -0.28px |
| Section Heading | SF Pro Display | 40px | 600 | 1.10 | normal |
| Body | SF Pro Text | 17px | 400 | 1.47 | -0.374px |
| Button | SF Pro Text | 17px | 400 | 2.41 | normal |
| Link | SF Pro Text | 14px | 400 | 1.43 | -0.224px |

## 4. Component Stylings

### Buttons

**Primary Forest Green (CTA)**
- Background: `#5A7863`
- Text: `#FFFFFF`
- Padding: 8px 15px
- Radius: 8px
- Use: Primary call-to-action ("Start Lesson", "Save Score")

**High-Priority Orange (Record)**
- Background: `#F18F01`
- Text: `#FFFFFF`
- Radius: 999px (Full Pill)
- Use: The central Recording trigger

**Pill Link (Learn More)**
- Background: transparent
- Text: `#5A7863`
- Radius: 980px (full pill)
- Border: 1px solid `#5A7863`
- Use: "View Details" and "Explore" links

### Navigation
- Background: `rgba(11, 57, 84, 0.8)` (translucent dark navy) with `backdrop-filter: saturate(180%) blur(20px)`
- Height: 48px
- Text: `#FFFFFF` at 12px, weight 400

### Cards & Containers
- Background: `#D3E3BC` (light) or `#1A4660` (dark)
- Border: none
- Radius: 8px-12px
- Shadow: `rgba(11, 57, 84, 0.22) 3px 5px 30px 0px`

## 5. Layout Principles
- **Cinematic Pacing:** Every interaction occupies significant viewport space.
- **Vertical Rhythm through Color Blocks:** Alternating between Deep Navy and Light Mint background colors to signal a new "scene" in the learning journey.
- **Compression within, expansion between:** Text blocks are tightly set (negative letter-spacing) while the space surrounding them is vast.

## 6. Depth & Elevation
- **Level 0 (Flat):** Standard content sections on solid Navy or Mint backgrounds.
- **Navigation Glass:** The translucent Deep Navy nav bar floats above content.
- **Subtle Lift:** Used for cards containing pronunciation feedback.

## 7. Do's and Don'ts

### Do
- Use **Forest Green (#5A7863)** as the primary driver of interaction.
- Apply negative letter-spacing to all text sizes — Bigkas tracks tight universally.
- Alternate between Deep Navy and Light Mint sections for cinematic rhythm.
- Use the translucent navy glass for sticky navigation.

### Don't
- Don't use pure black; always use **Deep Navy (#0B3954)**.
- Don't use borders on cards; use the color change between Navy and Mint or soft shadows.
- Don't use rounded corners larger than 12px on rectangular cards.
- Don't make the navigation opaque; the glass blur effect is essential.