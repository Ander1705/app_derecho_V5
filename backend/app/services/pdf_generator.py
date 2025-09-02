"""Generador de PDFs para controles operativos del consultorio jurídico."""

import io
import os
import tempfile
from datetime import datetime
from typing import Optional

from PyPDF2 import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.colors import black
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import legal
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models.control_operativo import ControlOperativo
from app.models.documento import Documento


class NumberedCanvas(canvas.Canvas):
    """Canvas personalizado que agrega numeración automática a los PDFs."""

    def __init__(self, *args, pdf_id=None, **kwargs):
        """Inicializar canvas con ID del PDF.

        Args:
            pdf_id: ID del control operativo para numeración
            *args: Argumentos del canvas base
            **kwargs: Argumentos del canvas base
        """
        super().__init__(*args, **kwargs)
        self.pdf_id = pdf_id

    def draw_page_number(self):
        """Dibujar número de PDF en esquina superior derecha con formato mejorado."""
        if self.pdf_id:
            # Fondo semitransparente para mejor legibilidad
            self.setFillColor(colors.white, alpha=0.9)
            self.setStrokeColor(colors.black)
            
            # Calcular posición y tamaño del recuadro
            text = f"PDF #{self.pdf_id}"
            self.setFont("Helvetica-Bold", 10)
            text_width = self.stringWidth(text, "Helvetica-Bold", 10)
            
            # Posición en esquina superior derecha
            x_pos = self._pagesize[0] - 0.5 * inch - text_width - 8
            y_pos = self._pagesize[1] - 0.3 * inch - 6
            
            # Dibujar recuadro con borde
            self.rect(x_pos - 4, y_pos - 2, text_width + 8, 16, fill=1, stroke=1)
            
            # Dibujar texto del número de PDF
            self.setFillColor(colors.black)
            self.drawString(x_pos, y_pos + 2, text)

    def showPage(self):
        """Override para agregar numeración en cada página."""
        self.draw_page_number()
        super().showPage()


