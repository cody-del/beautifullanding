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
photos = json.loads((ROOT / 'content/installation-photos.json').read_text())['photos']
slides = ''.join(f'<button class="shade-carousel-slide{" is-active" if i == 0 else ""}" type="button" aria-label="Photo {i+1} of {len(photos)}"><img class="installation-photo" src="assets/installations/{p["name"]}-{p["width"]}.webp" srcset="assets/installations/{p["name"]}-640.webp 640w, assets/installations/{p["name"]}-{p["width"]}.webp {p["width"]}w" sizes="(max-width:700px) 84vw, (max-width:1228px) 70vw, 860px" alt="{escape(p["alt"])}" loading="lazy" decoding="async" width="{p["width"]}" height="{p["height"]}"></button>' for i, p in enumerate(photos))
fields = [('fullName', 'Full name', 'text', 'name', 'Jane Smith'), ('phone', 'Phone number', 'tel', 'tel', '(260) 555-0123'), ('email', 'Email address', 'email', 'email', 'jane@example.com')]
inputs = ''.join(f'<div class="hardwood-field{" hardwood-field-full" if name == "fullName" else ""}"><label for="{name}">{label}</label><input id="{name}" name="{name}" type="{kind}" autocomplete="{ac}" placeholder="{placeholder}" maxlength="{254 if kind == "email" else 100}" required aria-describedby="{name}-error"><p id="{name}-error" class="hardwood-field-error" hidden></p></div>' for name, label, kind, ac, placeholder in fields)
html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Custom Window Treatments &amp; Motorized Shades | Beautiful Blinds &amp; Shades</title>
<meta name="description" content="Quality custom window treatments and motorized shades in Fort Wayne. Owner David Fear measures and installs. Manufacturer warranties, local support, and a free consultation.">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#67b2e8">
<link rel="icon" href="assets/mark.png"><link rel="preload" as="image" href="assets/installations/living-room-roller-shades-raised-1440.webp" media="(min-width:701px)"><link rel="preload" as="image" href="assets/installations/arched-window-cellular-shades-960.webp" media="(max-width:700px)"><link rel="preload" as="font" href="assets/manrope-500.ttf" type="font/ttf" crossorigin>
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="reviews.css"><link rel="stylesheet" href="gallery.css"><link rel="stylesheet" href="vendor/leaflet/leaflet.css"><link rel="stylesheet" href="beautiful.css"><link rel="stylesheet" href="owner-video.css">
</head><body class="product-page product-motorized-shades"><a class="skip-link" href="#main-content">Skip to content</a>
<main class="paper-landing" id="main-content">
<section class="paper-hero" aria-labelledby="paper-heading"><header class="paper-header">
<a href="#main-content" aria-label="Beautiful Blinds &amp; Shades — back to top"><img class="paper-logo" src="assets/logo.png" alt="Beautiful Blinds &amp; Shades" width="500" height="235"></a>
<div class="paper-header-actions"><a class="paper-header-phone" href="tel:+12602226467" aria-label="Call Beautiful Blinds and Shades at (260) 222-6467">{PHONE}<span>(260) 222-6467</span></a><a href="#consultation" class="paper-button paper-header-button">Free Quote</a></div></header>
<div class="paper-hero-content"><p class="paper-eyebrow">Fort Wayne &amp; Northeast Indiana</p><h1 id="paper-heading">Motorized Shades &amp;<br class="paper-heading-break"> Custom Window Treatments</h1>
<p class="paper-description">Control light at the touch of a button. Shop custom blinds, shades, and shutters in your own home.</p>
<ul class="paper-benefits"><li>Owner measured and installed</li><li>Budget-friendly options</li><li>Warranties backed by local support</li></ul>
<div class="paper-hero-actions"><a class="paper-button" href="tel:+12602226467">Call (260) 222-6467</a><a class="paper-button paper-button-outline" href="#consultation">Get a Free Quote</a></div>
<div class="paper-ratings"><a class="paper-rating review-badge" href="#reviews" aria-label="Read Beautiful Blinds and Shades customer reviews">{GOOGLE}<span><strong><span class="badge-stars" aria-label="Five-star customer reviews">★★★★★</span></strong><span class="review-badge-caption">Google Reviews</span></span></a><span class="paper-rating-divider" aria-hidden="true"></span><span class="paper-local-proof">Locally owned<br><span>Fort Wayne, Indiana</span></span></div></div></section>

