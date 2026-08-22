#!/usr/bin/env node
"use strict";

const pptxgen = require("pptxgenjs");

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  green:    "159A5B",
  darkGreen:"0D6B3F",
  mint:     "E8F5EE",
  textDark: "1A1A1A",
  white:    "FFFFFF",
  gray:     "6B7280",
  lightGray:"F3F4F6",
  border:   "D1FAE5",
};

const FONT_HEADER = "Georgia";
const FONT_BODY   = "Calibri";

// Shadow factory — always fresh object to avoid PptxGenJS mutation bug
const mkShadow = () => ({ type: "outer", blur: 8, offset: 3, angle: 135, color: "000000", opacity: 0.12 });

// ─── PRESENTATION SETUP ───────────────────────────────────────────────────────
const pres = new pptxgen();
pres.layout  = "LAYOUT_WIDE";   // 13.33" × 7.5"
pres.author  = "Reloop";
pres.title   = "Reloop Pitch Deck";
pres.subject = "Incubator Pitch 2026";

const W = 13.33;  // slide width
const H = 7.5;    // slide height

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function addSlideTitle(slide, text, color, bg) {
  const isDark = bg === C.green || bg === C.darkGreen;
  const titleColor = color || (isDark ? C.white : C.darkGreen);

  slide.addText(text, {
    x: 0.55, y: 0.25, w: W - 1.1, h: 0.72,
    fontFace: FONT_HEADER, fontSize: 36, bold: true,
    color: titleColor, align: "left", valign: "middle", margin: 0,
  });

  // Underline accent bar
  const barColor = isDark ? C.white : C.green;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.55, y: 0.97, w: 1.6, h: 0.06,
    fill: { color: barColor }, line: { color: barColor, width: 0 },
  });
}

function addHeaderBar(slide, bgColor) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: W, h: 1.12,
    fill: { color: bgColor || C.white },
    line: { color: bgColor || C.white, width: 0 },
  });
}

function addFooter(slide, text, dark) {
  const bg   = dark ? C.darkGreen : C.mint;
  const col  = dark ? C.white     : C.gray;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: H - 0.38, w: W, h: 0.38,
    fill: { color: bg }, line: { color: bg, width: 0 },
  });
  slide.addText(text, {
    x: 0.4, y: H - 0.38, w: W - 0.8, h: 0.38,
    fontFace: FONT_BODY, fontSize: 10, color: col,
    align: "center", valign: "middle", margin: 0,
  });
}

