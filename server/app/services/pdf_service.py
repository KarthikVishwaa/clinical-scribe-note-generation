"""PDF generation service using ReportLab."""
from io import BytesIO
from datetime import datetime

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm, cm
    from reportlab.lib.colors import HexColor, black, white, grey
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable, KeepTogether
    )
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


def generate_soap_pdf(
    encounter: dict,
    soap_note: dict,
    entities: list,
    doctor: dict,
) -> bytes:
    """Generate a professional SOAP note PDF."""
    if not REPORTLAB_AVAILABLE:
        raise RuntimeError("reportlab is not installed. Run: pip install reportlab")

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )

    # Colors
    primary = HexColor("#0058BE")
    light_blue = HexColor("#EFF6FF")
    purple = HexColor("#7C3AED")
    red = HexColor("#DC2626")
    green = HexColor("#059669")
    orange = HexColor("#D97706")
    light_grey = HexColor("#F8FAFC")
    border_grey = HexColor("#E2E8F0")
    text_dark = HexColor("#1E293B")
    text_muted = HexColor("#64748B")

    styles = getSampleStyleSheet()

    # Custom styles
    def style(name, **kwargs):
        return ParagraphStyle(name, **kwargs)

    clinic_name_style = style("ClinicName", fontSize=20, fontName="Helvetica-Bold",
                               textColor=primary, leading=24)
    clinic_sub_style = style("ClinicSub", fontSize=9, fontName="Helvetica",
                              textColor=text_muted, leading=13)
    section_head_style = style("SectionHead", fontSize=11, fontName="Helvetica-Bold",
                                textColor=white, leading=14)
    body_style = style("Body", fontSize=10, fontName="Helvetica",
                        textColor=text_dark, leading=16, spaceAfter=4)
    label_style = style("Label", fontSize=9, fontName="Helvetica-Bold",
                         textColor=text_muted, leading=12)
    value_style = style("Value", fontSize=10, fontName="Helvetica",
                         textColor=text_dark, leading=15)

    story = []
    W = A4[0] - 4*cm  # usable width

    # ── Header ──────────────────────────────────────────────────────────────
    clinic = doctor.get("clinic_name", "Medical Clinic")
    dr_name = doctor.get("full_name", "Doctor")
    specialty = doctor.get("specialty", "")
    license_no = doctor.get("license_number", "")
    clinic_address = doctor.get("clinic_address", "")
    phone = doctor.get("phone", "")

    header_data = [
        [
            Paragraph(clinic or "Medical Clinic", clinic_name_style),
            Paragraph(
                f"Dr. {dr_name}<br/>"
                f"{specialty}<br/>"
                f"{'Lic: ' + license_no if license_no else ''}<br/>"
                f"{clinic_address}<br/>"
                f"{'Tel: ' + phone if phone else ''}",
                clinic_sub_style
            )
        ]
    ]
    header_table = Table(header_data, colWidths=[W*0.55, W*0.45])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), light_blue),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("LEFTPADDING", (0, 0), (0, -1), 14),
        ("RIGHTPADDING", (-1, 0), (-1, -1), 14),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROUNDEDCORNERS", [8, 8, 8, 8]),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.4*cm))

    # Title bar
    title_data = [[Paragraph("CLINICAL ENCOUNTER — SOAP NOTE", style("T", fontSize=13,
                   fontName="Helvetica-Bold", textColor=white, alignment=TA_CENTER))]]
    title_table = Table(title_data, colWidths=[W])
    title_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), primary),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(title_table)
    story.append(Spacer(1, 0.3*cm))

    # ── Patient Info ─────────────────────────────────────────────────────────
    pt_name = encounter.get("patient_name", "Unknown Patient")
    pt_id = encounter.get("patient_id", "—")
    complaint = encounter.get("chief_complaint", "—")
    date_str = datetime.now().strftime("%B %d, %Y  %I:%M %p")

    pt_data = [
        [Paragraph("PATIENT", label_style), Paragraph(pt_name, style("PtN", fontSize=12,
          fontName="Helvetica-Bold", textColor=text_dark)),
         Paragraph("DATE", label_style), Paragraph(date_str, value_style)],
        [Paragraph("PATIENT ID", label_style), Paragraph(pt_id, value_style),
         Paragraph("CHIEF COMPLAINT", label_style), Paragraph(complaint, value_style)],
    ]
    pt_table = Table(pt_data, colWidths=[W*0.15, W*0.35, W*0.2, W*0.3])
    pt_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), light_grey),
        ("GRID", (0, 0), (-1, -1), 0.5, border_grey),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(pt_table)
    story.append(Spacer(1, 0.4*cm))

    # ── SOAP Sections ────────────────────────────────────────────────────────
    soap_sections = [
        ("S", "SUBJECTIVE", soap_note.get("subjective", ""), purple, HexColor("#F5F3FF")),
        ("O", "OBJECTIVE", soap_note.get("objective", ""), primary, light_blue),
        ("A", "ASSESSMENT", soap_note.get("assessment", ""), red, HexColor("#FEF2F2")),
        ("P", "PLAN", soap_note.get("plan", ""), green, HexColor("#ECFDF5")),
    ]

    for letter, section_name, content, color, bg in soap_sections:
        # Section header
        hdr_data = [[
            Paragraph(letter, style(f"SL{letter}", fontSize=16, fontName="Helvetica-Bold",
                      textColor=white, alignment=TA_CENTER)),
            Paragraph(section_name, style(f"SN{letter}", fontSize=11, fontName="Helvetica-Bold",
                      textColor=white))
        ]]
        hdr_table = Table(hdr_data, colWidths=[1*cm, W-1*cm])
        hdr_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), color),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (0, 0), 10),
            ("LEFTPADDING", (1, 0), (1, 0), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(hdr_table)

        # Section content
        text = content or "Not documented."
        content_data = [[Paragraph(text, style(f"SC{letter}", fontSize=10, fontName="Helvetica",
                          textColor=text_dark, leading=16))]]
        content_table = Table(content_data, colWidths=[W])
        content_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 14),
            ("RIGHTPADDING", (0, 0), (-1, -1), 14),
            ("GRID", (0, 0), (-1, -1), 0.5, border_grey),
        ]))
        story.append(content_table)
        story.append(Spacer(1, 0.25*cm))

    # ── Medical Entities ──────────────────────────────────────────────────────
    if entities:
        story.append(Spacer(1, 0.2*cm))
        hdr_data = [[Paragraph("MEDICAL ENTITIES", style("ME", fontSize=11,
                    fontName="Helvetica-Bold", textColor=white))]]
        hdr_table = Table(hdr_data, colWidths=[W])
        hdr_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), HexColor("#374151")),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ]))
        story.append(hdr_table)

        # Group entities by type
        from collections import defaultdict
        grouped = defaultdict(list)
        for e in entities:
            grouped[e.get("entity_type", "other")].append(e)

        entity_rows = []
        for etype, items in grouped.items():
            for item in items:
                codes = []
                if item.get("icd_code"):
                    codes.append(f"ICD: {item['icd_code']}")
                if item.get("snomed_code"):
                    codes.append(f"SNOMED: {item['snomed_code']}")
                entity_rows.append([
                    Paragraph(etype.replace("_", " ").title(), label_style),
                    Paragraph(f"<b>{item.get('entity_text', '')}</b>", value_style),
                    Paragraph(item.get("normalized_term", ""), style("Norm", fontSize=9,
                              fontName="Helvetica", textColor=text_muted, fontStyle="italic")),
                    Paragraph(" | ".join(codes), style("Code", fontSize=8,
                              fontName="Courier", textColor=primary)),
                ])

        entity_table = Table(entity_rows, colWidths=[W*0.18, W*0.28, W*0.28, W*0.26])
        entity_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), white),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [white, light_grey]),
            ("GRID", (0, 0), (-1, -1), 0.5, border_grey),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(entity_table)

    # ── Signature ────────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.8*cm))
    sig_data = [[
        Paragraph(
            f"_______________________________<br/>"
            f"Dr. {dr_name}<br/>"
            f"{specialty}<br/>"
            f"Date: {datetime.now().strftime('%d/%m/%Y')}",
            style("Sig", fontSize=10, fontName="Helvetica", textColor=text_dark, leading=16)
        ),
        Paragraph(
            "This document was generated by an AI-assisted clinical documentation system. "
            "Physician review and signature required for clinical use.",
            style("Disc", fontSize=8, fontName="Helvetica", textColor=text_muted, leading=12)
        )
    ]]
    sig_table = Table(sig_data, colWidths=[W*0.4, W*0.6])
    sig_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("LEFTPADDING", (1, 0), (1, 0), 20),
    ]))
    story.append(sig_table)

    doc.build(story)
    return buf.getvalue()


