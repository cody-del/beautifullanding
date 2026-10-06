#!/usr/bin/env python3
"""Build the independent Beautiful Blinds landing page from verified client content."""
import json
import math
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist'
places = json.loads((ROOT / 'content/service-area-places.json').read_text())
reviews = json.loads((ROOT / 'content/reviews.json').read_text())['reviews']

# Buffer each verified Census place center before taking a single exterior hull.
# The result indicates approximate coverage, not municipal limits or exact eligibility.
points = sorted(set((round(p['lon'] + .047 * math.cos(i * math.pi / 4), 6),
                     round(p['lat'] + .036 * math.sin(i * math.pi / 4), 6))
                    for p in places['places'] for i in range(8)))
def cross(o, a, b):
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
lower, upper = [], []
for p in points:
    while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
        lower.pop()
    lower.append(p)
for p in reversed(points):
    while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
        upper.pop()
    upper.append(p)
ring = lower[:-1] + upper[:-1]
ring.append(ring[0])
geo = {'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties': {
    'name': 'Beautiful Blinds & Shades service area',
    'description': 'Approximate outer outline around the 17 communities listed on the client website.',
    'source': places['area_source'], 'coordinate_source': places['source']},
    'geometry': {'type': 'Polygon', 'coordinates': [ring]}}]}
(OUT / 'assets/map').mkdir(exist_ok=True)
(OUT / 'assets/map/service-area.geojson').write_text(json.dumps(geo, indent=2) + '\n')
(OUT / 'assets/map/places.json').write_text(json.dumps(places['places'], indent=2) + '\n')

GOOGLE = '<svg class="reviews-google-icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>'
PHONE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m7 3 3 5-2 2c1.3 2.9 3.1 4.7 6 6l2-2 5 3c.5 4-3 5-5 4C8 18 3 13 2 7 1 4 3 2 7 3Z"/></svg>'
LEFT = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg>'
RIGHT = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="m10 5 7 7-7 7"/></svg>'
colors = ['#517997', '#689f38', '#546e7a', '#876392', '#398375']
cards = ''.join(f'''<article class="reviews-card" aria-label="Review by {escape(r['name'])}">
<div class="reviews-card-top"><span class="reviews-stars" role="img" aria-label="5 out of 5 stars">★★★★★</span>{GOOGLE}</div>
<p class="reviews-source">Google review</p><p class="reviews-excerpt">{escape(r['text'])}</p>
<button class="reviews-read-more" type="button" aria-haspopup="dialog" aria-controls="review-dialog" aria-label="Read full review by {escape(r['name'])}">Read more</button>
<div class="reviews-author"><span class="reviews-avatar" style="--avatar-color:{colors[i]}" aria-hidden="true">{r['name'][0]}</span><span class="reviews-name">{escape(r['name'])}</span></div></article>''' for i, r in enumerate(reviews))
order = ['Fort Wayne', 'Huntertown', 'Leo-Cedarville', 'New Haven', 'Auburn', 'Columbia City', 'Grabill', 'Woodburn', 'Monroeville', 'Harlan', 'Hoagland', 'Angola', 'Kendallville', 'Bluffton', 'Warsaw', 'Syracuse', 'Hicksville']
cities = ''.join(f'<li>{n}{", OH" if n == "Hicksville" else ""}</li>' for n in order)
photos = [
    ('roller-shades-fort-wayne-indiana.jpg', 'Soft neutral roller shades in a bright living room'),
    ('cellular-shades-fort-wayne-indiana.jpg', 'Cellular shades for a warm, comfortable living room'),
    ('roman-shades-fort-wayne-indiana.jpg', 'Tailored Roman shades with soft fabric folds'),
    ('layered-shades-fort-wayne-indiana.jpg', 'Layered shades with alternating sheer and opaque bands'),
    ('natural-shades-fort-wayne-indiana.jpg', 'Woven natural shades adding texture to a room'),
    ('solar-shades-fort-wayne-indiana.jpg', 'Solar shades filtering bright daylight')]