// Stat callout: big number + small label
function addStatCallout(slide, bigText, label, x, y, w, h) {
  // container
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C.lightGray }, line: { color: C.border, width: 1.5 },
    shadow: mkShadow(),
  });
  // left accent bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w: 0.07, h,
    fill: { color: C.green }, line: { color: C.green, width: 0 },
  });
  // big number
  slide.addText(bigText, {
    x: x + 0.18, y: y + 0.08, w: w - 0.22, h: h * 0.55,
    fontFace: FONT_HEADER, fontSize: 30, bold: true,
    color: C.green, align: "left", valign: "middle", margin: 0,
  });
  // label
  slide.addText(label, {
    x: x + 0.18, y: y + h * 0.58, w: w - 0.22, h: h * 0.38,
    fontFace: FONT_BODY, fontSize: 13, color: C.textDark,
    align: "left", valign: "top", margin: 0,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — TITLE (dark green bg)
// ══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.green };

  // Decorative circles (subtle)
  slide.addShape(pres.shapes.OVAL, {
    x: W - 3.5, y: -1.0, w: 4.5, h: 4.5,
    fill: { color: C.darkGreen, transparency: 50 },
    line: { color: C.darkGreen, width: 0 },
  });
  slide.addShape(pres.shapes.OVAL, {
    x: -1.2, y: H - 2.5, w: 3.5, h: 3.5,
    fill: { color: C.darkGreen, transparency: 60 },
    line: { color: C.darkGreen, width: 0 },
  });

  // Logo circle (bottom-left)
  slide.addShape(pres.shapes.OVAL, {
    x: 0.55, y: H - 1.55, w: 0.85, h: 0.85,
    fill: { color: C.white }, line: { color: C.white, width: 0 },
  });
  slide.addText("R", {
    x: 0.55, y: H - 1.55, w: 0.85, h: 0.85,
    fontFace: FONT_HEADER, fontSize: 26, bold: true,
    color: C.green, align: "center", valign: "middle", margin: 0,
  });
  slide.addText("reloop", {
    x: 1.52, y: H - 1.48, w: 1.8, h: 0.7,
    fontFace: FONT_HEADER, fontSize: 17, bold: true,
    color: C.white, align: "left", valign: "middle", margin: 0,
  });

  // Main title
  slide.addText("Reloop", {
    x: 0.9, y: 1.7, w: 9, h: 1.5,
    fontFace: FONT_HEADER, fontSize: 80, bold: true,
    color: C.white, align: "left", valign: "middle", margin: 0,
  });

  // Subtitle
  slide.addText("Use Waste to Earn Rewards", {
    x: 0.9, y: 3.35, w: 9, h: 0.75,
    fontFace: FONT_BODY, fontSize: 28,
    color: C.white, align: "left", valign: "middle", margin: 0,
  });

  // Year line
  slide.addText("Incubator Pitch  ·  2026", {
    x: 0.9, y: 4.25, w: 7, h: 0.5,
    fontFace: FONT_BODY, fontSize: 17, italic: true,
    color: C.white, align: "left", valign: "middle", margin: 0,
  });

  // Bottom-right GreenCoins badge
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: W - 3.2, y: H - 1.25, w: 2.8, h: 0.65,
    fill: { color: C.darkGreen }, line: { color: C.white, width: 1.5 },
    rectRadius: 0.08,
  });
  slide.addText("♻  GreenCoins", {
    x: W - 3.2, y: H - 1.25, w: 2.8, h: 0.65,
    fontFace: FONT_BODY, fontSize: 15, bold: true,
    color: C.white, align: "center", valign: "middle", margin: 0,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — THE PROBLEM
// ══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.white };

  addHeaderBar(slide, C.white);
  addSlideTitle(slide, "The Problem");
  addFooter(slide, "Reloop  ·  Incubator Pitch 2026");

  // 2×2 grid of stat callouts
  const cW = 5.55, cH = 2.4;
  const gap = 0.3;
  const startX = 0.7, startY = 1.35;

  const stats = [
    ["9.4M Tons", "plastic waste generated in India yearly"],
    ["Only 30%",  "of recyclable waste actually gets recycled"],
    ["₹0",        "incentive for citizens to recycle"],
    ["Broken Chain", "recyclers lack reliable waste supply"],
  ];

  stats.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x   = startX + col * (cW + gap);
    const y   = startY + row * (cH + gap);
    addStatCallout(slide, s[0], s[1], x, y, cW, cH);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — OUR SOLUTION
// ══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.mint };

  addHeaderBar(slide, C.mint);
  addSlideTitle(slide, "Our Solution", C.darkGreen, C.mint);
  addFooter(slide, "Reloop  ·  Incubator Pitch 2026");

  // 3-box flow diagram
  const boxW = 3.3, boxH = 2.5, boxY = 1.4;
  const arrowY = boxY + boxH / 2 - 0.05;
  const boxes = [
    { icon: "📱", title: "Scan", desc: "Scan your cans & bottles via the Reloop app" },
    { icon: "🪙", title: "Earn GreenCoins", desc: "Get rewarded for every item you recycle" },
    { icon: "🎁", title: "Redeem", desc: "Shop vouchers & products in rewards marketplace" },
  ];

  const totalBoxW  = boxes.length * boxW;
  const totalArrowW = 0.55 * 2;
  const totalW = totalBoxW + totalArrowW;
  const startX = (W - totalW) / 2;

  boxes.forEach((b, i) => {
    const x = startX + i * (boxW + 0.55);

    // box shadow background
    slide.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.06, y: boxY + 0.06, w: boxW, h: boxH,
      fill: { color: "D1FAE5" }, line: { color: "D1FAE5", width: 0 },
    });
    // white box
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: boxY, w: boxW, h: boxH,
      fill: { color: C.white }, line: { color: C.border, width: 1.5 },
    });
    // top green accent
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: boxY, w: boxW, h: 0.07,
      fill: { color: C.green }, line: { color: C.green, width: 0 },
    });
    // icon
    slide.addText(b.icon, {
      x, y: boxY + 0.18, w: boxW, h: 0.75,
      fontFace: FONT_BODY, fontSize: 36,
      align: "center", valign: "middle", margin: 0,
    });
    // title
    slide.addText(b.title, {
      x, y: boxY + 0.98, w: boxW, h: 0.55,
      fontFace: FONT_HEADER, fontSize: 17, bold: true,
      color: C.darkGreen, align: "center", valign: "middle", margin: 0,
    });
    // description
    slide.addText(b.desc, {
      x: x + 0.18, y: boxY + 1.55, w: boxW - 0.36, h: 0.85,
      fontFace: FONT_BODY, fontSize: 12.5, color: C.textDark,
      align: "center", valign: "top", margin: 0,
    });

    // arrow after each box except last
    if (i < boxes.length - 1) {
      const arrowX = x + boxW + 0.08;
      slide.addShape(pres.shapes.RECTANGLE, {
        x: arrowX, y: arrowY - 0.02, w: 0.3, h: 0.07,
        fill: { color: C.green }, line: { color: C.green, width: 0 },
      });
      // arrowhead triangle using text
      slide.addText("▶", {
        x: arrowX + 0.28, y: arrowY - 0.15, w: 0.22, h: 0.32,
        fontFace: FONT_BODY, fontSize: 16, color: C.green,
        align: "left", valign: "middle", margin: 0,
      });
    }
  });

  // Feature pills
  const pills = ["Gamified Leaderboard", "Recycling Center Network"];
  const pillW = 3.2, pillH = 0.5, pillY = 4.22;
  const pillStartX = (W - (pills.length * pillW + 0.4)) / 2;

  pills.forEach((p, i) => {
    const px = pillStartX + i * (pillW + 0.4);
    slide.addShape(pres.shapes.RECTANGLE, {
      x: px, y: pillY, w: pillW, h: pillH,
      fill: { color: C.green }, line: { color: C.green, width: 0 },
    });
    slide.addText(p, {
      x: px, y: pillY, w: pillW, h: pillH,
      fontFace: FONT_BODY, fontSize: 13.5, bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — MARKET OPPORTUNITY
// ══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.white };

  addHeaderBar(slide, C.white);
  addSlideTitle(slide, "Market Opportunity");
  addFooter(slide, "Reloop  ·  Incubator Pitch 2026");

  // Left: 3 stat callouts stacked
  const cW = 7.0, cH = 1.55, cX = 0.55, gap = 0.2;
  const leftStats = [
    ["₹2,00,000 Cr", "India waste management market by 2030"],
    ["500M+",        "Urban smartphone users aged 18–35"],
    ["15+ items/month", "Avg recyclables per user (survey data)"],
  ];
  leftStats.forEach((s, i) => {
    addStatCallout(slide, s[0], s[1], cX, 1.35 + i * (cH + gap), cW, cH);
  });

  // Right: TAM/SAM/SOM concentric circles
  const cx = W - 2.6;
  const cy = 3.9;

  // TAM (biggest)
  slide.addShape(pres.shapes.OVAL, {
    x: cx - 2.2, y: cy - 2.2, w: 4.4, h: 4.4,
    fill: { color: "E8F5EE" }, line: { color: C.green, width: 2 },
  });
  slide.addText("TAM", {
    x: cx - 2.2, y: cy - 2.35, w: 4.4, h: 0.5,
    fontFace: FONT_BODY, fontSize: 11, bold: true, color: C.gray,
    align: "center", valign: "middle", margin: 0,
  });
  slide.addText("₹50,000 Cr", {
    x: cx - 2.2, y: cy - 1.85, w: 4.4, h: 0.4,
    fontFace: FONT_BODY, fontSize: 10.5, color: C.textDark,
    align: "center", valign: "middle", margin: 0,
  });

  // SAM
  slide.addShape(pres.shapes.OVAL, {
    x: cx - 1.5, y: cy - 1.5, w: 3.0, h: 3.0,
    fill: { color: "D1FAE5" }, line: { color: C.green, width: 2 },
  });
  slide.addText("SAM", {
    x: cx - 1.5, y: cy - 1.35, w: 3.0, h: 0.4,
    fontFace: FONT_BODY, fontSize: 11, bold: true, color: C.gray,
    align: "center", valign: "middle", margin: 0,
  });
  slide.addText("₹5,000 Cr", {
    x: cx - 1.5, y: cy - 0.95, w: 3.0, h: 0.38,
    fontFace: FONT_BODY, fontSize: 10.5, color: C.textDark,
    align: "center", valign: "middle", margin: 0,
  });

  // SOM
  slide.addShape(pres.shapes.OVAL, {
    x: cx - 0.8, y: cy - 0.8, w: 1.6, h: 1.6,
    fill: { color: C.green }, line: { color: C.darkGreen, width: 2 },
  });
  slide.addText("SOM", {
    x: cx - 0.8, y: cy - 0.62, w: 1.6, h: 0.35,
    fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.white,
    align: "center", valign: "middle", margin: 0,
  });
  slide.addText("₹500 Cr", {
    x: cx - 0.8, y: cy - 0.27, w: 1.6, h: 0.35,
    fontFace: FONT_BODY, fontSize: 9.5, color: C.white,
    align: "center", valign: "middle", margin: 0,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — BUSINESS MODEL
// ══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.white };

  addHeaderBar(slide, C.white);
  addSlideTitle(slide, "Business Model");
  addFooter(slide, "Reloop  ·  Incubator Pitch 2026");

  const cards = [
    { icon: "♻", title: "Recycling Commission",  desc: "₹2–5 per item collected\nfrom recycling centers" },
    { icon: "🏪", title: "Marketplace Fees",      desc: "Brands pay ₹10–50 per\nGreenCoin redemption" },
    { icon: "📊", title: "Data Insights",          desc: "Anonymized consumption data\nsold to FMCG companies" },
    { icon: "🤝", title: "CSR Partnerships",       desc: "Corporate funding of GreenCoins\nas ESG credit" },
  ];

  const cW = 5.8, cH = 2.35, gap = 0.35;
  const startX = (W - (2 * cW + gap)) / 2;
  const startY = 1.35;

  cards.forEach((c, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x   = startX + col * (cW + gap);
    const y   = startY + row * (cH + gap);

    // card background
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cW, h: cH,
      fill: { color: C.white }, line: { color: C.border, width: 1.5 },
      shadow: mkShadow(),
    });
    // green header strip
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cW, h: 0.55,
      fill: { color: C.green }, line: { color: C.green, width: 0 },
    });
    // icon + title in header
    slide.addText(`${c.icon}  ${c.title}`, {
      x: x + 0.15, y, w: cW - 0.2, h: 0.55,
      fontFace: FONT_BODY, fontSize: 14.5, bold: true, color: C.white,
      align: "left", valign: "middle", margin: 0,
    });
    // description
    slide.addText(c.desc, {
      x: x + 0.2, y: y + 0.62, w: cW - 0.4, h: cH - 0.75,
      fontFace: FONT_BODY, fontSize: 14, color: C.textDark,
      align: "left", valign: "top", margin: 0,
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — FINANCIAL PROJECTIONS
// ══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.white };

  addHeaderBar(slide, C.white);
  addSlideTitle(slide, "Financial Projections");
  addFooter(slide, "Break-even: Month 14  ·  Gross Margin: 65%");

  const years = [
    { year: "Year 1", users: "10,000 Users",   rev: "₹36 Lakhs",    color: "E8F5EE" },
    { year: "Year 2", users: "50,000 Users",   rev: "₹1.8 Crore",   color: "D1FAE5" },
    { year: "Year 3", users: "2,00,000 Users", rev: "₹9 Crore",     color: C.green  },
  ];

  const yW = 3.7, yH = 2.15, yGap = 0.35;
  const yStartX = (W - (3 * yW + 2 * yGap)) / 2;
  const yY = 1.3;

  years.forEach((y, i) => {
    const x = yStartX + i * (yW + yGap);
    const isDark = y.color === C.green;
    const textCol = isDark ? C.white : C.darkGreen;
    const descCol = isDark ? "D1FAE5" : C.gray;

    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: yY, w: yW, h: yH,
      fill: { color: y.color }, line: { color: C.border, width: 1.5 },
      shadow: mkShadow(),
    });
    slide.addText(y.year, {
      x, y: yY + 0.12, w: yW, h: 0.5,
      fontFace: FONT_HEADER, fontSize: 18, bold: true, color: textCol,
      align: "center", valign: "middle", margin: 0,
    });
    slide.addText(y.users, {
      x, y: yY + 0.65, w: yW, h: 0.5,
      fontFace: FONT_BODY, fontSize: 14, color: descCol,
      align: "center", valign: "middle", margin: 0,
    });
    slide.addText(y.rev, {
      x, y: yY + 1.18, w: yW, h: 0.7,
      fontFace: FONT_HEADER, fontSize: 24, bold: true, color: textCol,
      align: "center", valign: "middle", margin: 0,
    });
  });

  // Unit economics
  const econ = [
    { label: "Customer Acquisition Cost", val: "CAC ₹50" },
    { label: "Lifetime Value",            val: "LTV ₹850" },
    { label: "Return on Acquisition",     val: "LTV:CAC 17x" },
  ];

  const eW = 3.7, eH = 1.45, eGap = 0.35;
  const eStartX = (W - (3 * eW + 2 * eGap)) / 2;
  const eY = 3.8;

  econ.forEach((e, i) => {
    const x = eStartX + i * (eW + eGap);
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: eY, w: eW, h: eH,
      fill: { color: C.lightGray }, line: { color: C.border, width: 1 },
    });
    slide.addText(e.val, {
      x, y: eY + 0.1, w: eW, h: 0.72,
      fontFace: FONT_HEADER, fontSize: 22, bold: true, color: C.green,
      align: "center", valign: "middle", margin: 0,
    });
    slide.addText(e.label, {
      x, y: eY + 0.82, w: eW, h: 0.55,
      fontFace: FONT_BODY, fontSize: 12, color: C.gray,
      align: "center", valign: "middle", margin: 0,
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — TRACTION / MVP
// ══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.mint };

  addHeaderBar(slide, C.mint);
  addSlideTitle(slide, "Traction & MVP", C.darkGreen, C.mint);
  addFooter(slide, "Reloop  ·  Incubator Pitch 2026");

  // Left: bullet list
  const bullets = [
    "MVP fully built — 8 screens live",
    "Early access form capturing real demand",
    "Avg user consumes 15+ recyclables/month",
    "Strong willingness to use rewards-based app",
  ];

  bullets.forEach((b, i) => {
    const y = 1.45 + i * 0.92;
    // checkmark circle
    slide.addShape(pres.shapes.OVAL, {
      x: 0.55, y, w: 0.42, h: 0.42,
      fill: { color: C.green }, line: { color: C.green, width: 0 },
    });
    slide.addText("✓", {
      x: 0.55, y, w: 0.42, h: 0.42,
      fontFace: FONT_BODY, fontSize: 14, bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });
    slide.addText(b, {
      x: 1.12, y: y - 0.05, w: 6.0, h: 0.55,
      fontFace: FONT_BODY, fontSize: 15.5, color: C.textDark,
      align: "left", valign: "middle", margin: 0,
    });
  });

  // Right: phone frame mockup
  const pX = 8.7, pY = 1.3, pW = 3.8, pH = 5.4;
  // outer frame
  slide.addShape(pres.shapes.RECTANGLE, {
    x: pX, y: pY, w: pW, h: pH,
    fill: { color: C.white }, line: { color: C.green, width: 3 },
    shadow: mkShadow(),
  });
  // status bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: pX, y: pY, w: pW, h: 0.38,
    fill: { color: C.green }, line: { color: C.green, width: 0 },
  });
  // camera notch
  slide.addShape(pres.shapes.OVAL, {
    x: pX + pW / 2 - 0.18, y: pY + 0.08, w: 0.36, h: 0.22,
    fill: { color: C.darkGreen }, line: { color: C.darkGreen, width: 0 },
  });
  // app content area
  slide.addShape(pres.shapes.RECTANGLE, {
    x: pX + 0.15, y: pY + 0.55, w: pW - 0.3, h: pH - 1.1,
    fill: { color: C.mint }, line: { color: C.border, width: 1 },
  });
  // centered text in app
  slide.addText("8 Screens\nBuilt", {
    x: pX + 0.15, y: pY + 1.5, w: pW - 0.3, h: 1.6,
    fontFace: FONT_HEADER, fontSize: 26, bold: true, color: C.darkGreen,
    align: "center", valign: "middle", margin: 0,
  });
  slide.addText("♻", {
    x: pX + 0.15, y: pY + 3.2, w: pW - 0.3, h: 0.9,
    fontFace: FONT_BODY, fontSize: 42,
    align: "center", valign: "middle", margin: 0,
  });
  // home indicator
  slide.addShape(pres.shapes.RECTANGLE, {
    x: pX + pW / 2 - 0.55, y: pY + pH - 0.25, w: 1.1, h: 0.1,
    fill: { color: C.green }, line: { color: C.green, width: 0 },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — GO-TO-MARKET
// ══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.white };

  addHeaderBar(slide, C.white);
  addSlideTitle(slide, "Go-To-Market Strategy");
  addFooter(slide, "Reloop  ·  Incubator Pitch 2026");

  const steps = [
    { n: "1", title: "Launch 3 Cities",       desc: "Delhi · Mumbai\nBangalore" },
    { n: "2", title: "50 Recycling Partners", desc: "Month 1–3\nverified centers" },
    { n: "3", title: "Campus Campaigns",      desc: "College zero-waste\nclubs & events" },
    { n: "4", title: "#GreenChallenge",       desc: "Social media\nviral loop" },
  ];

  const sW = 2.7, sH = 3.2, sGap = 0.5;
  const sStartX = (W - (4 * sW + 3 * sGap)) / 2;
  const sY = 1.55;

  // Connecting line
  const lineY = sY + 0.3;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: sStartX + 0.3, y: lineY, w: (4 * sW + 3 * sGap) - 0.6, h: 0.05,
    fill: { color: C.border }, line: { color: C.border, width: 0 },
  });

  steps.forEach((s, i) => {
    const x = sStartX + i * (sW + sGap);

    // card
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: sY + 0.55, w: sW, h: sH,
      fill: { color: C.lightGray }, line: { color: C.border, width: 1.5 },
      shadow: mkShadow(),
    });

    // numbered circle
    slide.addShape(pres.shapes.OVAL, {
      x: x + sW / 2 - 0.3, y: sY, w: 0.6, h: 0.6,
      fill: { color: C.green }, line: { color: C.white, width: 2 },
    });
    slide.addText(s.n, {
      x: x + sW / 2 - 0.3, y: sY, w: 0.6, h: 0.6,
      fontFace: FONT_HEADER, fontSize: 18, bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });

    // title
    slide.addText(s.title, {
      x: x + 0.12, y: sY + 0.72, w: sW - 0.24, h: 0.65,
      fontFace: FONT_HEADER, fontSize: 15, bold: true, color: C.darkGreen,
      align: "center", valign: "middle", margin: 0,
    });

    // description
    slide.addText(s.desc, {
      x: x + 0.12, y: sY + 1.45, w: sW - 0.24, h: sH - 1.1,
      fontFace: FONT_BODY, fontSize: 13, color: C.textDark,
      align: "center", valign: "top", margin: 0,
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — TEAM
// ══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.white };

  addHeaderBar(slide, C.white);
  addSlideTitle(slide, "The Team");
  addFooter(slide, "Backed by passion for sustainability and tech");

  const members = [
    { role: "Founder / CEO",  name: "[Your Name]" },
    { role: "Tech Lead",      name: "[Name]" },
    { role: "Operations",     name: "[Name]" },
  ];

  const cW = 3.5, cH = 3.8, cGap = 0.6;
  const cStartX = (W - (3 * cW + 2 * cGap)) / 2;
  const cY = 1.5;

  members.forEach((m, i) => {
    const x = cStartX + i * (cW + cGap);

    // card
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: cY, w: cW, h: cH,
      fill: { color: C.white }, line: { color: C.border, width: 1.5 },
      shadow: mkShadow(),
    });
    // top bar
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: cY, w: cW, h: 0.07,
      fill: { color: C.green }, line: { color: C.green, width: 0 },
    });

    // avatar circle
    const aR = 0.7;
    slide.addShape(pres.shapes.OVAL, {
      x: x + cW / 2 - aR, y: cY + 0.3, w: aR * 2, h: aR * 2,
      fill: { color: C.mint }, line: { color: C.green, width: 2 },
    });
    slide.addText("👤", {
      x: x + cW / 2 - aR, y: cY + 0.3, w: aR * 2, h: aR * 2,
      fontFace: FONT_BODY, fontSize: 30,
      align: "center", valign: "middle", margin: 0,
    });

    // role
    slide.addText(m.role, {
      x: x + 0.12, y: cY + 1.65, w: cW - 0.24, h: 0.55,
      fontFace: FONT_BODY, fontSize: 13, bold: true, color: C.green,
      align: "center", valign: "middle", margin: 0,
    });
    // name
    slide.addText(m.name, {
      x: x + 0.12, y: cY + 2.22, w: cW - 0.24, h: 0.55,
      fontFace: FONT_HEADER, fontSize: 16, bold: true, color: C.textDark,
      align: "center", valign: "middle", margin: 0,
    });

    // decorative dots
    [0, 1, 2].forEach(d => {
      slide.addShape(pres.shapes.OVAL, {
        x: x + cW / 2 - 0.3 + d * 0.3, y: cY + cH - 0.45, w: 0.12, h: 0.12,
        fill: { color: i === d ? C.green : C.border },
        line: { color: C.border, width: 0 },
      });
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — THE ASK (dark green bg)
// ══════════════════════════════════════════════════════════════════════════════
{
  const slide = pres.addSlide();
  slide.background = { color: C.green };

  // decorative circle
  slide.addShape(pres.shapes.OVAL, {
    x: W - 4.0, y: -1.5, w: 5.5, h: 5.5,
    fill: { color: C.darkGreen, transparency: 55 },
    line: { color: C.darkGreen, width: 0 },
  });
  slide.addShape(pres.shapes.OVAL, {
    x: -1.8, y: H - 3.0, w: 4.0, h: 4.0,
    fill: { color: C.darkGreen, transparency: 60 },
    line: { color: C.darkGreen, width: 0 },
  });

  // Title
  slide.addText("What We're Looking For", {
    x: 0.55, y: 0.28, w: W - 1.1, h: 0.72,
    fontFace: FONT_HEADER, fontSize: 36, bold: true,
    color: C.white, align: "left", valign: "middle", margin: 0,
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.55, y: 1.0, w: 1.6, h: 0.06,
    fill: { color: C.white }, line: { color: C.white, width: 0 },
  });

  // Big funding callout
  slide.addShape(pres.shapes.RECTANGLE, {
    x: W / 2 - 2.4, y: 1.18, w: 4.8, h: 1.05,
    fill: { color: C.white, transparency: 15 },
    line: { color: C.white, width: 2 },
  });
  slide.addText("₹50 Lakhs", {
    x: W / 2 - 2.4, y: 1.18, w: 4.8, h: 0.62,
    fontFace: FONT_HEADER, fontSize: 38, bold: true, color: C.white,
    align: "center", valign: "middle", margin: 0,
  });
  slide.addText("Seed Funding", {
    x: W / 2 - 2.4, y: 1.78, w: 4.8, h: 0.38,
    fontFace: FONT_BODY, fontSize: 14, color: "D1FAE5",
    align: "center", valign: "middle", margin: 0,
  });

  // Two columns
  const colY = 2.48, colH = 3.55;
  const colW = (W - 1.5) / 2;
  const col1X = 0.55;
  const col2X = col1X + colW + 0.4;

  // Column backgrounds
  slide.addShape(pres.shapes.RECTANGLE, {
    x: col1X, y: colY, w: colW, h: colH,
    fill: { color: C.darkGreen, transparency: 30 },
    line: { color: C.white, width: 1 },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: col2X, y: colY, w: colW, h: colH,
    fill: { color: C.darkGreen, transparency: 30 },
    line: { color: C.white, width: 1 },
  });

  // Column 1 header
  slide.addText("Use of Funds", {
    x: col1X + 0.2, y: colY + 0.12, w: colW - 0.4, h: 0.45,
    fontFace: FONT_HEADER, fontSize: 16, bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0,
  });

  const funds = [
    ["40%", "Tech (React Native app)"],
    ["30%", "Marketing & Growth"],
    ["20%", "Operations"],
    ["10%", "Legal & Compliance"],
  ];
  funds.forEach((f, i) => {
    const fy = colY + 0.72 + i * 0.65;
    // pct badge
    slide.addShape(pres.shapes.RECTANGLE, {
      x: col1X + 0.2, y: fy, w: 0.65, h: 0.38,
      fill: { color: C.white, transparency: 20 },
      line: { color: C.white, width: 0 },
    });
    slide.addText(f[0], {
      x: col1X + 0.2, y: fy, w: 0.65, h: 0.38,
      fontFace: FONT_BODY, fontSize: 13, bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });
    slide.addText(f[1], {
      x: col1X + 0.95, y: fy, w: colW - 1.15, h: 0.38,
      fontFace: FONT_BODY, fontSize: 13, color: "D1FAE5",
      align: "left", valign: "middle", margin: 0,
    });
  });

  // Column 2 header
  slide.addText("From the Incubator", {
    x: col2X + 0.2, y: colY + 0.12, w: colW - 0.4, h: 0.45,
    fontFace: FONT_HEADER, fontSize: 16, bold: true, color: C.white,
    align: "left", valign: "middle", margin: 0,
  });

  const incubator = [
    "Mentorship & Network",
    "Lab / Office Space",
    "Investor Introductions",
  ];
  incubator.forEach((item, i) => {
    const iy = colY + 0.72 + i * 0.78;
    slide.addShape(pres.shapes.OVAL, {
      x: col2X + 0.2, y: iy + 0.06, w: 0.28, h: 0.28,
      fill: { color: C.white }, line: { color: C.white, width: 0 },
    });
    slide.addText(item, {
      x: col2X + 0.6, y: iy, w: colW - 0.8, h: 0.42,
      fontFace: FONT_BODY, fontSize: 13.5, color: C.white,
      align: "left", valign: "middle", margin: 0,
    });
  });

  // Footer goal
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: H - 0.58, w: W, h: 0.58,
    fill: { color: C.darkGreen }, line: { color: C.darkGreen, width: 0 },
  });
  slide.addText("Goal: 10,000 users in 6 months post-funding", {
    x: 0.4, y: H - 0.58, w: W - 0.8, h: 0.58,
    fontFace: FONT_BODY, fontSize: 14, bold: true, color: C.white,
    align: "center", valign: "middle", margin: 0,
  });
}

// ─── WRITE FILE ───────────────────────────────────────────────────────────────
const outPath = "/Users/divyapandey/reloop/Reloop_Pitch_Deck.pptx";
pres.writeFile({ fileName: outPath })
  .then(() => console.log("✅ Saved:", outPath))
  .catch(e => { console.error("❌ Error:", e); process.exit(1); });