class ControlOperativoPDFGenerator:
    """Generador de PDFs para controles operativos."""

    def __init__(self):
        """Inicializar el generador con configuración de páginas y estilos."""
        self.page_width, self.page_height = legal
        self.margins = {
            'left': 0.5 * inch,
            'right': 0.5 * inch,
            'top': 0.4 * inch,
            'bottom': 0.5 * inch
        }
        self.content_width = (
            self.page_width - self.margins['left'] - self.margins['right']
        )
        self._temp_files_to_cleanup = []
        self.setup_styles()

    def setup_styles(self):
        """Configurar todos los estilos de texto para el PDF."""
        styles = getSampleStyleSheet()

        # Título principal
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=11,
            textColor=black,
            alignment=TA_CENTER,
            spaceAfter=6,
            fontName='Helvetica-Bold'
        )

        # Estilo universitario
        self.university_style = ParagraphStyle(
            'UniversityStyle',
            parent=styles['Normal'],
            fontSize=9,
            textColor=black,
            alignment=TA_CENTER,
            spaceAfter=2,
            fontName='Helvetica-Bold'
        )

        # Estilo de sección
        self.section_style = ParagraphStyle(
            'SectionStyle',
            parent=styles['Normal'],
            fontSize=8,
            textColor=black,
            alignment=TA_LEFT,
            spaceAfter=0,
            spaceBefore=2,
            fontName='Helvetica-Bold',
            leftIndent=2,
            rightIndent=2
        )

        # Estilo normal
        self.normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=8,
            textColor=black,
            alignment=TA_LEFT,
            fontName='Helvetica',
            wordWrap='CJK'
        )

        # Estilo para párrafos
        self.paragraph_style = ParagraphStyle(
            'ParagraphStyle',
            parent=styles['Normal'],
            fontSize=8,
            textColor=black,
            alignment=TA_JUSTIFY,
            fontName='Helvetica',
            leading=10,
            wordWrap='CJK',
            leftIndent=0,
            rightIndent=0
        )

        # Estilo para declaración del usuario
        self.declaracion_style = ParagraphStyle(
            'DeclaracionStyle',
            parent=styles['Normal'],
            fontSize=7,
            textColor=black,
            alignment=TA_LEFT,
            fontName='Helvetica',
            leading=9,
            wordWrap='CJK',
            leftIndent=2,
            rightIndent=2,
            spaceBefore=1,
            spaceAfter=1,
            splitLongWords=True,
            allowWidows=0,
            allowOrphans=0
        )

        # Estilo para campos pequeños
        self.field_style = ParagraphStyle(
            'FieldStyle',
            parent=styles['Normal'],
            fontSize=7,
            textColor=black,
            alignment=TA_CENTER,
            fontName='Helvetica'
        )

    def generate_pdf(self, control: ControlOperativo) -> io.BytesIO:
        """Generar PDF del control operativo.

        Args:
            control: Instancia del control operativo

        Returns:
            io.BytesIO: Buffer con el PDF generado
        """
        buffer = io.BytesIO()

        def numbered_canvas_factory(buffer):
            return NumberedCanvas(buffer, pdf_id=control.id)

        doc = SimpleDocTemplate(
            buffer,
            pagesize=legal,
            rightMargin=self.margins['right'],
            leftMargin=self.margins['left'],
            topMargin=self.margins['top'] + 0.2 * inch,
            bottomMargin=self.margins['bottom'],
            canvasmaker=numbered_canvas_factory
        )

        # Construir contenido del PDF
        story = []
        story.extend(self._build_header())
        story.extend(self._build_datos_usuario(control))
        story.extend(self._build_info_consultante(control))
        story.extend(self._build_descripcion_caso(control))
        story.extend(self._build_concepto_estudiante(control))
        story.extend(self._build_concepto_asesor(control))
        story.append(PageBreak())
        story.extend(self._build_declaracion_usuario())

        # Generar PDF
        doc.build(story)

        # Limpiar archivos temporales
        self._cleanup_temp_files()

        buffer.seek(0)
        return buffer

    def _cleanup_temp_files(self):
        """Limpiar archivos temporales creados durante la generación."""
        if hasattr(self, '_temp_files_to_cleanup'):
            for temp_path in self._temp_files_to_cleanup:
                if temp_path and os.path.exists(temp_path):
                    try:
                        os.unlink(temp_path)
                    except Exception:
                        pass
            self._temp_files_to_cleanup = []

    def _build_header(self):
        """Construir encabezado oficial del PDF.

        Returns:
            list: Lista de elementos para el story
        """
        elements = []

        # Intentar agregar escudo institucional
        escudo_paths = [
            '/home/anderson/Escritorio/app_derecho_V3-main/'
            'frontend/src/assets/escudo.png',
            '/home/anderson/Escritorio/app_derecho_V3-main/'
            'frontend/public/escudo.png',
            '/app/escudo.png',
            os.path.join(os.getcwd(), 'escudo.png')
        ]

        escudo_path = None
        for path in escudo_paths:
            if os.path.exists(path):
                escudo_path = path
                break

        if escudo_path and escudo_path.endswith('.png'):
            try:
                escudo = Image(escudo_path, width=1*inch, height=1*inch)
                escudo_data = [[escudo]]
                escudo_table = Table(
                    escudo_data, colWidths=[self.content_width]
                )
                escudo_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (0, 0), 'CENTER'),
                    ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
                ]))
                elements.append(escudo_table)
                elements.append(Spacer(1, 2))
            except Exception:
                pass

        # Texto institucional
        elements.append(Paragraph(
            "UNIVERSIDAD COLEGIO MAYOR DE CUNDINAMARCA",
            self.university_style
        ))
        elements.append(Paragraph(
            "FACULTAD DE DERECHO - CONSULTORIO JURÍDICO",
            self.university_style
        ))

        centered_style = ParagraphStyle(
            'CenteredStyle',
            parent=self.normal_style,
            alignment=TA_CENTER,
            fontSize=9
        )

        elements.append(Paragraph(
            "Sede Universidad Pública de Kennedy - Tintal",
            centered_style
        ))
        elements.append(Paragraph(
            "<i>Aprobado Acuerdo 10/28/2002 Sala de Gobierno HTSDJ de "
            "Bogotá</i>",
            self.field_style
        ))

        elements.append(Spacer(1, 2))

        # Título principal
        elements.append(Paragraph(
            "<b>CONTROL OPERATIVO DE CONSULTA JURÍDICA</b>",
            self.title_style
        ))
        elements.append(Spacer(1, 2))

        return elements

    def _build_datos_usuario(self, control: ControlOperativo):
        """Construir sección I: DATOS DEL USUARIO.

        Args:
            control: Instancia del control operativo

        Returns:
            list: Lista de elementos para el story
        """
        elements = []

        # Título de sección
        section_data = [["I.    DATOS DEL USUARIO"]]
        section_table = Table(section_data, colWidths=[self.content_width])
        section_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        elements.append(section_table)

        # Fila de ciudad y fecha
        ciudad_fecha_data = [
            [
                f"Ciudad: {control.ciudad}",
                "Día",
                "Mes",
                "Año"
            ],
            [
                "",
                str(control.fecha_dia) if control.fecha_dia else "",
                str(control.fecha_mes) if control.fecha_mes else "",
                str(control.fecha_ano) if control.fecha_ano else ""
            ]
        ]

        col1_width = self.content_width * 0.538
        col2_width = self.content_width * 0.154
        col3_width = self.content_width * 0.154
        col4_width = self.content_width * 0.154

        fecha_table = Table(
            ciudad_fecha_data,
            colWidths=[col1_width, col2_width, col3_width, col4_width]
        )
        fecha_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('SPAN', (0, 0), (0, 1)),
        ]))
        elements.append(fecha_table)

        # Información adicional
        info_data = [
            [f"Nombre del Docente Responsable: "
             f"{control.nombre_docente_responsable or ''}"],
            [f"Nombre del Estudiante: {control.nombre_estudiante or ''}"],
            [f"Área de Consulta: {control.area_consulta or ''}"]
        ]

        info_table = Table(info_data, colWidths=[self.content_width])
        info_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(info_table)

        elements.append(Spacer(1, 3))
        return elements

    def _build_info_consultante(self, control: ControlOperativo):
        """Construir sección II: INFORMACIÓN GENERAL DEL CONSULTANTE.

        Args:
            control: Instancia del control operativo

        Returns:
            list: Lista de elementos para el story
        """
        elements = []

        # Título de sección
        section_data = [["II.   INFORMACIÓN GENERAL DEL CONSULTANTE"]]
        section_table = Table(section_data, colWidths=[self.content_width])
        section_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        elements.append(section_table)

        # Campos de información del consultante
        primera_fila = [
            [f"Remitido por: {control.remitido_por or ''}"],
            [f"Correo electrónico: {control.correo_electronico or ''}"]
        ]

        primera_table = Table(primera_fila, colWidths=[self.content_width])
        primera_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        elements.append(primera_table)

        # Nombre y edad
        nombre_edad_data = [[
            f"1. Nombre: {control.nombre_consultante or ''}",
            f"2. Edad: {control.edad or ''}"
        ]]

        nombre_col_width = self.content_width * 0.615
        edad_col_width = self.content_width * 0.385

        nombre_edad_table = Table(
            nombre_edad_data,
            colWidths=[nombre_col_width, edad_col_width]
        )
        nombre_edad_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        elements.append(nombre_edad_table)

        # Continuar con más campos...
        self._add_consultante_fields(elements, control)

        elements.append(Spacer(1, 3))
        return elements

    def _add_consultante_fields(self, elements, control):
        """Agregar campos adicionales del consultante.

        Args:
            elements: Lista de elementos del story
            control: Instancia del control operativo
        """
        # Fecha de nacimiento y lugar
        fecha_nac_data = [[
            f"3. Fecha de nacimiento    "
            f"Día: {control.fecha_nacimiento_dia or ''}    "
            f"Mes: {control.fecha_nacimiento_mes or ''}    "
            f"Año: {control.fecha_nacimiento_ano or ''}",
            f"4. Lugar de nacimiento: {control.lugar_nacimiento or ''}",
            "5. Sexo"
        ]]

        fecha_nac_col1 = self.content_width * 0.462
        fecha_nac_col2 = self.content_width * 0.308
        fecha_nac_col3 = self.content_width * 0.231

        fecha_nac_table = Table(
            fecha_nac_data,
            colWidths=[fecha_nac_col1, fecha_nac_col2, fecha_nac_col3]
        )
        fecha_nac_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        elements.append(fecha_nac_table)

        # Sexo con checkboxes
        sexo_data = [[
            "",
            f"Femenino {'✓' if control.sexo == 'Femenino' else '☐'}    "
            f"Masculino {'✓' if control.sexo == 'Masculino' else '☐'}"
        ]]

        sexo_col1 = self.content_width * 0.692
        sexo_col2 = self.content_width * 0.308

        sexo_table = Table(sexo_data, colWidths=[sexo_col1, sexo_col2])
        sexo_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        elements.append(sexo_table)

        # Documento de identidad
        doc_data = [[
            f"7. Número de documento: {control.numero_documento or ''}",
            f"8. Lugar de expedición: {control.lugar_expedicion or ''}"
        ]]

        doc_col_width = self.content_width * 0.5

        doc_table = Table(doc_data, colWidths=[doc_col_width, doc_col_width])
        doc_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        elements.append(doc_table)

        # Tipo de documento
        tipo_doc_data = [[
            f"{'✓' if control.tipo_documento == 'T.I.' else '☐'} T.I.    "
            f"{'✓' if control.tipo_documento == 'C.C.' else '☐'} C.C.    "
            f"{'✓' if control.tipo_documento == 'NUIP' else '☐'} NUIP",
            ""
        ]]

        tipo_doc_table = Table(
            tipo_doc_data,
            colWidths=[doc_col_width, doc_col_width]
        )
        tipo_doc_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        elements.append(tipo_doc_table)

        # Dirección y contacto
        direccion_data = [[
            f"9. Dirección: {control.direccion or ''}",
            f"10. Barrio: {control.barrio or ''}",
            f"Estrato: {control.estrato or ''}"
        ]]

        dir_col1 = self.content_width * 0.385
        dir_col2 = self.content_width * 0.385
        dir_col3 = self.content_width * 0.231

        direccion_table = Table(
            direccion_data,
            colWidths=[dir_col1, dir_col2, dir_col3]
        )
        direccion_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        elements.append(direccion_table)

        # Teléfonos
        telefono_data = [[
            f"11. Número telefónico: {control.numero_telefonico or ''}",
            f"12. Número celular: {control.numero_celular or ''}"
        ]]

        telefono_table = Table(
            telefono_data,
            colWidths=[doc_col_width, doc_col_width]
        )
        telefono_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        elements.append(telefono_table)

        # Estado civil y profesión
        estado_data = [[
            f"13. Estado civil actual: {control.estado_civil or ''}",
            f"15. Profesión u oficio: {control.profesion_oficio or ''}"
        ]]

        estado_table = Table(
            estado_data,
            colWidths=[doc_col_width, doc_col_width]
        )
        estado_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        elements.append(estado_table)

        # Escolaridad
        escolaridad_data = [[f"14. Escolaridad: {control.escolaridad or ''}"]]

        escolaridad_table = Table(
            escolaridad_data,
            colWidths=[self.content_width]
        )
        escolaridad_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        elements.append(escolaridad_table)

    def _build_descripcion_caso(self, control: ControlOperativo):
        """Construir sección III: BREVE DESCRIPCIÓN DEL CASO.

        Args:
            control: Instancia del control operativo

        Returns:
            list: Lista de elementos para el story
        """
        elements = []

        # Título de sección
        section_data = [["III.  BREVE DESCRIPCIÓN DEL CASO"]]
        section_table = Table(section_data, colWidths=[self.content_width])
        section_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(section_table)

        # Área de texto para descripción
        descripcion_text = control.descripcion_caso or ""
        if descripcion_text.strip():
            descripcion_paragraph = Paragraph(
                descripcion_text,
                self.paragraph_style
            )
        else:
            descripcion_paragraph = Paragraph(
                "&nbsp;",
                self.paragraph_style
            )

        data = [[descripcion_paragraph]]

        table = Table(
            data,
            colWidths=[self.content_width],
            rowHeights=[1.5*inch]
        )
        table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(table)

        elements.append(Spacer(1, 3))
        return elements

    def _build_concepto_estudiante(self, control: ControlOperativo):
        """Construir sección IV: CONCEPTO DEL ESTUDIANTE.

        Args:
            control: Instancia del control operativo

        Returns:
            list: Lista de elementos para el story
        """
        elements = []

        # Título de sección
        section_data = [["IV.  CONCEPTO DEL ESTUDIANTE"]]
        section_table = Table(section_data, colWidths=[self.content_width])
        section_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        elements.append(section_table)

        # Área de texto para concepto del estudiante
        concepto_text = control.concepto_estudiante or ""
        if concepto_text.strip():
            concepto_paragraph = Paragraph(concepto_text, self.paragraph_style)
        else:
            concepto_paragraph = Paragraph("&nbsp;", self.paragraph_style)

        concepto_height = 1.3*inch
        data = [[concepto_paragraph]]

        table = Table(
            data,
            colWidths=[self.content_width],
            rowHeights=[concepto_height]
        )
        table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(table)

        # Área de firma del estudiante
        firma_data = [["", "Firma Estudiante:"]]
        firma_est_col1 = self.content_width * 0.769
        firma_est_col2 = self.content_width * 0.231

        firma_table = Table(
            firma_data,
            colWidths=[firma_est_col1, firma_est_col2]
        )
        firma_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(firma_table)

        elements.append(Spacer(1, 3))
        return elements

    def _build_concepto_asesor(self, control: ControlOperativo):
        """Construir sección V: CONCEPTO DEL ASESOR JURÍDICO.

        Args:
            control: Instancia del control operativo

        Returns:
            list: Lista de elementos para el story
        """
        elements = []

        # Título de sección
        section_data = [["V.  CONCEPTO DEL ASESOR JURÍDICO"]]
        section_table = Table(section_data, colWidths=[self.content_width])
        section_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        elements.append(section_table)

        # Área de texto para concepto del asesor
        concepto_asesor_text = control.concepto_asesor or ""
        if concepto_asesor_text.strip():
            concepto_asesor_paragraph = Paragraph(
                concepto_asesor_text,
                self.paragraph_style
            )
        else:
            concepto_asesor_paragraph = Paragraph(
                "&nbsp;",
                self.paragraph_style
            )

        asesor_height = 1.3*inch
        data = [[concepto_asesor_paragraph]]

        table = Table(
            data,
            colWidths=[self.content_width],
            rowHeights=[asesor_height]
        )
        table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(table)

        # Área de firma del asesor
        firma_data = [["", "Firma Asesor:"]]
        firma_asesor_col1 = self.content_width * 0.769
        firma_asesor_col2 = self.content_width * 0.231

        firma_table = Table(
            firma_data,
            colWidths=[firma_asesor_col1, firma_asesor_col2]
        )
        firma_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(firma_table)

        return elements

    def _build_declaracion_usuario(self):
        """Construir sección VI: DECLARACIÓN DEL USUARIO (página 2).

        Returns:
            list: Lista de elementos para el story
        """
        elements = []

        # Título de sección
        section_data = [["VI. DECLARACIÓN DEL USUARIO"]]
        section_table = Table(section_data, colWidths=[self.content_width])
        section_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        elements.append(section_table)

        # Texto de la declaración con mejor formato
        declaracion_text = (
            "<b>1.</b> Que la información antes suministrada se puede "
            "verificar y si se comprueba que falté a la verdad y omití "
            "información, acepto el archivo y renuncia del caso por parte "
            "del CONSULTORIO JURÍDICO de la UNIVERSIDAD COLEGIO MAYOR DE "
            "CUNDINAMARCA.<br/><br/>"

            "<b>2.</b> Que fui informado, que el compromiso profesional se "
            "inicia con previa aceptación del caso y la entrevista sin "
            "compromiso a la UNIVERSIDAD COLEGIO (CONSULTORIO JURÍDICO), "
            "ni a ninguno de los profesionales que allí labora a brindar "
            "asesoría del caso.<br/><br/>"

            "<b>3.</b> Autorizo que en caso de no aportar los documentos "
            "requeridos en un término prudencial o de incumplir en por lo "
            "menos a dos citas, o comete alguna falta del personal que me "
            "atiende será ARCHIVADO.<br/><br/>"

            "<b>4.</b> Igualmente autorizo a la UNIVERSIDAD COLEGIO MAYOR "
            "DE CUNDINAMARCA (CONSULTORIO JURÍDICO), para utilizar la "
            "información confidencial suministrada y requerida, con fines "
            "académicos e investigativos.<br/><br/>"

            "<b>5.</b> Manifiesto que fui informado en el CONSULTORIO "
            "JURÍDICO de la UNIVERSIDAD COLEGIO MAYOR DE CUNDINAMARCA de "
            "la existencia de un equipo interdisciplinario que permite "
            "ofrecer una atención integral a los usuarios con el fin de "
            "mejorar la calidad de vida a nivel individual y/o familiar "
            "mediante un seguimiento de los casos requeridos."
        )

        # Crear párrafo con estilo mejorado
        declaracion_paragraph = Paragraph(
            declaracion_text,
            self.declaracion_style
        )

        # Tabla sin altura fija - se ajusta automáticamente al contenido
        data = [[declaracion_paragraph]]
        
        table = Table(
            data,
            colWidths=[self.content_width],
            # No especificar rowHeights para permitir ajuste automático
        )
        table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 1, black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        elements.append(table)

        # Espacio flexible para firma del usuario
        elements.append(Spacer(1, 24))

        # Firma con mejor formato
        firma_data = [["", "Firma del Usuario"]]
        firma_usuario_col1 = self.content_width * 0.6
        firma_usuario_col2 = self.content_width * 0.4

        firma_table = Table(
            firma_data,
            colWidths=[firma_usuario_col1, firma_usuario_col2]
        )
        firma_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 15),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LINEABOVE', (1, 0), (1, 0), 1.5, black),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ]))
        elements.append(firma_table)

        # Pie de página con mejor formato
        elements.append(Spacer(1, 18))
        
        # Estilo para el pie de página
        pie_style = ParagraphStyle(
            'PieStyle',
            parent=self.field_style,
            fontSize=8,
            textColor=colors.darkgrey,
            alignment=TA_CENTER,
            fontName='Helvetica-Oblique'
        )
        
        elements.append(Paragraph(
            "Calle 5C No. 94I – 25 Edificio Nuevo Piso 4 – UPK - "
            "Bogotá, D.C.<br/>"
            "Correo: consultoriojuridico.kennedy@unicolmayor.edu.co",
            pie_style
        ))

        return elements

    def generate_pdf_with_attachments(self, control: ControlOperativo):
        """Generar PDF con adjuntos unidos.

        Args:
            control: Instancia del control operativo

        Returns:
            io.BytesIO: Buffer con el PDF final
        """
        try:
            from app.config.database import SessionLocal

            # Buscar documentos PDF adjuntos
            db = SessionLocal()
            pdf_documentos = db.query(Documento).filter(
                Documento.control_operativo_id == control.id,
                Documento.activo == True
            ).all()
            db.close()

            # Filtrar solo PDFs válidos
            pdf_documentos = [
                doc for doc in pdf_documentos
                if doc.nombre_original.lower().endswith('.pdf')
            ]

            print(f"📎 Encontrados {len(pdf_documentos)} PDFs para anexar")

            # Si no hay PDFs adjuntos, generar solo el PDF base
            if not pdf_documentos:
                print("📄 No hay PDFs adjuntos, generando solo PDF base")
                return self.generate_pdf(control)

            # Generar el PDF base del control operativo
            base_pdf_buffer = self.generate_pdf(control)

            # Crear un nuevo PdfWriter para unir todos los PDFs
            writer = PdfWriter()
            temp_files = []

            try:
                # Agregar las páginas del PDF base
                base_pdf_buffer.seek(0)
                base_reader = PdfReader(base_pdf_buffer)

                for page in base_reader.pages:
                    writer.add_page(page)

                print(f"📄 PDF base agregado con {len(base_reader.pages)}")

                # Procesar cada PDF adjunto
                for i, doc in enumerate(pdf_documentos, 1):
                    try:
                        print(f"📎 Procesando PDF {i}: {doc.nombre_original}")

                        # Crear archivo temporal con el contenido del PDF
                        with tempfile.NamedTemporaryFile(
                            delete=False,
                            suffix='.pdf'
                        ) as temp_file:
                            temp_file.write(doc.contenido)
                            temp_path = temp_file.name
                        temp_files.append(temp_path)

                        # Leer el PDF adjunto
                        attachment_reader = PdfReader(temp_path)

                        # Agregar todas las páginas del PDF adjunto
                        for page in attachment_reader.pages:
                            writer.add_page(page)

                        print(
                            f"✅ PDF {doc.nombre_original} agregado con "
                            f"{len(attachment_reader.pages)} páginas"
                        )

                    except Exception as e:
                        print(f"❌ Error procesando PDF {doc.nombre_original}: {e}")
                        continue

                # Escribir el PDF final unificado
                final_buffer = io.BytesIO()
                writer.write(final_buffer)
                final_buffer.seek(0)

                print("✅ PDF final generado con todos los adjuntos")
                return final_buffer

            finally:
                # Limpiar archivos temporales
                for temp_path in temp_files:
                    try:
                        if os.path.exists(temp_path):
                            os.unlink(temp_path)
                    except Exception:
                        pass

        except Exception as e:
            print(f"❌ Error generando PDF con adjuntos: {e}")
            # En caso de error, retornar solo el PDF base
            return self.generate_pdf(control)


# Instancia global del generador
pdf_generator = ControlOperativoPDFGenerator()