slides = ''.join(f'<button class="shade-carousel-slide{" is-active" if i == 0 else ""}" type="button" aria-label="Photo {i+1} of {len(photos)}"><img src="assets/{filename}" alt="{alt}" loading="lazy" decoding="async" width="1500" height="1000"></button>' for i, (filename, alt) in enumerate(photos))
fields = [('firstName', 'First name', 'text', 'given-name', 'Jane'), ('lastName', 'Last name', 'text', 'family-name', 'Smith'), ('phone', 'Phone number', 'tel', 'tel', '(260) 555-0123'), ('email', 'Email address', 'email', 'email', 'jane@example.com')]
inputs = ''.join(f'<div class="hardwood-field"><label for="{name}">{label}</label><input id="{name}" name="{name}" type="{kind}" autocomplete="{ac}" placeholder="{placeholder}" maxlength="{254 if kind == "email" else 100}" required aria-describedby="{name}-error"><p id="{name}-error" class="hardwood-field-error" hidden></p></div>' for name, label, kind, ac, placeholder in fields)
html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Custom Window Treatments &amp; Motorized Shades | Beautiful Blinds &amp; Shades</title>
<meta name="description" content="Custom blinds, shades, shutters, and motorized shades for Fort Wayne and Northeast Indiana. Explore samples at home with Beautiful Blinds &amp; Shades. Request a free consultation.">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#67b2e8">
<link rel="icon" href="assets/mark.png"><link rel="preload" as="image" href="assets/hero.jpeg"><link rel="preload" as="font" href="assets/manrope-500.ttf" type="font/ttf" crossorigin>
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="reviews.css"><link rel="stylesheet" href="gallery.css"><link rel="stylesheet" href="vendor/leaflet/leaflet.css"><link rel="stylesheet" href="beautiful.css">
</head><body class="product-page product-motorized-shades"><a class="skip-link" href="#main-content">Skip to content</a>
<main class="paper-landing" id="main-content">
<section class="paper-hero" aria-labelledby="paper-heading"><header class="paper-header">
<a href="https://www.beautifulblindsandshades.com/" aria-label="Beautiful Blinds &amp; Shades home"><img class="paper-logo" src="assets/logo.png" alt="Beautiful Blinds &amp; Shades" width="500" height="235"></a>
<div class="paper-header-actions"><a class="paper-header-phone" href="tel:+12602226467" aria-label="Call Beautiful Blinds and Shades at (260) 222-6467">{PHONE}<span>(260) 222-6467</span></a><a href="#consultation" class="paper-button paper-header-button">Free Consultation</a></div></header>
<div class="paper-hero-content"><h1 id="paper-heading">Custom Window Treatments<br class="paper-heading-break"> for Fort Wayne Homes</h1>
<p class="paper-description">Find the right light, privacy, and style for every room. Explore custom blinds, shades, shutters, and motorized shades with samples brought to your home.</p>
<ul class="paper-benefits"><li>Free in-home consultation</li><li>Made to fit your windows</li><li>Professional installation</li></ul>
<div class="paper-hero-actions"><a class="paper-button" href="tel:+12602226467">Call (260) 222-6467</a><a class="paper-button paper-button-outline" href="#consultation">Get a Free Consultation</a></div>
<div class="paper-ratings"><a class="paper-rating review-badge" href="https://www.google.com/maps?cid=11383874825751228298" target="_blank" rel="noopener" aria-label="Read Beautiful Blinds and Shades customer reviews on Google">{GOOGLE}<span><strong><span class="badge-stars" aria-label="Five-star customer reviews">★★★★★</span></strong><span class="review-badge-caption">Google Reviews</span></span></a><span class="paper-rating-divider" aria-hidden="true"></span><span class="paper-local-proof">Locally owned<br><span>Fort Wayne, Indiana</span></span></div></div></section>

<section id="reviews" class="reviews-section" aria-label="Beautiful Blinds and Shades customer reviews"><div class="reviews-layout">
<a class="reviews-summary" href="https://www.google.com/maps?cid=11383874825751228298" target="_blank" rel="noopener" aria-label="Read our Google customer reviews"><span class="reviews-stars" role="img" aria-label="Five-star customer reviews">★★★★★</span><span class="reviews-google-lockup">{GOOGLE}<span>Google<br>Reviews</span></span></a>
<button class="reviews-arrow reviews-prev" type="button" aria-label="Previous reviews" aria-controls="reviews-track">{LEFT}</button>
<div class="reviews-track" id="reviews-track" tabindex="0" role="region" aria-roledescription="carousel" aria-label="Customer reviews; use the arrow keys or swipe to browse">{cards}</div>
<button class="reviews-arrow reviews-next" type="button" aria-label="Next reviews" aria-controls="reviews-track">{RIGHT}</button></div><p class="reviews-sr-only" id="reviews-position" aria-live="polite" aria-atomic="true"></p></section>
<dialog id="review-dialog" class="review-dialog" aria-labelledby="review-dialog-name"><div class="review-dialog-header"><div><span class="reviews-stars" role="img" aria-label="5 out of 5 stars">★★★★★</span><p class="reviews-source">Google review</p></div><button class="review-dialog-close" type="button" aria-label="Close review">×</button></div><h2 id="review-dialog-name"></h2><div id="review-dialog-text"></div></dialog>