<section id="reviews" class="reviews-section" aria-label="Beautiful Blinds and Shades customer reviews"><div class="reviews-layout">
<a class="reviews-summary" href="#reviews" aria-label="Read our Google customer reviews"><span class="reviews-stars" role="img" aria-label="Five-star customer reviews">★★★★★</span><span class="reviews-google-lockup">{GOOGLE}<span>Google<br>Reviews</span></span></a>
<button class="reviews-arrow reviews-prev" type="button" aria-label="Previous reviews" aria-controls="reviews-track">{LEFT}</button>
<div class="reviews-track" id="reviews-track" tabindex="0" role="region" aria-roledescription="carousel" aria-label="Customer reviews; use the arrow keys or swipe to browse">{cards}</div>
<button class="reviews-arrow reviews-next" type="button" aria-label="Next reviews" aria-controls="reviews-track">{RIGHT}</button></div><p class="reviews-sr-only" id="reviews-position" aria-live="polite" aria-atomic="true"></p></section>
<dialog id="review-dialog" class="review-dialog" aria-labelledby="review-dialog-name"><div class="review-dialog-header"><div><span class="reviews-stars" role="img" aria-label="5 out of 5 stars">★★★★★</span><p class="reviews-source">Google review</p></div><button class="review-dialog-close" type="button" aria-label="Close review">×</button></div><h2 id="review-dialog-name"></h2><div id="review-dialog-text"></div></dialog>

<section class="hardwood-section hardwood-made motorized-section" id="motorized-shades"><div class="hardwood-container hardwood-made-grid motorized-grid">
<div class="hardwood-made-copy"><p class="hardwood-eyebrow">Motorized shades</p><h2>Your shades.<br>At the touch of a button.</h2><p class="hardwood-body">Control light and privacy with a remote. Add app control, schedules, or voice commands with a compatible system.</p><a class="paper-button" href="#consultation">Get a Free Quote</a></div>
<figure class="hardwood-workshop"><img src="assets/installations/living-room-roller-shades-raised-1440.webp" srcset="assets/installations/living-room-roller-shades-raised-640.webp 640w, assets/installations/living-room-roller-shades-raised-1440.webp 1440w" sizes="(max-width:700px) calc(100vw - 44px), 50vw" alt="Custom roller shades raised above living and dining room windows" loading="lazy" decoding="async" width="1440" height="1080"><figcaption>Effortless light and privacy</figcaption></figure>
</div></section>

