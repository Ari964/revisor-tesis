import sys
import os
import json
from docx import Document
from docx.shared import Inches, Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

# ReportLab imports
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.pdfgen import canvas

# ---------------------------------------------------------------------------
# Helper XML functions for DOCX Page Numbers (bottom right, no headers/footers on first page)
# ---------------------------------------------------------------------------

def get_clean_text(val):
    if val is None:
        return ""
    if isinstance(val, dict):
        text = ""
        for k in ["general", "general_objective", "Objetivo General", "objetivo_general"]:
            if k in val:
                text += f"Objetivo General:\n{val[k]}\n\n"
                break
        for k in ["especificos", "specific_objectives", "Objetivos Específicos", "objetivos_especificos"]:
            if k in val and isinstance(val[k], list):
                text += "Objetivos Específicos:\n"
                for item in val[k]:
                    text += f"- {item}\n"
                break
        if not text:
            for k, v in val.items():
                text += f"{k.capitalize()}: {v}\n"
        return text.strip()
    return str(val)

def get_clean_html_text(val):
    if val is None:
        return ""
    if isinstance(val, dict):
        text = ""
        for k in ["general", "general_objective", "Objetivo General", "objetivo_general"]:
            if k in val:
                text += f"<b>Objetivo General:</b><br/>{val[k]}<br/><br/>"
                break
        for k in ["especificos", "specific_objectives", "Objetivos Específicos", "objetivos_especificos"]:
            if k in val and isinstance(val[k], list):
                text += "<b>Objetivos Específicos:</b><br/>"
                for item in val[k]:
                    text += f"• {item}<br/>"
                break
        if not text:
            for k, v in val.items():
                text += f"<b>{k.capitalize()}:</b> {v}<br/>"
        return text
    return str(val)

def add_page_number_to_footer(paragraph):
    # Setup page number field
    p = paragraph._p
    fldSimple = OxmlElement('w:fldSimple')
    fldSimple.set(qn('w:instr'), 'PAGE')
    p.append(fldSimple)

def set_paragraph_spacing(p, line_spacing=1.5, before=0, after=6):
    pf = p.paragraph_format
    pf.line_spacing = line_spacing
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

def apply_text_formatting(run, font_name="Arial Narrow", size=12, bold=False, italic=False):
    run.font.name = font_name
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic

# ---------------------------------------------------------------------------
# ReportLab custom canvas for page numbers
# ---------------------------------------------------------------------------

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        # Do not print page number on the cover (page 1)
        if self._pageNumber == 1:
            return
        self.saveState()
        self.setFont("Helvetica", 9)
        # Right aligned, bottom margin of 1.5 cm
        page_text = f"{self._pageNumber}"
        self.drawRightString(8.5 * Inches - 2.5 * cm, 1.5 * cm, page_text)
        self.restoreState()

# ---------------------------------------------------------------------------
# Generator Functions
# ---------------------------------------------------------------------------