<section class="hardwood-section hardwood-made"><div class="hardwood-container hardwood-made-grid">
<figure class="hardwood-workshop"><img src="assets/shades-natural-v2.jpg" alt="Neutral shades filtering light in a bright living room" loading="lazy" decoding="async" width="1536" height="1024"><figcaption>Light, texture, and privacy for your home</figcaption></figure>
<div class="hardwood-made-copy"><p class="hardwood-eyebrow">Custom window treatments. Personal service.</p><h2>The showroom comes<br>to your living room.</h2><p class="hardwood-body">See fabrics and finishes beside your furniture, in your own light. David Fear brings samples to you and helps you compare styles, privacy options, and controls that suit each room.</p><p class="hardwood-body">From a single window to a whole home, you’ll get practical guidance, professional measurements, and a quote without pressure.</p><a class="paper-button" href="#consultation">Get My Free Consultation</a></div></div></section>

<section class="hardwood-section hardwood-value"><div class="hardwood-container"><h2>Made for the way you live.</h2><div class="hardwood-value-grid">
<article class="hardwood-value-card"><h3>The light you want.</h3><p>Soften bright sun, reduce glare, or bring more privacy to your evenings. Choose the right fabric and light control for each room.</p></article>
<article class="hardwood-value-card"><h3>The style that feels like home.</h3><p>Compare shades, blinds, and shutters in colors and textures that work with your home, from clean roller shades to tailored Roman shades.</p></article>
<article class="hardwood-value-card"><h3>The details, handled.</h3><p>We measure your windows and install your custom treatments. Before we leave, we’ll show you how to use and care for them.</p></article>
</div></div></section>

<section class="hardwood-section hardwood-made motorized-section" id="motorized-shades"><div class="hardwood-container hardwood-made-grid motorized-grid">
<div class="hardwood-made-copy"><p class="hardwood-eyebrow">Motorized shades for everyday ease</p><h2>On your schedule.<br>At the touch of a button.</h2><p class="hardwood-body">Open your shades to morning light and close them for evening privacy. A remote puts control within reach, even for tall windows or a room full of shades.</p><p class="hardwood-body">With a compatible system, you can add app control, schedules, or voice commands. David will help you compare battery-powered and hardwired options and explain what works with your home.</p><a class="paper-button" href="#consultation">Explore Motorized Shades</a></div>
<figure class="hardwood-workshop"><img src="assets/roller-shades-fort-wayne-indiana.jpg" alt="Roller shades in a living room with large windows" loading="lazy" decoding="async" width="1500" height="1000"><figcaption>Simple control for large and hard-to-reach windows</figcaption></figure>
</div></section>

<section id="service-area" class="hardwood-section hardwood-service-area"><div class="hardwood-container hardwood-service-area-grid">
<div class="hardwood-service-area-copy"><p class="hardwood-eyebrow">Your local window treatment specialist</p><h2>Serving Fort Wayne<br>&amp; Northeast Indiana.</h2><p class="hardwood-body">We bring samples, measurements, and professional installation to homes throughout Allen County and the surrounding communities, including Hicksville, Ohio.</p>
<ul class="service-featured-cities"><li>Fort Wayne</li><li>Huntertown</li><li>Leo-Cedarville</li><li>New Haven</li><li>Auburn</li><li>Columbia City</li></ul>
<details class="service-city-details"><summary>View all 17 service communities</summary><ul class="service-city-list">{cities}</ul></details>
<a class="paper-button service-area-cta" href="#consultation">Get a Free Consultation</a></div>
<div class="beautiful-map-column"><div class="beautiful-map-frame"><div id="coverage-map" class="beautiful-service-map" role="region" aria-label="Interactive map with a blue outer outline around Beautiful Blinds and Shades’ 17 service communities"></div><button class="map-reset" type="button" hidden>Show full area</button><p id="map-fallback" class="map-fallback" hidden>We serve Fort Wayne and the 17 communities listed here. <a href="tel:+12602226467">Call (260) 222-6467</a> to confirm service at your address.</p><noscript><p class="map-fallback">Serving the 17 communities listed here. Call (260) 222-6467 to confirm your address.</p></noscript></div><p class="beautiful-map-caption"><span class="map-legend-swatch" aria-hidden="true"></span>Our service area<span>Approximate coverage. Contact us to confirm your address.</span></p></div>
</div></section>