<section class="hardwood-section hardwood-made owner-intro" aria-labelledby="owner-heading"><div class="hardwood-container hardwood-made-grid owner-intro-grid">
<figure class="owner-video"><div class="owner-video-frame">
<button id="owner-video-play" class="owner-video-play" type="button" aria-label="Play David Fear’s introduction, 1 minute 16 seconds" aria-controls="owner-video-player"><img src="assets/david-fear-video-poster.jpg" alt="David Fear, owner of Beautiful Blinds and Shades" loading="lazy" decoding="async" width="720" height="870"><span class="owner-video-duration" aria-hidden="true">1:16</span><span class="owner-video-play-icon" aria-hidden="true"><svg width="24" height="28" viewBox="0 0 24 28"><path d="M3 2 23 14 3 26Z" fill="currentColor"/></svg></span><span class="owner-video-play-label" aria-hidden="true">Watch David’s introduction</span></button>
<video id="owner-video-player" controls playsinline preload="none" poster="assets/david-fear-video-poster.jpg" tabindex="0" aria-label="David Fear’s introduction" hidden data-source-mobile="https://embed-ssl.wistia.com/deliveries/7272cced3a97ce35bb1327f8d0a0bd6df557002b.bin" data-source-desktop="https://embed-ssl.wistia.com/deliveries/91b1425c4a95b0fa8d2b1747b88f1492b77f3a39.bin"><track kind="captions" src="assets/david-fear-en.vtt" srclang="en" label="English">Your browser does not support embedded video.</video>
<noscript><a class="owner-video-fallback" href="https://embed-ssl.wistia.com/deliveries/91b1425c4a95b0fa8d2b1747b88f1492b77f3a39.bin">Watch David’s introduction</a></noscript></div><figcaption><strong>David Fear</strong><span>Owner, Beautiful Blinds &amp; Shades</span></figcaption><p id="owner-video-error" class="owner-video-error" role="status" hidden>Having trouble playing? <a href="https://embed-ssl.wistia.com/deliveries/91b1425c4a95b0fa8d2b1747b88f1492b77f3a39.bin" target="_blank" rel="noopener">Open David’s video.</a></p></figure>
<div class="hardwood-made-copy"><p class="hardwood-eyebrow">A showroom on wheels</p><h2 id="owner-heading">Don’t pay<br>showroom prices.</h2><p class="hardwood-body">David brings samples, helps you choose, measures, and installs your treatments himself. Everything stays in-house. No subcontractors.</p><a class="paper-button" href="#consultation">Get a Free Quote</a></div></div></section>

<section class="hardwood-section hardwood-value"><div class="hardwood-container"><h2>Quality products. Local expertise.</h2><div class="hardwood-value-grid">
<article class="hardwood-value-card"><h3>Quality, made to fit.</h3><p>Custom blinds, shades, and shutters for your style and budget.</p></article>
<article class="hardwood-value-card"><h3>Expert installation.</h3><p>Measured, installed, and demonstrated by owner David Fear.</p></article>
<article class="hardwood-value-card"><h3>Peace of mind.</h3><p>Manufacturer warranties backed by David’s local support.</p></article>
</div></div></section>



<section class="hardwood-section hardwood-consultation"><div class="hardwood-container hardwood-consultation-grid"><div><h2>Book your free<br>in-home consultation.</h2><p class="hardwood-body">We bring the samples. You choose your treatments. Get your quote at home.</p><ul class="hardwood-consultation-benefits"><li>Owner measured and installed</li><li>Options for your style and budget</li><li>Warranties backed by local support</li></ul><a class="paper-button" href="tel:+12602226467">Call (260) 222-6467</a><p class="consultation-hours">Monday–Friday · 9 AM–5 PM</p></div>
<div id="consultation" class="consultation-anchor"><form id="consultation-form" name="beautiful-blinds-quote" class="hardwood-form" aria-label="Free window treatment quote" novalidate><div class="hardwood-form-heading"><h3>Request a Free Quote</h3><p>David will contact you to arrange your free in-home visit.</p></div><div class="hardwood-form-fields">{inputs}</div><p id="form-status" class="form-status" role="status" tabindex="-1" hidden></p><button class="paper-button hardwood-submit" type="submit">Get My Free Quote</button><p class="hardwood-form-note">Prefer to speak with David? <a href="tel:+12602226467">Call (260) 222-6467</a>.</p><div class="hardwood-form-reassurance"><span>✓ Free in-home consultation</span><span>✓ No-pressure guidance</span></div><a class="hardwood-google-badge" href="#reviews">{GOOGLE}<span class="badge-stars" aria-label="Five-star customer reviews">★★★★★</span><span>Google Reviews</span></a><noscript><p>You can also <a href="tel:+12602226467">call (260) 222-6467</a> to request your consultation.</p></noscript></form></div></div></section>