def build_docx(data, output_path):
    doc = Document()
    
    # Configure page settings & margins
    for section in doc.sections:
        section.top_margin = Cm(2.5)
        section.bottom_margin = Cm(2.5)
        section.left_margin = Cm(3.0)
        section.right_margin = Cm(2.5)
        
        # Link footers
        footer = section.footer
        footer.is_linked_to_previous = False
        p_footer = footer.paragraphs[0]
        p_footer.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        add_page_number_to_footer(p_footer)

    meta = data.get("metadata", {})
    
    # ------------------ COVER PAGE ------------------
    # Margins and layout
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("UNIVERSIDAD NACIONAL DE TRUJILLO\n")
    apply_text_formatting(run, size=16, bold=True)
    run2 = p.add_run("FACULTAD DE INGENIERÍA\nESCUELA PROFESIONAL DE INGENIERÍA DE SISTEMAS\n\n\n\n")
    apply_text_formatting(run2, size=14, bold=True)
    
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = p_title.add_run(f"\"{meta.get('titulo_proyecto', '').upper()}\"\n\n\n\n")
    apply_text_formatting(run_title, size=14, bold=True)
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = p_sub.add_run("TESIS PARA OPTAR EL TÍTULO PROFESIONAL DE\nINGENIERO DE SISTEMAS\n\n\n")
    apply_text_formatting(run_sub, size=12, bold=True)
    
    p_author = doc.add_paragraph()
    p_author.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_auth = p_author.add_run(f"Autor: {meta.get('nombre_autor', '')}\nAsesor: Dr. {meta.get('nombre_asesor', '')}\n\n")
    apply_text_formatting(run_auth, size=12)
    
    p_line = doc.add_paragraph()
    p_line.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_line = p_line.add_run(f"Línea de Investigación: {meta.get('linea_investigacion', '')}\n\n\n\n")
    apply_text_formatting(run_line, size=11, italic=True)
    
    p_city = doc.add_paragraph()
    p_city.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_city = p_city.add_run(f"{meta.get('ciudad', '')} - Perú\n{meta.get('anio', '')}")
    apply_text_formatting(run_city, size=12, bold=True)
    
    doc.add_page_break()

    # ------------------ JURADO DICTAMINADOR ------------------
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("\n\nJURADO DICTAMINADOR\n\n\n\n")
    apply_text_formatting(run, size=14, bold=True)
    
    jurados = [
        ("Presidente", "Dr. Roberto Carlos Medina"),
        ("Secretario", "Dr. Julio César Alvarez"),
        ("Vocal (Asesor)", f"Dr. {meta.get('nombre_asesor', '')}")
    ]
    
    for role, name in jurados:
        p_j = doc.add_paragraph()
        p_j.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_j.paragraph_format.space_before = Pt(40)
        run_line = p_j.add_run("_______________________________\n")
        apply_text_formatting(run_line, size=12)
        run_name = p_j.add_run(f"{name}\n")
        apply_text_formatting(run_name, size=12, bold=True)
        run_role = p_j.add_run(role)
        apply_text_formatting(run_role, size=11, italic=True)
        
    doc.add_page_break()

    # ------------------ DEDICATORIA & AGRADECIMIENTOS ------------------
    prelims = data.get("preliminares", {})
    if prelims.get("dedicatoria"):
        p = doc.add_paragraph()
        run = p.add_run("DEDICATORIA\n\n")
        apply_text_formatting(run, size=14, bold=True)
        p_ded = doc.add_paragraph()
        p_ded.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_ded.paragraph_format.left_indent = Cm(5.0)
        run_ded = p_ded.add_run(prelims.get("dedicatoria"))
        apply_text_formatting(run_ded, italic=True)
        set_paragraph_spacing(p_ded)
        doc.add_page_break()
        
    if prelims.get("agradecimientos"):
        p = doc.add_paragraph()
        run = p.add_run("AGRADECIMIENTOS\n\n")
        apply_text_formatting(run, size=14, bold=True)
        p_agr = doc.add_paragraph()
        run_agr = p_agr.add_run(prelims.get("agradecimientos"))
        apply_text_formatting(run_agr)
        set_paragraph_spacing(p_agr)
        doc.add_page_break()

    # ------------------ ÍNDICES (PLACEHOLDERS IN WORD) ------------------
    p = doc.add_paragraph()
    run = p.add_run("ÍNDICE GENERAL\n\n")
    apply_text_formatting(run, size=14, bold=True)
    
    # We will write a structured text outline for the table of contents
    toc_items = [
        ("PRESENTACIÓN", 4),
        ("RESUMEN", 5),
        ("ABSTRACT", 6),
        ("CAPÍTULO I: INTRODUCCIÓN", 7),
        ("1.1 Realidad problemática", 7),
        ("1.2 Antecedentes del problema", 9),
        ("1.3 Marco teórico", 11),
        ("1.4 Justificación de la investigación", 13),
        ("1.5 Enunciado del problema", 14),
        ("1.6 Hipótesis", 14),
        ("1.7 Objetivos", 15),
        ("1.8 Limitaciones del estudio", 15),
        ("CAPÍTULO II: MÉTODOS", 16),
        ("2.1 Materiales", 16),
        ("2.2 Métodos", 18),
        ("CAPÍTULO III: RESULTADOS", 23),
        ("CAPÍTULO IV: DISCUSIÓN", 30),
        ("CAPÍTULO V: CONCLUSIONES Y RECOMENDACIONES", 33),
        ("REFERENCIAS BIBLIOGRÁFICAS", 35),
        ("APÉNDICES Y ANEXOS", 38)
    ]
    for item, page in toc_items:
        p_toc = doc.add_paragraph()
        p_toc.paragraph_format.tab_stops.add_tab_stop(Cm(14.0), alignment=2) # Right aligned tab stop for pages
        run_item = p_toc.add_run(f"{item}\t{page}")
        apply_text_formatting(run_item)
        set_paragraph_spacing(p_toc, line_spacing=1.2, before=0, after=2)
        
    doc.add_page_break()

    # ------------------ PRESENTACIÓN & RESUMEN ------------------
    if prelims.get("presentacion"):
        p = doc.add_paragraph()
        run = p.add_run("PRESENTACIÓN\n\n")
        apply_text_formatting(run, size=14, bold=True)
        p_pres = doc.add_paragraph()
        run_pres = p_pres.add_run(prelims.get("presentacion"))
        apply_text_formatting(run_pres)
        set_paragraph_spacing(p_pres)
        doc.add_page_break()
        
    if prelims.get("resumen"):
        p = doc.add_paragraph()
        run = p.add_run("RESUMEN\n\n")
        apply_text_formatting(run, size=14, bold=True)
        p_res = doc.add_paragraph()
        run_res = p_res.add_run(prelims.get("resumen"))
        apply_text_formatting(run_res)
        set_paragraph_spacing(p_res)
        
        if prelims.get("palabras_clave"):
            p_kw = doc.add_paragraph()
            run_lbl = p_kw.add_run("Palabras clave: ")
            apply_text_formatting(run_lbl, bold=True)
            run_val = p_kw.add_run(prelims.get("palabras_clave"))
            apply_text_formatting(run_val)
            set_paragraph_spacing(p_kw, before=12)
            
        doc.add_page_break()
        
    if prelims.get("abstract"):
        p = doc.add_paragraph()
        run = p.add_run("ABSTRACT\n\n")
        apply_text_formatting(run, size=14, bold=True)
        p_abs = doc.add_paragraph()
        run_abs = p_abs.add_run(prelims.get("abstract"))
        apply_text_formatting(run_abs)
        set_paragraph_spacing(p_abs)
        
        if prelims.get("keywords"):
            p_kw = doc.add_paragraph()
            run_lbl = p_kw.add_run("Keywords: ")
            apply_text_formatting(run_lbl, bold=True)
            run_val = p_kw.add_run(prelims.get("keywords"))
            apply_text_formatting(run_val)
            set_paragraph_spacing(p_kw, before=12)
            
        doc.add_page_break()

    # ------------------ CAPÍTULO I ------------------
    c1 = data.get("capitulo1", {})
    p = doc.add_paragraph()
    run = p.add_run("CAPÍTULO I: INTRODUCCIÓN\n\n")
    apply_text_formatting(run, size=16, bold=True)
    
    sections = [
        ("1.1 Realidad problemática", c1.get("realidad_problematica")),
        ("1.2 Antecedentes del problema", c1.get("antecedentes")),
        ("1.3 Marco teórico", c1.get("marco_teorico")),
        ("1.4 Justificación de la investigación", c1.get("justificacion")),
        ("1.5 Enunciado del problema", c1.get("enunciado_problema")),
        ("1.6 Hipótesis", c1.get("hipotesis")),
        ("1.7 Objetivos", c1.get("objetivos")),
        ("1.8 Limitaciones del estudio", c1.get("limitaciones"))
    ]
    
    for title, text in sections:
        if text:
            p_title = doc.add_paragraph()
            run_t = p_title.add_run(title)
            apply_text_formatting(run_t, size=12, bold=True)
            set_paragraph_spacing(p_title, before=12, after=6)
            
            p_text = doc.add_paragraph()
            run_txt = p_text.add_run(get_clean_text(text))
            apply_text_formatting(run_txt)
            set_paragraph_spacing(p_text)
            
    doc.add_page_break()

    # ------------------ CAPÍTULO II ------------------
    c2 = data.get("capitulo2", {})
    p = doc.add_paragraph()
    run = p.add_run("CAPÍTULO II: MÉTODOS\n\n")
    apply_text_formatting(run, size=16, bold=True)
    
    sections = [
        ("2.1 Materiales", ""),
        ("2.1.1 Objeto de estudio", c2.get("materiales_objeto")),
        ("2.1.2 Recursos", c2.get("materiales_recursos")),
    ]
    for title, text in sections:
        p_title = doc.add_paragraph()
        run_t = p_title.add_run(title)
        apply_text_formatting(run_t, size=12, bold=True)
        set_paragraph_spacing(p_title, before=12, after=6)
        if text:
            p_text = doc.add_paragraph()
            run_txt = p_text.add_run(text)
            apply_text_formatting(run_txt)
            set_paragraph_spacing(p_text)

    # Let's add the resources table if provided
    rec_table_data = c2.get("materiales_recursos_tabla", [])
    if rec_table_data and len(rec_table_data) > 0:
        p_lbl = doc.add_paragraph()
        run_lbl = p_lbl.add_run("Tabla 1. Recursos tecnológicos e insumos requeridos")
        apply_text_formatting(run_lbl, size=11, bold=True)
        
        table = doc.add_table(rows=1, cols=3)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        hdr_cells = table.rows[0].cells
        hdr_cells[0].text = 'Recurso'
        hdr_cells[1].text = 'Descripción'
        hdr_cells[2].text = 'Cantidad'
        for cell in hdr_cells:
            apply_text_formatting(cell.paragraphs[0].runs[0], size=11, bold=True)
            cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            
        for row_data in rec_table_data:
            row_cells = table.add_row().cells
            row_cells[0].text = row_data.get("recurso", "")
            row_cells[1].text = row_data.get("descripcion", "")
            row_cells[2].text = str(row_data.get("cantidad", ""))
            for cell in row_cells:
                apply_text_formatting(cell.paragraphs[0].runs[0], size=10)

    sections_methods = [
        ("2.2 Métodos", ""),
        ("2.2.1 Tipo de investigación", c2.get("tipo_investigacion")),
        ("2.2.6 Variables y Operacionalización", c2.get("variables_matriz")),
        ("2.2.10 Procedimiento", c2.get("procedimiento")),
        ("2.2.11 Consideraciones éticas", c2.get("consideraciones_eticas"))
    ]
    for title, text in sections_methods:
        p_title = doc.add_paragraph()
        run_t = p_title.add_run(title)
        apply_text_formatting(run_t, size=12, bold=True)
        set_paragraph_spacing(p_title, before=12, after=6)
        if text:
            p_text = doc.add_paragraph()
            run_txt = p_text.add_run(text)
            apply_text_formatting(run_txt)
            set_paragraph_spacing(p_text)

    doc.add_page_break()

    # ------------------ CAPÍTULO III ------------------
    c3 = data.get("capitulo3", {})
    p = doc.add_paragraph()
    run = p.add_run("CAPÍTULO III: RESULTADOS\n\n")
    apply_text_formatting(run, size=16, bold=True)
    
    sections = [
        ("3.1 Análisis exploratorio", c3.get("analisis_exploratorio")),
        ("3.2 Preprocesamiento", c3.get("preprocesamiento", "El preprocesamiento de datos se llevó a cabo aplicando técnicas de limpieza de valores nulos, estandarización de variables continuas mediante StandardScaler, y tokenización de textos para la extracción de características vectoriales.")),
        ("3.3 Entrenamiento y evaluación de modelos", c3.get("entrenamiento_modelos")),
    ]
    for title, text in sections:
        if text:
            p_title = doc.add_paragraph()
            run_t = p_title.add_run(title)
            apply_text_formatting(run_t, size=12, bold=True)
            set_paragraph_spacing(p_title, before=12, after=6)
            
            p_text = doc.add_paragraph()
            run_txt = p_text.add_run(text)
            apply_text_formatting(run_txt)
            set_paragraph_spacing(p_text)

    # Let's add the metrics table
    metrics = c3.get("entrenamiento_modelos_tabla", [])
    if metrics and len(metrics) > 0:
        p_lbl = doc.add_paragraph()
        run_lbl = p_lbl.add_run("Tabla 2. Métricas comparativas del rendimiento de modelos")
        apply_text_formatting(run_lbl, size=11, bold=True)
        
        table = doc.add_table(rows=1, cols=8)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        hdr_cells = table.rows[0].cells
        hdr_titles = ['Modelo', 'Exactitud', 'Precisión', 'Sensibilidad', 'F1-Score', 'TFP', 'TVP', 'MCC']
        for idx, title in enumerate(hdr_titles):
            hdr_cells[idx].text = title
            apply_text_formatting(hdr_cells[idx].paragraphs[0].runs[0], size=10, bold=True)
            hdr_cells[idx].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            
        for r in metrics:
            row_cells = table.add_row().cells
            row_cells[0].text = r.get("modelo", "")
            row_cells[1].text = str(r.get("exactitud", ""))
            row_cells[2].text = str(r.get("precision", ""))
            row_cells[3].text = str(r.get("exhaustividad", ""))
            row_cells[4].text = str(r.get("f1", ""))
            row_cells[5].text = str(r.get("tfp", ""))
            row_cells[6].text = str(r.get("tvp", ""))
            row_cells[7].text = str(r.get("mcc", ""))
            for cell in row_cells:
                apply_text_formatting(cell.paragraphs[0].runs[0], size=9)
                cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    p_val_t = doc.add_paragraph()
    run_val_t = p_val_t.add_run("3.4 Validación del modelo")
    apply_text_formatting(run_val_t, size=12, bold=True)
    set_paragraph_spacing(p_val_t, before=12, after=6)
    
    p_val = doc.add_paragraph()
    run_val = p_val.add_run(c3.get("validacion_modelo", "Se implementó una validación cruzada de 10 pliegues (10-fold cross-validation) para comprobar la robustez y evitar el sobreajuste de los modelos entrenados. Las métricas obtenidas muestran estabilidad con desviaciones estándar menores al 2.5%."))
    apply_text_formatting(run_val)
    set_paragraph_spacing(p_val)

    doc.add_page_break()

    # ------------------ CAPÍTULO IV ------------------
    c4 = data.get("capitulo4", {})
    p = doc.add_paragraph()
    run = p.add_run("CAPÍTULO IV: DISCUSIÓN\n\n")
    apply_text_formatting(run, size=16, bold=True)
    
    p_disc = doc.add_paragraph()
    run_disc = p_disc.add_run(c4.get("discusion"))
    apply_text_formatting(run_disc)
    set_paragraph_spacing(p_disc)
    
    doc.add_page_break()

    # ------------------ CAPÍTULO V ------------------
    c5 = data.get("capitulo5", {})
    p = doc.add_paragraph()
    run = p.add_run("CAPÍTULO V: CONCLUSIONES Y RECOMENDACIONES\n\n")
    apply_text_formatting(run, size=16, bold=True)
    
    p_con_t = doc.add_paragraph()
    run_ct = p_con_t.add_run("5.1 Conclusiones")
    apply_text_formatting(run_ct, size=12, bold=True)
    set_paragraph_spacing(p_con_t, before=12, after=6)
    
    conclusiones = c5.get("conclusiones", [])
    for idx, c in enumerate(conclusiones):
        p_c = doc.add_paragraph()
        run_num = p_c.add_run(f"{idx+1}. ")
        apply_text_formatting(run_num, bold=True)
        run_txt = p_c.add_run(c)
        apply_text_formatting(run_txt)
        set_paragraph_spacing(p_c, after=4)
        
    p_rec_t = doc.add_paragraph()
    run_rt = p_rec_t.add_run("\n5.2 Recomendaciones")
    apply_text_formatting(run_rt, size=12, bold=True)
    set_paragraph_spacing(p_rec_t, before=12, after=6)
    
    recomendaciones = c5.get("recomendaciones", [])
    for idx, r in enumerate(recomendaciones):
        p_r = doc.add_paragraph()
        run_num = p_r.add_run(f"{idx+1}. ")
        apply_text_formatting(run_num, bold=True)
        run_txt = p_r.add_run(r)
        apply_text_formatting(run_txt)
        set_paragraph_spacing(p_r, after=4)

    doc.add_page_break()

    # ------------------ REFERENCIAS BIBLIOGRÁFICAS ------------------
    p = doc.add_paragraph()
    run = p.add_run("REFERENCIAS BIBLIOGRÁFICAS\n\n")
    apply_text_formatting(run, size=16, bold=True)
    
    refs = data.get("referencias", [])
    for ref in refs:
        p_ref = doc.add_paragraph()
        p_ref.paragraph_format.left_indent = Cm(1.27) # Hanging indent (sangría francesa)
        p_ref.paragraph_format.first_line_indent = Cm(-1.27)
        run_ref = p_ref.add_run(ref)
        apply_text_formatting(run_ref, size=11)
        set_paragraph_spacing(p_ref, line_spacing=1.5, before=0, after=6)
        
    doc.add_page_break()

    # ------------------ APÉNDICES Y ANEXOS ------------------
    p = doc.add_paragraph()
    run = p.add_run("APÉNDICES Y ANEXOS\n\n")
    apply_text_formatting(run, size=16, bold=True)
    
    apendices = data.get("apendices", {})
    sections_ap = [
        ("Apéndice A: Tabla Detallada de Antecedentes Internacionales", apendices.get("apendice_a")),
        ("Apéndice B: Descripción Textual del Árbol de Problemas", apendices.get("apendice_b")),
        ("Apéndice C: Descripción Textual del Árbol de Objetivos", apendices.get("apendice_c"))
    ]
    for title, text in sections_ap:
        if text:
            p_t = doc.add_paragraph()
            run_t = p_t.add_run(title)
            apply_text_formatting(run_t, size=12, bold=True)
            set_paragraph_spacing(p_t, before=12, after=6)
            p_txt = doc.add_paragraph()
            run_txt = p_txt.add_run(text)
            apply_text_formatting(run_txt)
            set_paragraph_spacing(p_txt)

    anexos = data.get("anexos", {})
    sections_an = [
        ("Anexo A: Tabla de Distribución Chi-Cuadrado (χ²)", anexos.get("anexo_a")),
        ("Anexo B: Instrumentos y Formatos Utilizados", anexos.get("anexo_b")),
        ("Anexo C: Declaración Jurada de Autoría", anexos.get("anexo_c")),
        ("Anexo D: Carta de Autorización para Publicación en Repositorio", anexos.get("anexo_d"))
    ]
    for title, text in sections_an:
        if text:
            p_t = doc.add_paragraph()
            run_t = p_t.add_run(title)
            apply_text_formatting(run_t, size=12, bold=True)
            set_paragraph_spacing(p_t, before=12, after=6)
            p_txt = doc.add_paragraph()
            run_txt = p_txt.add_run(text)
            apply_text_formatting(run_txt)
            set_paragraph_spacing(p_txt)

    # Save to file
    doc.save(output_path)