<section id="gallery" class="hardwood-section hardwood-gallery shade-gallery-section" aria-labelledby="gallery-heading"><div class="hardwood-container"><div class="hardwood-gallery-heading"><h2 id="gallery-heading">A beautiful fit for every room.</h2><p class="hardwood-body">Explore shade styles, fabrics, and light control for your home.</p></div>
<div class="shade-carousel" data-shade-carousel role="region" aria-roledescription="carousel" aria-label="Window treatment style inspiration"><button class="shade-carousel-arrow shade-carousel-prev" type="button" aria-label="Previous gallery photo"><span aria-hidden="true">‹</span></button><div class="shade-carousel-track">{slides}</div><button class="shade-carousel-arrow shade-carousel-next" type="button" aria-label="Next gallery photo"><span aria-hidden="true">›</span></button><div class="shade-carousel-dots" aria-label="Choose a gallery photo"></div><p class="shade-carousel-status" aria-live="polite" aria-atomic="true">Photo 1 of {len(photos)}</p></div>
<a class="paper-button" href="#consultation">Find Your Window Treatments</a></div></section>

<section class="hardwood-section hardwood-consultation"><div class="hardwood-container hardwood-consultation-grid"><div><h2>Book your free<br>in-home consultation.</h2><p class="hardwood-body">See samples in your space, get your windows measured, and explore custom and motorized options with David.</p><ul class="hardwood-consultation-benefits"><li>Personalized design guidance</li><li>Professional window measurement</li><li>A quote for your project</li></ul><a class="paper-button" href="tel:+12602226467">Call (260) 222-6467</a><p class="consultation-hours">Monday–Friday · 9 AM–5 PM</p></div>
<div id="consultation" class="consultation-anchor"><form id="consultation-form" class="hardwood-form" aria-label="Free window treatment consultation" novalidate><div class="hardwood-form-heading"><h3>Request a Free Consultation</h3><p>Share your contact details to arrange a visit.</p></div><div class="hardwood-form-fields">{inputs}</div><p id="form-status" class="form-status" role="status" hidden></p><button class="paper-button hardwood-submit" type="submit">Get My Free Consultation</button><p class="hardwood-form-note">Prefer to speak with David? <a href="tel:+12602226467">Call (260) 222-6467</a>.</p><div class="hardwood-form-reassurance"><span>✓ Free in-home consultation</span><span>✓ No-pressure guidance</span></div><a class="hardwood-google-badge" href="https://www.google.com/maps?cid=11383874825751228298" target="_blank" rel="noopener">{GOOGLE}<span class="badge-stars" aria-label="Five-star customer reviews">★★★★★</span><span>Google Reviews</span></a><noscript><p>Please <a href="https://www.beautifulblindsandshades.com/contact">use our contact page</a> or call to request your consultation.</p></noscript></form></div></div></section>
</main><footer class="footer"><div><strong>Beautiful Blinds &amp; Shades</strong><br>Fort Wayne &amp; Northeast Indiana<br><a href="mailto:info@beautifulblindsandshades.com">info@beautifulblindsandshades.com</a></div><div class="footer-links"><a href="https://www.beautifulblindsandshades.com/">Visit Our Website</a><a href="tel:+12602226467">(260) 222-6467</a></div><span>© 2026 Beautiful Blinds &amp; Shades</span></footer>
<script src="reviews.js" defer></script><script src="gallery.js" defer></script><script src="form.js" defer></script><script src="vendor/leaflet/leaflet.js" defer></script><script src="service-area.js" defer></script></body></html>'''
(OUT / 'index.html').write_text(html)
print(f'Built page with {len(reviews)} sourced reviews, {len(photos)} inspiration images, and one outline around all {len(places["places"])} service communities.')
