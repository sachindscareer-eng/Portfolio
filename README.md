# Sachin Yadav portfolio

Static site, no build step. All page text and CSS are in `index.html`. Animation code is in `assets/js/app.js`, with GSAP, ScrollTrigger and Lenis in `assets/js/vendor/`.

## Edit text
Open `index.html` and search for `EDIT:`. Each section has a marker.

The Work section uses anonymous summaries, with no company data or screenshots.

## Before going live
1. Replace `YOUR-DOMAIN.com` with your real domain in `index.html`, `robots.txt` and `sitemap.xml`.
2. Turn on GA4: search for `GA4` in `index.html` and follow the note.
3. After launch, submit `sitemap.xml` in Search Console and test the page in the Rich Results Test.

## Change the particle words
The words in the Skills scene are in the `SHAPES` list near the middle of `assets/js/app.js`.

## Update the resume
Replace `assets/Sachin-Yadav-Resume.pdf`, keeping the same file name.

## Preview locally
    python -m http.server 8123
Then open http://127.0.0.1:8123/

## Deploy
Upload the folder to Cloudflare Pages, Netlify or GitHub Pages. No build command needed.