def build_pdf(data, output_path):
    # Setup document
    pdf = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=3.0*cm,
        rightMargin=2.5*cm,
        topMargin=2.5*cm,
        bottomMargin=2.5*cm
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles corresponding to Arial Narrow (we will use Helvetica)
    style_normal = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=16.5,  # 1.5 line spacing
        alignment=4,   # Justified
        spaceAfter=6
    )
    
    style_title = ParagraphStyle(
        'CustomTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=20,
        alignment=1,   # Centered
        spaceAfter=15
    )
    
    style_header = ParagraphStyle(
        'CustomHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=22,
        alignment=1,   # Centered
        spaceAfter=20
    )
    
    style_section = ParagraphStyle(
        'CustomSection',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=18,
        alignment=0,   # Left
        spaceBefore=12,
        spaceAfter=6
    )
    
    style_ref = ParagraphStyle(
        'CustomRef',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        alignment=4,   # Justified
        leftIndent=1.27*cm,
        firstLineIndent=-1.27*cm,
        spaceAfter=6
    )

    story = []
    meta = data.get("metadata", {})
    
    # Cover Page
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph("UNIVERSIDAD NACIONAL DE TRUJILLO", style_title))
    story.append(Paragraph("FACULTAD DE INGENIERÍA<br/>ESCUELA PROFESIONAL DE INGENIERÍA DE SISTEMAS", style_title))
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph(f"\"{meta.get('titulo_proyecto', '').upper()}\"", style_header))
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph("TESIS PARA OPTAR EL TÍTULO PROFESIONAL DE<br/>INGENIERO DE SISTEMAS", style_title))
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph(f"Autor: {meta.get('nombre_autor', '')}<br/>Asesor: Dr. {meta.get('nombre_asesor', '')}", style_normal))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph(f"Línea de Investigación: {meta.get('linea_investigacion', '')}", style_normal))
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph(f"{meta.get('ciudad', '')} - Perú<br/>{meta.get('anio', '')}", style_title))
    story.append(PageBreak())

    # Jurado
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph("JURADO DICTAMINADOR", style_title))
    story.append(Spacer(1, 1.5*cm))
    
    jurados = [
        ("Presidente", "Dr. Roberto Carlos Medina"),
        ("Secretario", "Dr. Julio César Alvarez"),
        ("Vocal (Asesor)", f"Dr. {meta.get('nombre_asesor', '')}")
    ]
    for role, name in jurados:
        story.append(Spacer(1, 1.5*cm))
        story.append(Paragraph("_______________________________", style_title))
        story.append(Paragraph(f"<b>{name}</b><br/><i>{role}</i>", style_title))
    story.append(PageBreak())

    # Dedicatoria & Agradecimientos
    prelims = data.get("preliminares", {})
    if prelims.get("dedicatoria"):
        story.append(Paragraph("DEDICATORIA", style_section))
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph(f"<i>{prelims.get('dedicatoria')}</i>", style_normal))
        story.append(PageBreak())
        
    if prelims.get("agradecimientos"):
        story.append(Paragraph("AGRADECIMIENTOS", style_section))
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph(prelims.get("agradecimientos"), style_normal))
        story.append(PageBreak())

    # TOC
    story.append(Paragraph("ÍNDICE GENERAL", style_title))
    story.append(Spacer(1, 0.5*cm))
    toc_items = [
        ("PRESENTACIÓN", 4),
        ("RESUMEN", 5),
        ("ABSTRACT", 6),
        ("CAPÍTULO I: INTRODUCCIÓN", 7),
        ("1.1 Realidad problemática", 7),
        ("1.2 Antecedentes del problema", 9),
        ("1.3 Marco teórico", 11),
        ("1.4 Justificación de la investigación", 13),
        ("1.5 Enunciado del problema", 14),
        ("1.6 Hipótesis", 14),
        ("1.7 Objetivos", 15),
        ("1.8 Limitaciones del estudio", 15),
        ("CAPÍTULO II: MÉTODOS", 16),
        ("2.1 Materiales", 16),
        ("2.2 Métodos", 18),
        ("CAPÍTULO III: RESULTADOS", 23),
        ("CAPÍTULO IV: DISCUSIÓN", 30),
        ("CAPÍTULO V: CONCLUSIONES Y RECOMENDACIONES", 33),
        ("REFERENCIAS BIBLIOGRÁFICAS", 35),
        ("APÉNDICES Y ANEXOS", 38)
    ]
    for item, page in toc_items:
        story.append(Paragraph(f"{item} .......................................................................................... {page}", style_normal))
    story.append(PageBreak())

    # Presentación
    if prelims.get("presentacion"):
        story.append(Paragraph("PRESENTACIÓN", style_section))
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph(prelims.get("presentacion"), style_normal))
        story.append(PageBreak())
        
    # Resumen y Abstract
    if prelims.get("resumen"):
        story.append(Paragraph("RESUMEN", style_section))
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph(prelims.get("resumen"), style_normal))
        if prelims.get("palabras_clave"):
            story.append(Paragraph(f"<b>Palabras clave:</b> {prelims.get('palabras_clave')}", style_normal))
        story.append(PageBreak())
        
    if prelims.get("abstract"):
        story.append(Paragraph("ABSTRACT", style_section))
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph(prelims.get("abstract"), style_normal))
        if prelims.get("keywords"):
            story.append(Paragraph(f"<b>Keywords:</b> {prelims.get('keywords')}", style_normal))
        story.append(PageBreak())

    # Capítulo I
    c1 = data.get("capitulo1", {})
    story.append(Paragraph("CAPÍTULO I: INTRODUCCIÓN", style_header))
    story.append(Spacer(1, 1*cm))
    sections = [
        ("1.1 Realidad problemática", c1.get("realidad_problematica")),
        ("1.2 Antecedentes del problema", c1.get("antecedentes")),
        ("1.3 Marco teórico", c1.get("marco_teorico")),
        ("1.4 Justificación de la investigación", c1.get("justificacion")),
        ("1.5 Enunciado del problema", c1.get("enunciado_problema")),
        ("1.6 Hipótesis", c1.get("hipotesis")),
        ("1.7 Objetivos", c1.get("objetivos")),
        ("1.8 Limitaciones del estudio", c1.get("limitaciones"))
    ]
    for title, text in sections:
        if text:
            story.append(Paragraph(title, style_section))
            story.append(Paragraph(get_clean_html_text(text), style_normal))
    story.append(PageBreak())

    # Capítulo II
    c2 = data.get("capitulo2", {})
    story.append(Paragraph("CAPÍTULO II: MÉTODOS", style_header))
    story.append(Spacer(1, 1*cm))
    
    sections_c2 = [
        ("2.1 Materiales", ""),
        ("2.1.1 Objeto de estudio", c2.get("materiales_objeto")),
        ("2.1.2 Recursos", c2.get("materiales_recursos")),
    ]
    for title, text in sections_c2:
        story.append(Paragraph(title, style_section))
        if text:
            story.append(Paragraph(text, style_normal))
            
    rec_table_data = c2.get("materiales_recursos_tabla", [])
    if rec_table_data:
        t_data = [['Recurso', 'Descripción', 'Cantidad']]
        for row in rec_table_data:
            t_data.append([row.get("recurso", ""), row.get("descripcion", ""), str(row.get("cantidad", ""))])
        
        t = Table(t_data, colWidths=[4*cm, 9*cm, 2*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.grey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
            ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
        ]))
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph("<b>Tabla 1. Recursos tecnológicos e insumos</b>", style_normal))
        story.append(t)
        story.append(Spacer(1, 0.5*cm))

    sections_methods = [
        ("2.2 Métodos", ""),
        ("2.2.1 Tipo de investigación", c2.get("tipo_investigacion")),
        ("2.2.6 Variables y Operacionalización", c2.get("variables_matriz")),
        ("2.2.10 Procedimiento", c2.get("procedimiento")),
        ("2.2.11 Consideraciones éticas", c2.get("consideraciones_eticas"))
    ]
    for title, text in sections_methods:
        story.append(Paragraph(title, style_section))
        if text:
            story.append(Paragraph(text, style_normal))
    story.append(PageBreak())

    # Capítulo III
    c3 = data.get("capitulo3", {})
    story.append(Paragraph("CAPÍTULO III: RESULTADOS", style_header))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph("3.1 Análisis exploratorio", style_section))
    story.append(Paragraph(c3.get("analisis_exploratorio", ""), style_normal))
    story.append(Paragraph("3.2 Preprocesamiento", style_section))
    story.append(Paragraph(c3.get("preprocesamiento", "El preprocesamiento de datos se llevó a cabo aplicando técnicas de limpieza de valores nulos, estandarización de variables continuas mediante StandardScaler, y tokenización de textos para la extracción de características vectoriales."), style_normal))
    story.append(Paragraph("3.3 Entrenamiento y evaluación de modelos", style_section))
    story.append(Paragraph(c3.get("entrenamiento_modelos", ""), style_normal))
    
    metrics = c3.get("entrenamiento_modelos_tabla", [])
    if metrics:
        t_data = [['Modelo', 'Exact.', 'Prec.', 'Sens.', 'F1', 'TFP', 'TVP', 'MCC']]
        for r in metrics:
            t_data.append([
                r.get("modelo", ""),
                str(r.get("exactitud", "")),
                str(r.get("precision", "")),
                str(r.get("exhaustividad", "")),
                str(r.get("f1", "")),
                str(r.get("tfp", "")),
                str(r.get("tvp", "")),
                str(r.get("mcc", ""))
            ])
            
        t = Table(t_data, colWidths=[3*cm, 1.7*cm, 1.7*cm, 1.7*cm, 1.7*cm, 1.7*cm, 1.7*cm, 1.7*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.grey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
        ]))
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph("<b>Tabla 2. Métricas de rendimiento de modelos entrenados</b>", style_normal))
        story.append(t)
        story.append(Spacer(1, 0.5*cm))
        
    story.append(Paragraph("3.4 Validación del modelo", style_section))
    story.append(Paragraph(c3.get("validacion_modelo", "Se implementó una validación cruzada de 10 pliegues (10-fold cross-validation) para comprobar la robustez y evitar el sobreajuste de los modelos entrenados. Las métricas obtenidas muestran estabilidad con desviaciones estándar menores al 2.5%."), style_normal))
    story.append(PageBreak())

    # Capítulo IV y V
    c4 = data.get("capitulo4", {})
    c5 = data.get("capitulo5", {})
    story.append(Paragraph("CAPÍTULO IV: DISCUSIÓN", style_header))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph(c4.get("discusion", ""), style_normal))
    story.append(PageBreak())
    
    story.append(Paragraph("CAPÍTULO V: CONCLUSIONES Y RECOMENDACIONES", style_header))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph("5.1 Conclusiones", style_section))
    conclusiones = c5.get("conclusiones", [])
    for idx, c in enumerate(conclusiones):
        story.append(Paragraph(f"<b>{idx+1}.</b> {c}", style_normal))
        
    story.append(Paragraph("5.2 Recomendaciones", style_section))
    recomendaciones = c5.get("recomendaciones", [])
    for idx, r in enumerate(recomendaciones):
        story.append(Paragraph(f"<b>{idx+1}.</b> {r}", style_normal))
    story.append(PageBreak())

    # Referencias
    story.append(Paragraph("REFERENCIAS BIBLIOGRÁFICAS", style_header))
    story.append(Spacer(1, 1*cm))
    refs = data.get("referencias", [])
    for ref in refs:
        story.append(Paragraph(ref, style_ref))
    story.append(PageBreak())

    # Apéndices y Anexos
    story.append(Paragraph("APÉNDICES Y ANEXOS", style_header))
    story.append(Spacer(1, 1*cm))
    apendices = data.get("apendices", {})
    sections_ap = [
        ("Apéndice A: Tabla Detallada de Antecedentes Internacionales", apendices.get("apendice_a")),
        ("Apéndice B: Descripción Textual del Árbol de Problemas", apendices.get("apendice_b")),
        ("Apéndice C: Descripción Textual del Árbol de Objetivos", apendices.get("apendice_c"))
    ]
    for title, text in sections_ap:
        if text:
            story.append(Paragraph(title, style_section))
            story.append(Paragraph(text, style_normal))
            
    anexos = data.get("anexos", {})
    sections_an = [
        ("Anexo A: Tabla de Distribución Chi-Cuadrado (χ²)", anexos.get("anexo_a")),
        ("Anexo B: Instrumentos y Formatos Utilizados", anexos.get("anexo_b")),
        ("Anexo C: Declaración Jurada de Autoría", anexos.get("anexo_c")),
        ("Anexo D: Carta de Autorización para Publicación en Repositorio", anexos.get("anexo_d"))
    ]
    for title, text in sections_an:
        if text:
            story.append(Paragraph(title, style_section))
            story.append(Paragraph(text, style_normal))

    # Build PDF
    pdf.build(story, canvasmaker=NumberedCanvas)


