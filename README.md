# Beautiful Blinds & Shades landing page

Independent design review for custom window treatments and motorized shades. The page retains the Beacon Blinds / Shutter Factory layout: photographic hero and floating white header, review carousel, image-and-copy sections, benefit cards, outlined service map, center-focused inspiration gallery, and a final consultation card. The brand colors are the client's blue `#67b2e8` and green `#bfdd9f`; headings reuse the existing Beautiful Blinds Manrope fonts.

Run `python3 scripts/build-page.py` from this directory to regenerate the HTML and map assets. Serve `dist/` with `python3 -m http.server 4325 --bind 127.0.0.1 --directory dist`.

The review copy is transcribed from the five client-supplied review screenshots in the existing homepage project. Room images are reused style inspiration from that project, including staged imagery; they are not presented as verified installation photography. Asset origins are documented in `../homepage/research/assets.json` and `../homepage/README.md`.

The service-area outline encloses all 17 communities on the client's current service-area page. Coordinates come from the US Census Bureau's 2025 place gazetteer. `content/service-area-places.json` records both sources. The generator buffers these place centers and computes a single exterior convex hull. This is approximate coverage, not a city/county boundary or an exact address eligibility promise. The map uses locally hosted Leaflet 1.9.4 and live OpenStreetMap tiles with attribution; scrolling the page does not zoom it. A reset control restores the entire outline, including on mobile.

The four-field consultation card validates input locally and truthfully reports that this design preview has not sent the visitor's details. Phone, email, and the official contact-page links work. A client-specific lead endpoint and delivery verification are still required before using this form for campaign traffic. No live test lead has been sent. The existing public embedded form was inspected; it has unrelated example.com policy links, so its configuration was not reused for the native card.

The Sites manifest in this directory belongs to this separate landing-page review. The existing homepage, production website, and Netlify settings are not part of its deployment. Search indexing remains disabled for review.
