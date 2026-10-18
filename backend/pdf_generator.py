"""
Loan Sanction & Assessment Report PDF Generator using ReportLab.
Produces a bank-grade, beautifully formatted official PDF report.
"""
import datetime
import io
from typing import Any, Dict

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def format_inr(amount: float) -> str:
    """Format numerical value as Indian currency string."""
    try:
        val = int(round(amount))
        s = str(abs(val))
        if len(s) <= 3:
            res = s
        else:
            last3 = s[-3:]
            rest = s[:-3]
            groups = []
            while len(rest) > 2:
                groups.insert(0, rest[-2:])
                rest = rest[:-2]
            if rest:
                groups.insert(0, rest)
            res = ",".join(groups) + "," + last3
        prefix = "-Rs. " if val < 0 else "Rs. "
        return prefix + res
    except Exception:
        return f"Rs. {amount:,.0f}"


def generate_sanction_pdf(applicant: Dict[str, Any], result: Dict[str, Any]) -> bytes:
    """Generate official A4 PDF loan assessment / sanction letter."""
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#1e1b4b")
    accent_color = colors.HexColor("#4f46e5")
    dark_text = colors.HexColor("#0f172a")
    muted_text = colors.HexColor("#64748b")
    success_color = colors.HexColor("#059669")
    warning_color = colors.HexColor("#d97706")
    danger_color = colors.HexColor("#dc2626")

    title_style = ParagraphStyle(
        "BankTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=primary_color,
    )

    subtitle_style = ParagraphStyle(
        "BankSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=muted_text,
    )

    doc_name_style = ParagraphStyle(
        "DocName",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=accent_color,
        alignment=1,  # Center
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=dark_text,
    )

    body_bold = ParagraphStyle(
        "BodyBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        textColor=dark_text,
    )

    section_header = ParagraphStyle(
        "SectionHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=primary_color,
    )

    story = []

    # ================= 1. HEADER =================
    header_data = [
        [
            Paragraph("<b>NORTHSTAR FINANCIAL SERVICES</b><br/><font color='#64748b' size='8'>AI Credit Underwriting & Automated Risk Assessment System</font>", title_style),
            Paragraph(f"<b>REF:</b> NS-LON-{datetime.datetime.now().strftime('%Y%m%d%H%M')}<br/><b>Date:</b> {datetime.date.today().strftime('%d %B %Y')}<br/><b>Valid for:</b> 30 Days", ParagraphStyle("Ref", parent=subtitle_style, alignment=2)),
        ]
    ]
    header_table = Table(header_data, colWidths=[330, 190])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=accent_color, spaceBefore=0, spaceAfter=12))

    # Document Title Box
    status = result.get("predicted_status", "Approved")
    status_bg = "#ecfdf5" if status == "Approved" else "#fff1f2"
    status_border = "#a7f3d0" if status == "Approved" else "#fecdd3"
    status_text_color = "#047857" if status == "Approved" else "#b91c1c"

    story.append(Paragraph(f"OFFICIAL PRE-APPROVAL ASSESSMENT & SANCTION MEMORANDUM", doc_name_style))
    story.append(Spacer(1, 8))

    # ================= 2. DECISION BANNER =================
    prob = result.get("approval_probability", 0)
    prob_str = f"{prob * 100:.1f}%" if prob > 0.01 else "< 0.1%"
    risk = result.get("risk", "Low")
    emi = result.get("emi", 0)

    decision_banner_data = [
        [
            Paragraph(f"<b>ASSESSMENT STATUS:</b><br/><font size='14' color='{status_text_color}'><b>{status.upper()}</b></font>", body_style),
            Paragraph(f"<b>APPROVAL CONFIDENCE:</b><br/><font size='14' color='#4f46e5'><b>{prob_str}</b></font>", body_style),
            Paragraph(f"<b>RISK CLASSIFICATION:</b><br/><font size='14' color='#0f172a'><b>{risk} Risk</b></font>", body_style),
            Paragraph(f"<b>MONTHLY EMI:</b><br/><font size='14' color='#0f172a'><b>{format_inr(emi)}</b></font>", body_style),
        ]
    ]
    banner_table = Table(decision_banner_data, colWidths=[130, 130, 130, 130])
    banner_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(status_bg)),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor(status_border)),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor(status_border)),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 14))

    # ================= 3. APPLICANT DETAILS & LOAN FACILITY =================
    income = float(applicant.get("income_annum") or applicant.get("income", 5000000))
    loan_amount = float(applicant.get("loan_amount", 15000000))
    term = int(applicant.get("loan_term") or applicant.get("term", 10))
    cibil = int(applicant.get("cibil_score") or applicant.get("cibil", 650))
    dependents = applicant.get("no_of_dependents") or applicant.get("dependents", 2)
    education = applicant.get("education", "Graduate")
    self_emp = applicant.get("self_employed", "No")

    # Assets
    res_asset = float(applicant.get("residential_assets_value") or applicant.get("residential_assets", 0))
    com_asset = float(applicant.get("commercial_assets_value") or applicant.get("commercial_assets", 0))
    lux_asset = float(applicant.get("luxury_assets_value") or applicant.get("luxury_assets", 0))
    bnk_asset = float(applicant.get("bank_asset_value") or applicant.get("bank_assets", 0))
    total_assets = res_asset + com_asset + lux_asset + bnk_asset

    months = term * 12
    total_repayable = emi * months
    total_interest = total_repayable - loan_amount

    details_data = [
        [
            Paragraph("<b>Applicant Profile</b>", section_header),
            "",
            Paragraph("<b>Loan Facility & Terms</b>", section_header),
            "",
        ],
        [
            Paragraph("Education:", body_style), Paragraph(str(education), body_bold),
            Paragraph("Requested Principal:", body_style), Paragraph(format_inr(loan_amount), body_bold),
        ],
        [
            Paragraph("Employment Type:", body_style), Paragraph("Self-Employed" if self_emp == "Yes" else "Salaried", body_bold),
            Paragraph("Repayment Tenure:", body_style), Paragraph(f"{term} Years ({months} Months)", body_bold),
        ],
        [
            Paragraph("Household Dependents:", body_style), Paragraph(str(dependents), body_bold),
            Paragraph("Indicative Interest Rate:", body_style), Paragraph("10.0% p.a. (Fixed)", body_bold),
        ],
        [
            Paragraph("Annual Gross Income:", body_style), Paragraph(format_inr(income), body_bold),
            Paragraph("Monthly Installment (EMI):", body_style), Paragraph(format_inr(emi), body_bold),
        ],
        [
            Paragraph("CIBIL Credit Score:", body_style), Paragraph(f"<b>{cibil} / 900</b>", body_bold),
            Paragraph("Total Repayment Amount:", body_style), Paragraph(format_inr(total_repayable), body_bold),
        ],
        [
            Paragraph("Total Declared Assets:", body_style), Paragraph(format_inr(total_assets), body_bold),
            Paragraph("Total Interest Payable:", body_style), Paragraph(format_inr(total_interest), body_bold),
        ],
        [
            Paragraph("Liquid Bank Assets:", body_style), Paragraph(format_inr(bnk_asset), body_bold),
            Paragraph("Affordability Status:", body_style), Paragraph(f"<b>{result.get('affordability', 'Medium')} Affordability</b>", body_bold),
        ],
    ]

    details_table = Table(details_data, colWidths=[120, 135, 130, 135])
    details_table.setStyle(TableStyle([
        ("SPAN", (0, 0), (1, 0)),
        ("SPAN", (2, 0), (3, 0)),
        ("BACKGROUND", (0, 0), (1, 0), colors.HexColor("#f8fafc")),
        ("BACKGROUND", (2, 0), (3, 0), colors.HexColor("#f8fafc")),
        ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#cbd5e1")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 1), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
        ("LINEAFTER", (1, 0), (1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(details_table)
    story.append(Spacer(1, 14))

    # ================= 4. UNDERWRITING & EXPLAINABILITY =================
    recommendation_text = result.get("recommendation", "Application evaluated by credit underwriting models.")
    anomaly = result.get("anomaly", False)

    story.append(Paragraph("<b>Underwriting Intelligence & Explainability</b>", section_header))
    story.append(Spacer(1, 4))

    notes_data = [
        [
            Paragraph("<b>Automated Underwriter Recommendation:</b>", body_bold),
            Paragraph(recommendation_text, body_style),
        ],
        [
            Paragraph("<b>Anomaly & Integrity Check:</b>", body_bold),
            Paragraph(
                "<font color='#d97706'><b>Flagged for Manual Verification</b> (unusual pattern detected by Isolation Forest)</font>"
                if anomaly else
                "<font color='#059669'><b>Passed</b> (Application profile is consistent with approved baseline)</font>",
                body_style
            ),
        ],
    ]

    # Include top SHAP factors if available
    shap_list = (result.get("explanations", {}) or {}).get("shap", [])
    if shap_list:
        top_positive = [item["feature"].replace("_", " ").title() for item in shap_list if item["contribution"] > 0][:3]
        top_negative = [item["feature"].replace("_", " ").title() for item in shap_list if item["contribution"] < 0][:3]

        pos_str = ", ".join(top_positive) if top_positive else "None"
        neg_str = ", ".join(top_negative) if top_negative else "None"

        notes_data.append([
            Paragraph("<b>Key Supporting Factors:</b>", body_bold),
            Paragraph(f"<font color='#059669'>{pos_str}</font>", body_style)
        ])
        notes_data.append([
            Paragraph("<b>Key Risk Drivers:</b>", body_bold),
            Paragraph(f"<font color='#dc2626'>{neg_str}</font>", body_style)
        ])

    notes_table = Table(notes_data, colWidths=[180, 340])
    notes_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(notes_table)
    story.append(Spacer(1, 14))

    # ================= 5. MANDATORY KYC REQUIREMENTS =================
    story.append(Paragraph("<b>Required KYC & Verification Documents for Final Disbursement</b>", section_header))
    story.append(Spacer(1, 4))

    kyc_text = (
        "1. Identity & Address Proof (Aadhaar Card, PAN Card, Voter ID)<br/>"
        "2. Income Verification: Last 6 months bank account statements & latest 2 years ITR / Form 16<br/>"
        "3. Property / Asset Documents: Clear title deeds and valuation certificate for declared residential/commercial assets<br/>"
        "4. Employment Verification: Recent salary slips / business registration certificate (if self-employed)"
    )
    story.append(Paragraph(kyc_text, subtitle_style))
    story.append(Spacer(1, 18))

    # ================= 6. SIGN-OFF & WATERMARK =================
    sign_data = [
        [
            Paragraph("<b>Digitally Verified</b><br/><font color='#64748b' size='8'>Northstar Credit Model v1.0<br/>Algorithm: XGBoost + Random Forest</font>", body_style),
            Paragraph("<b>Authorized Credit Officer</b><br/><font color='#64748b' size='8'>Northstar Underwriting Division<br/>Electronic Verification Stamp</font>", ParagraphStyle("RightSign", parent=body_style, alignment=2)),
        ]
    ]
    sign_table = Table(sign_data, colWidths=[260, 260])
    sign_table.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(sign_table)
    story.append(Spacer(1, 12))

    disclaimer = (
        "<i>Disclaimer: This document constitutes an automated pre-approval assessment based on information supplied "
        "by the applicant and processed by predictive machine learning models. Final sanction and disbursement are subject "
        "to satisfactory physical document verification, legal property vetting, and compliance with lending guidelines.</i>"
    )
    story.append(Paragraph(disclaimer, ParagraphStyle("Disc", parent=subtitle_style, fontSize=7, leading=9, textColor=colors.HexColor("#94a3b8"))))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