def generate_prescription_pdf(prescription: dict, doctor: dict) -> bytes:
    """Generate a prescription slip PDF."""
    if not REPORTLAB_AVAILABLE:
        raise RuntimeError("reportlab is not installed. Run: pip install reportlab")

    import json as _json
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm,
                             topMargin=2*cm, bottomMargin=2*cm)

    primary = HexColor("#0058BE")
    light_blue = HexColor("#EFF6FF")
    border_grey = HexColor("#E2E8F0")
    text_dark = HexColor("#1E293B")
    text_muted = HexColor("#64748B")
    green = HexColor("#059669")
    styles = getSampleStyleSheet()
    W = A4[0] - 4*cm

    def s(name, **kw):
        return ParagraphStyle(name, **kw)

    story = []

    # Header
    clinic_data = [[
        Paragraph(doctor.get("clinic_name", "Medical Clinic"),
                  s("CN", fontSize=18, fontName="Helvetica-Bold", textColor=primary)),
        Paragraph(
            f"Dr. {doctor.get('full_name', 'Doctor')} · {doctor.get('specialty', '')}<br/>"
            f"{doctor.get('clinic_address', '')} · {doctor.get('phone', '')}",
            s("CS", fontSize=9, textColor=text_muted, leading=13)
        )
    ]]
    ct = Table(clinic_data, colWidths=[W*0.55, W*0.45])
    ct.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), light_blue),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("LEFTPADDING", (0, 0), (0, 0), 14),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(ct)
    story.append(Spacer(1, 0.3*cm))

    # Rx Title
    rx_data = [[Paragraph("℞  PRESCRIPTION", s("RX", fontSize=14, fontName="Helvetica-Bold",
                textColor=HexColor("#fff"), alignment=TA_CENTER))]]
    rx_table = Table(rx_data, colWidths=[W])
    rx_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), green),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(rx_table)
    story.append(Spacer(1, 0.3*cm))

    # Patient & Date
    pt_data = [[
        Paragraph("PATIENT", s("L", fontSize=8, fontName="Helvetica-Bold", textColor=text_muted)),
        Paragraph(prescription.get("patient_name", "Unknown"), s("V", fontSize=11,
                  fontName="Helvetica-Bold", textColor=text_dark)),
        Paragraph("DATE", s("L2", fontSize=8, fontName="Helvetica-Bold", textColor=text_muted)),
        Paragraph(datetime.now().strftime("%d %B %Y"), s("V2", fontSize=10, textColor=text_dark)),
    ]]
    ptt = Table(pt_data, colWidths=[W*0.12, W*0.38, W*0.12, W*0.38])
    ptt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F8FAFC")),
        ("GRID", (0, 0), (-1, -1), 0.5, border_grey),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(ptt)

    if prescription.get("diagnosis"):
        story.append(Spacer(1, 0.2*cm))
        diag_data = [[
            Paragraph("DIAGNOSIS", s("DL", fontSize=8, fontName="Helvetica-Bold", textColor=text_muted)),
            Paragraph(prescription.get("diagnosis", ""), s("DV", fontSize=10, textColor=text_dark))
        ]]
        dt = Table(diag_data, colWidths=[W*0.15, W*0.85])
        dt.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), HexColor("#FFF7ED")),
            ("GRID", (0, 0), (-1, -1), 0.5, border_grey),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(dt)

    story.append(Spacer(1, 0.4*cm))

    # Medications
    medications = []
    if prescription.get("medications_json"):
        try:
            medications = _json.loads(prescription["medications_json"])
        except Exception:
            medications = []

    if medications:
        # Column headers
        header_row = [
            Paragraph("#", s("MH", fontSize=9, fontName="Helvetica-Bold", textColor=white, alignment=TA_CENTER)),
            Paragraph("MEDICATION", s("MH2", fontSize=9, fontName="Helvetica-Bold", textColor=white)),
            Paragraph("DOSAGE", s("MH3", fontSize=9, fontName="Helvetica-Bold", textColor=white)),
            Paragraph("FREQUENCY", s("MH4", fontSize=9, fontName="Helvetica-Bold", textColor=white)),
            Paragraph("DURATION", s("MH5", fontSize=9, fontName="Helvetica-Bold", textColor=white)),
            Paragraph("INSTRUCTIONS", s("MH6", fontSize=9, fontName="Helvetica-Bold", textColor=white)),
        ]
        med_rows = [header_row]
        bg_colors = []
        for i, med in enumerate(medications):
            row = [
                Paragraph(str(i+1), s(f"MC{i}", fontSize=10, alignment=TA_CENTER, textColor=text_dark)),
                Paragraph(f"<b>{med.get('name', '')}</b><br/><i style='color:grey;font-size:8pt'>{med.get('generic_name', '')}</i>",
                          s(f"MN{i}", fontSize=10, textColor=text_dark, leading=14)),
                Paragraph(med.get("dosage", ""), s(f"MD{i}", fontSize=10, textColor=text_dark)),
                Paragraph(med.get("frequency", ""), s(f"MF{i}", fontSize=10, textColor=text_dark)),
                Paragraph(med.get("duration", ""), s(f"MDur{i}", fontSize=10, textColor=text_dark)),
                Paragraph(med.get("instructions", ""), s(f"MI{i}", fontSize=9, textColor=text_muted, leading=13)),
            ]
            med_rows.append(row)
            bg_colors.append(("BACKGROUND", (0, i+1), (-1, i+1),
                               HexColor("#F8FAFC") if i % 2 == 0 else HexColor("#FFFFFF")))

        med_table = Table(med_rows, colWidths=[W*0.05, W*0.22, W*0.1, W*0.16, W*0.14, W*0.33])
        table_style = [
            ("BACKGROUND", (0, 0), (-1, 0), primary),
            ("GRID", (0, 0), (-1, -1), 0.5, border_grey),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ] + bg_colors
        med_table.setStyle(TableStyle(table_style))
        story.append(med_table)
    else:
        story.append(Paragraph("No medications prescribed.", s("NM", fontSize=11,
                      textColor=text_muted, alignment=TA_CENTER)))

    # Special instructions
    if prescription.get("notes"):
        story.append(Spacer(1, 0.3*cm))
        ni_data = [[
            Paragraph("SPECIAL INSTRUCTIONS", s("SIL", fontSize=8, fontName="Helvetica-Bold",
                      textColor=text_muted)),
            Paragraph(prescription.get("notes", ""), s("SIV", fontSize=10, textColor=text_dark))
        ]]
        sit = Table(ni_data, colWidths=[W*0.22, W*0.78])
        sit.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), HexColor("#FFFBEB")),
            ("GRID", (0, 0), (-1, -1), 0.5, border_grey),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(sit)

    # Signature
    story.append(Spacer(1, 1.5*cm))
    sig_data = [[
        Paragraph("", s("Empty")),
        Paragraph(
            "_______________________________<br/>"
            f"Dr. {doctor.get('full_name', 'Doctor')}<br/>"
            f"{doctor.get('specialty', '')}<br/>"
            f"Date: {datetime.now().strftime('%d/%m/%Y')}",
            s("Sig", fontSize=10, textColor=text_dark, leading=16, alignment=TA_CENTER)
        )
    ]]
    sig_t = Table(sig_data, colWidths=[W*0.5, W*0.5])
    story.append(sig_t)

    doc.build(story)
    return buf.getvalue()