<section id="service-area" class="hardwood-section hardwood-service-area"><div class="hardwood-container hardwood-service-area-grid">
<div class="hardwood-service-area-copy"><p class="hardwood-eyebrow">Local service</p><h2>Serving Fort Wayne<br>&amp; Northeast Indiana.</h2><p class="hardwood-body">Free in-home consultations throughout our service area, including Hicksville, Ohio.</p>
<ul class="service-featured-cities"><li>Fort Wayne</li><li>Huntertown</li><li>Leo-Cedarville</li><li>New Haven</li><li>Auburn</li><li>Columbia City</li></ul>
<details class="service-city-details"><summary>View all 17 service communities</summary><ul class="service-city-list">{cities}</ul></details>
<a class="paper-button service-area-cta" href="#consultation">Get a Free Quote</a></div>
<div class="beautiful-map-column"><div class="beautiful-map-frame"><div id="coverage-map" class="beautiful-service-map" role="region" aria-label="Interactive map with a blue outer outline around Beautiful Blinds and Shades’ 17 service communities"></div><button class="map-reset" type="button" hidden>Show full area</button><p id="map-fallback" class="map-fallback" hidden>We serve Fort Wayne and the 17 communities listed here. <a href="tel:+12602226467">Call (260) 222-6467</a> to confirm service at your address.</p><noscript><p class="map-fallback">Serving the 17 communities listed here. Call (260) 222-6467 to confirm your address.</p></noscript></div><p class="beautiful-map-caption"><span class="map-legend-swatch" aria-hidden="true"></span>Our service area<span>Approximate coverage. Contact us to confirm your address.</span></p></div>
</div></section>

<section id="gallery" class="hardwood-section hardwood-gallery shade-gallery-section" aria-labelledby="gallery-heading"><div class="hardwood-container"><div class="hardwood-gallery-heading"><h2 id="gallery-heading">Find your style.</h2></div>
<div class="shade-carousel" data-shade-carousel role="region" aria-roledescription="carousel" aria-label="Beautiful Blinds and Shades installation photos"><button class="shade-carousel-arrow shade-carousel-prev" type="button" aria-label="Previous gallery photo"><span aria-hidden="true">‹</span></button><div class="shade-carousel-track">{slides}</div><button class="shade-carousel-arrow shade-carousel-next" type="button" aria-label="Next gallery photo"><span aria-hidden="true">›</span></button><div class="shade-carousel-dots" aria-label="Choose a gallery photo"></div><p class="shade-carousel-status" aria-live="polite" aria-atomic="true">Photo 1 of {len(photos)}</p></div>
<a class="paper-button" href="#consultation">Get a Free Quote</a></div></section>


</main><footer class="footer"><div><strong>Beautiful Blinds &amp; Shades</strong><br>Fort Wayne &amp; Northeast Indiana</div><div class="footer-links"><a href="tel:+12602226467">(260) 222-6467</a></div><span>© 2026 Beautiful Blinds &amp; Shades</span></footer>
<nav class="mobile-conversion-bar" aria-label="Quick contact"><a class="mobile-action mobile-action-call" href="tel:+12602226467" aria-label="Call Beautiful Blinds and Shades at (260) 222-6467">{PHONE}<span>Call</span></a><a class="mobile-action mobile-action-quote" href="#consultation">Free Quote <span aria-hidden="true">→</span></a></nav>
<script src="reviews.js" defer></script><script src="gallery.js" defer></script><script src="form.js" defer></script><script src="owner-video.js" defer></script><script src="vendor/leaflet/leaflet.js" defer></script><script src="service-area.js" defer></script></body></html>'''
(OUT / 'index.html').write_text(html)
print(f'Built page with {len(reviews)} sourced reviews, {len(photos)} client installation photos, and one outline around all {len(places["places"])} service communities.')
