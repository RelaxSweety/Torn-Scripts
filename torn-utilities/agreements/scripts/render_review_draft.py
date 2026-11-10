#!/usr/bin/env python3
"""Render this review draft as self-contained wrapped HTML and an A4 PDF.

Requires reportlab. No agreement manifest or active document is modified.
"""
from pathlib import Path
import html
import re
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

DRAFT = Path(__file__).resolve().parents[1] / 'drafts' / '1.3-revised-review-draft.md'


def inline(value):
    value = html.escape(value, quote=True)
    value = re.sub(r'\[([^\]]+)\]\((https://[^\s)]+)\)',
                   r'<a href="\2">\1</a>', value)
    return re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', value)


def blocks(text):
    lines = text.splitlines()
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue
        if line.startswith('#'):
            match = re.match(r'^(#{1,3})\s+(.*)$', line)
            if not match:
                raise ValueError('Unsupported heading')
            yield ('heading', len(match[1]), match[2])
            index += 1
        elif line.startswith('|'):
            rows = []
            while index < len(lines) and lines[index].strip().startswith('|'):
                cells = [part.strip() for part in lines[index].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?', cell) for cell in cells):
                    if len(cells) != 2:
                        raise ValueError('Review tables must have two columns')
                    rows.append(cells)
                index += 1
            yield ('table', rows)
        elif line.startswith('- '):
            items = []
            while index < len(lines) and lines[index].strip().startswith('- '):
                item = lines[index].strip()[2:]
                index += 1
                while index < len(lines) and lines[index].startswith('  '):
                    item += ' ' + lines[index].strip()
                    index += 1
                items.append(item)
            yield ('list', items)
        else:
            paragraph = [line]
            index += 1
            while index < len(lines) and lines[index].strip() and not lines[index].lstrip().startswith(('#', '|', '- ')):
                paragraph.append(lines[index].strip())
                index += 1
            yield ('paragraph', ' '.join(paragraph))


def render_html(parts):
    body = []
    for kind, *values in parts:
        if kind == 'heading':
            level, text = values
            body.append(f'<h{level}>{inline(text)}</h{level}>')
        elif kind == 'paragraph':
            body.append('<p>' + inline(values[0]) + '</p>')
        elif kind == 'list':
            body.append('<ul>' + ''.join('<li>' + inline(item) + '</li>' for item in values[0]) + '</ul>')
        else:
            rows = values[0]
            body.append('<table><colgroup><col class="label"><col></colgroup><thead><tr>' +
                        ''.join('<th scope="col">' + inline(cell) + '</th>' for cell in rows[0]) + '</tr></thead><tbody>')
            for row in rows[1:]:
                body.append('<tr><th scope="row">' + inline(row[0]) + '</th><td>' + inline(row[1]) + '</td></tr>')
            body.append('</tbody></table>')
    output = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>TU agreement 1.3 — revised review draft</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#edf1f5;color:#18212c;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{width:100%;max-width:980px;margin:24px auto;padding:30px 36px;background:white;border:1px solid #dbe2e9;border-radius:10px}
h1{font-size:1.7rem;line-height:1.25}h2{font-size:1.25rem;margin-top:2rem;border-bottom:1px solid #dbe2e9;padding-bottom:.4rem}h3{font-size:1.06rem;margin-top:1.5rem}
p,li,th,td,a{white-space:normal;overflow-wrap:anywhere;word-break:normal}p{margin:.8rem 0}a{color:#175b91}li{margin:.5rem 0}
table{width:100%;table-layout:fixed;border-collapse:collapse;margin:.8rem 0 1.5rem;font-size:.95rem}col.label{width:28%}th,td{padding:11px 13px;border:1px solid #cbd5df;text-align:left;vertical-align:top}thead th{background:#e8eef5}tbody th{background:#f5f7fa;font-weight:600}
@media(max-width:600px){body{background:white;font-size:15px}main{margin:0;padding:18px 14px;border:0;border-radius:0}h1{font-size:1.45rem}col.label{width:32%}th,td{padding:8px}}
@media print{@page{size:A4;margin:16mm}body{background:white;font-size:10pt}main{margin:0;padding:0;border:0;max-width:none}h1{font-size:18pt}h2{font-size:13pt}h3{font-size:11pt}h1,h2,h3{break-after:avoid}tr{break-inside:avoid}thead{display:table-header-group}a{color:inherit;text-decoration:underline}}
</style></head><body><main>
'''+ '\n'.join(body) + '\n</main></body></html>\n'
    DRAFT.with_suffix('.html').write_text(output, encoding='utf-8')


def render_pdf(parts):
    fonts = Path('/usr/share/fonts/truetype/dejavu')
    for suffix, filename in [('', 'DejaVuSans.ttf'), ('-Bold', 'DejaVuSans-Bold.ttf'), ('-Oblique', 'DejaVuSans-Oblique.ttf'), ('-BoldOblique', 'DejaVuSans-BoldOblique.ttf')]:
        pdfmetrics.registerFont(TTFont('ReviewSans'+suffix, str(fonts/filename)))
    pdfmetrics.registerFontFamily('ReviewSans', normal='ReviewSans', bold='ReviewSans-Bold', italic='ReviewSans-Oblique', boldItalic='ReviewSans-BoldOblique')
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='ReviewBody', fontName='ReviewSans', fontSize=10.2, leading=14.3, spaceAfter=9, alignment=TA_LEFT))
    styles.add(ParagraphStyle(name='ReviewCell', parent=styles['ReviewBody'], fontSize=9.6, leading=13, spaceAfter=0))
    styles.add(ParagraphStyle(name='ReviewTitle', parent=styles['Heading1'], fontName='ReviewSans-Bold', fontSize=18, leading=22, spaceAfter=15))
    styles.add(ParagraphStyle(name='ReviewSection', parent=styles['Heading2'], fontName='ReviewSans-Bold', fontSize=13, leading=17, spaceBefore=14, spaceAfter=8))
    styles.add(ParagraphStyle(name='ReviewFeature', parent=styles['Heading3'], fontName='ReviewSans-Bold', fontSize=11.3, leading=15, spaceBefore=11, spaceAfter=7))
    width = A4[0] - 32 * mm
    doc = SimpleDocTemplate(str(DRAFT.with_suffix('.pdf')), pagesize=A4,
                           leftMargin=16*mm, rightMargin=16*mm,
                           topMargin=19*mm, bottomMargin=19*mm,
                           title='Torn Utilities — Revised Agreement 1.3 Review Draft',
                           author='Torn Utilities')
    def markup(text):
        value = inline(text).replace('<strong>', '<b>').replace('</strong>', '</b>')
        return re.sub(r'<a href="([^"]+)">(.*?)</a>', r'<link href="\1" color="#175b91">\2</link>', value)
    story = []
    for kind, *values in parts:
        if kind == 'heading':
            level, text = values
            style = {1:'ReviewTitle', 2:'ReviewSection', 3:'ReviewFeature'}[level]
            story.append(Paragraph(markup(text), styles[style]))
        elif kind == 'paragraph':
            story.append(Paragraph(markup(values[0]), styles['ReviewBody']))
        elif kind == 'list':
            for item in values[0]:
                story.append(Paragraph(markup(item), styles['ReviewBody'], bulletText='•'))
        else:
            rows = [[Paragraph(markup(cell), styles['ReviewCell']) for cell in row] for row in values[0]]
            table = Table(rows, colWidths=[width*.28, width*.72], repeatRows=1, hAlign='LEFT')
            table.setStyle(TableStyle([
                ('VALIGN',(0,0),(-1,-1),'TOP'),
                ('GRID',(0,0),(-1,-1),.45,colors.HexColor('#cbd5df')),
                ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e8eef5')),
                ('BACKGROUND',(0,1),(0,-1),colors.HexColor('#f5f7fa')),
                ('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),
                ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)
            ]))
            feature = story.pop() if story and isinstance(story[-1], Paragraph) and story[-1].style.name == 'ReviewFeature' else None
            story.append(KeepTogether(([feature] if feature else [])+[table, Spacer(1,9)]))
    def page(canvas, document):
        canvas.saveState()
        canvas.setFont('ReviewSans',8)
        canvas.setFillColor(colors.HexColor('#526173'))
        canvas.drawString(16*mm,A4[1]-11*mm,'TU agreement 1.3 — Revised review draft — Not active')
        canvas.drawRightString(A4[0]-16*mm,10*mm,f'Draft for review | Page {document.page}')
        canvas.restoreState()
    doc.build(story,onFirstPage=page,onLaterPages=page)


if __name__ == '__main__':
    parsed = list(blocks(DRAFT.read_text(encoding='utf-8')))
    render_html(parsed)
    render_pdf(parsed)
    print('Rendered wrapped HTML and A4 PDF review copies; active agreement unchanged.')
