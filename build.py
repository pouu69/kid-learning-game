#!/usr/bin/env python3
"""Build script: concat + minify JS, rewrite index.html for dist/"""
import re

with open('index.html', 'r') as f:
    html = f.read()

# Remove individual <script src="js/..."></script> lines and <!-- Story System --> comment
html = re.sub(r'\s*<!-- Story System -->', '', html)
html = re.sub(r'\s*<script src="js/[^"]+"></script>', '', html)

# Insert app.min.js before the inline <script> block
html = html.replace(
    '    <script>\n    // ── Inline bootstrap',
    '    <script src="app.min.js"></script>\n    <script>\n    // ── Inline bootstrap'
)

with open('dist/index.html', 'w') as f:
    f.write(html)

print('dist/index.html generated')