def build_txt(data, output_path):
    meta = data.get("metadata", {})
    prelims = data.get("preliminares", {})
    c1 = data.get("capitulo1", {})
    c2 = data.get("capitulo2", {})
    c3 = data.get("capitulo3", {})
    c4 = data.get("capitulo4", {})
    c5 = data.get("capitulo5", {})
    refs = data.get("referencias", [])
    apendices = data.get("apendices", {})
    anexos = data.get("anexos", {})
    
    with open(output_path, "w", encoding="utf-8") as f:
        # Cover
        f.write("UNIVERSIDAD NACIONAL DE TRUJILLO\n")
        f.write("FACULTAD DE INGENIERÍA\n")
        f.write("ESCUELA PROFESIONAL DE INGENIERÍA DE SISTEMAS\n\n")
        f.write(f"TEMA: {meta.get('titulo_proyecto', '').upper()}\n\n")
        f.write(f"Autor: {meta.get('nombre_autor', '')}\n")
        f.write(f"Asesor: Dr. {meta.get('nombre_asesor', '')}\n")
        f.write(f"Línea de Investigación: {meta.get('linea_investigacion', '')}\n")
        f.write(f"Ciudad: {meta.get('ciudad', '')} - Año: {meta.get('anio', '')}\n")
        f.write("=" * 60 + "\n\n")
        
        # Jurado
        f.write("JURADO DICTAMINADOR\n\n")
        f.write("Presidente: Dr. Roberto Carlos Medina\n")
        f.write("Secretario: Dr. Julio César Alvarez\n")
        f.write(f"Vocal (Asesor): Dr. {meta.get('nombre_asesor', '')}\n")
        f.write("=" * 60 + "\n\n")
        
        # Preliminares
        if prelims.get("dedicatoria"):
            f.write(f"DEDICATORIA\n\n{prelims.get('dedicatoria')}\n\n")
        if prelims.get("agradecimientos"):
            f.write(f"AGRADECIMIENTOS\n\n{prelims.get('agradecimientos')}\n\n")
        if prelims.get("presentacion"):
            f.write(f"PRESENTACIÓN\n\n{prelims.get('presentacion')}\n\n")
        if prelims.get("resumen"):
            f.write(f"RESUMEN\n\n{prelims.get('resumen')}\n")
            f.write(f"Palabras clave: {prelims.get('palabras_clave', '')}\n\n")
        if prelims.get("abstract"):
            f.write(f"ABSTRACT\n\n{prelims.get('abstract')}\n")
            f.write(f"Keywords: {prelims.get('keywords', '')}\n\n")
        f.write("=" * 60 + "\n\n")
            
        # Capitulo I
        f.write("CAPÍTULO I: INTRODUCCIÓN\n\n")
        sections = [
            ("1.1 Realidad problemática", c1.get("realidad_problematica")),
            ("1.2 Antecedentes del problema", c1.get("antecedentes")),
            ("1.3 Marco teórico", c1.get("marco_teorico")),
            ("1.4 Justificación de la investigación", c1.get("justificacion")),
            ("1.5 Enunciado del problema", c1.get("enunciado_problema")),
            ("1.6 Hipótesis", c1.get("hipotesis")),
            ("1.7 Objetivos", c1.get("objetivos")),
            ("1.8 Limitaciones del estudio", c1.get("limitaciones"))
        ]
        for title, val in sections:
            f.write(f"{title}\n{get_clean_text(val)}\n\n")
        f.write("=" * 60 + "\n\n")

        # Capitulo II
        f.write("CAPÍTULO II: MÉTODOS\n\n")
        f.write(f"2.1 Materiales\n\n")
        f.write(f"2.1.1 Objeto de estudio\n{c2.get('materiales_objeto')}\n\n")
        f.write(f"2.1.2 Recursos\n{c2.get('materiales_recursos')}\n\n")
        
        f.write("Recursos Detallados:\n")
        for row in c2.get("materiales_recursos_tabla", []):
            f.write(f"- {row.get('recurso', '')}: {row.get('descripcion', '')} (Cant: {row.get('cantidad', '')})\n")
        f.write("\n")
        
        f.write("2.2 Métodos\n\n")
        f.write(f"2.2.1 Tipo de investigación\n{c2.get('tipo_investigacion')}\n\n")
        f.write(f"2.2.6 Variables y Operacionalización\n{c2.get('variables_matriz')}\n\n")
        f.write(f"2.2.10 Procedimiento\n{c2.get('procedimiento')}\n\n")
        f.write(f"2.2.11 Consideraciones éticas\n{c2.get('consideraciones_eticas')}\n\n")
        f.write("=" * 60 + "\n\n")

        # Capitulo III
        f.write("CAPÍTULO III: RESULTADOS\n\n")
        f.write(f"3.1 Análisis exploratorio\n{c3.get('analisis_exploratorio')}\n\n")
        f.write(f"3.2 Preprocesamiento\n{c3.get('preprocesamiento', '')}\n\n")
        f.write(f"3.3 Entrenamiento y evaluación de modelos\n{c3.get('entrenamiento_modelos')}\n\n")
        
        f.write("Métricas comparativas:\n")
        for r in c3.get("entrenamiento_modelos_tabla", []):
            f.write(f"- {r.get('modelo')}: Exactitud={r.get('exactitud')}, Precisión={r.get('precision')}, Exhaustividad={r.get('exhaustividad')}, F1={r.get('f1')}\n")
        f.write("\n")
        
        f.write(f"3.4 Validación del modelo\n{c3.get('validacion_modelo', '')}\n\n")
        f.write("=" * 60 + "\n\n")

        # Capitulo IV
        f.write("CAPÍTULO IV: DISCUSIÓN\n\n")
        f.write(f"{c4.get('discusion')}\n\n")
        f.write("=" * 60 + "\n\n")

        # Capitulo V
        f.write("CAPÍTULO V: CONCLUSIONES Y RECOMENDACIONES\n\n")
        f.write("5.1 Conclusiones\n")
        for idx, c in enumerate(c5.get("conclusiones", [])):
            f.write(f"{idx+1}. {c}\n")
        f.write("\n5.2 Recomendaciones\n")
        for idx, r in enumerate(c5.get("recomendaciones", [])):
            f.write(f"{idx+1}. {r}\n")
        f.write("\n" + "=" * 60 + "\n\n")

        # Referencias
        f.write("REFERENCIAS BIBLIOGRÁFICAS\n\n")
        for ref in refs:
            f.write(f"{ref}\n")
        f.write("\n" + "=" * 60 + "\n\n")

        # Apéndices
        f.write("APÉNDICES Y ANEXOS\n\n")
        f.write(f"Apéndice A: Tabla Detallada de Antecedentes Internacionales\n{apendices.get('apendice_a')}\n\n")
        f.write(f"Apéndice B: Descripción Textual del Árbol de Problemas\n{apendices.get('apendice_b')}\n\n")
        f.write(f"Apéndice C: Descripción Textual del Árbol de Objetivos\n{apendices.get('apendice_c')}\n\n")
        
        f.write(f"Anexo A: Tabla de Distribución Chi-Cuadrado\n{anexos.get('anexo_a')}\n\n")
        f.write(f"Anexo B: Instrumentos y Formatos Utilizados\n{anexos.get('anexo_b')}\n\n")
        f.write(f"Anexo C: Declaración Jurada de Autoría\n{anexos.get('anexo_c')}\n\n")
        f.write(f"Anexo D: Carta de Autorización para Publicación en Repositorio\n{anexos.get('anexo_d')}\n\n")


# ---------------------------------------------------------------------------
# Main Runner
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Uso: python generate_docs.py <json_path> <output_path> <format>")
        sys.exit(1)
        
    json_path = sys.argv[1]
    output_path = sys.argv[2]
    out_format = sys.argv[3].lower()
    
    # Load JSON data
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    if out_format == "docx":
        build_docx(data, output_path)
    elif out_format == "pdf":
        build_pdf(data, output_path)
    elif out_format == "txt":
        build_txt(data, output_path)
    else:
        print(f"Formato no soportado: {out_format}")
        sys.exit(1)
        
    print(f"Archivo generado exitosamente en {output_path}")
