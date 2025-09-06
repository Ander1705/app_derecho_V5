package pdf

import (
	"fmt"
	"strings"

	"github.com/jung-kurt/gofpdf"
	"consultorio-juridico/internal/models"
)

type PDFGenerator struct{}

func NewPDFGenerator() *PDFGenerator {
	return &PDFGenerator{}
}

func (g *PDFGenerator) GenerarControlOperativo(control *models.ControlOperativo) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Configurar fuente
	pdf.SetFont("Arial", "", 10)

	// Agregar numeración en esquina superior derecha
	g.agregarNumeracion(pdf, control.ID)

	// Generar contenido del PDF
	g.generarEncabezado(pdf, control)
	g.generarSeccionI(pdf, control)
	g.generarSeccionII(pdf, control)
	g.generarSeccionIII(pdf, control)
	g.generarSeccionIV(pdf, control)
	
	// Solo incluir sección V si existe concepto del asesor
	if control.ConceptoAsesor != "" {
		g.generarSeccionV(pdf, control)
	}

	// Agregar resultado final si existe
	if control.EstadoResultado != nil && *control.EstadoResultado != "" {
		g.generarResultadoFinal(pdf, control)
	}

	// Obtener bytes del PDF
	var buf strings.Builder
	err := pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("error generando PDF: %w", err)
	}

	return []byte(buf.String()), nil
}

func (g *PDFGenerator) agregarNumeracion(pdf *gofpdf.Fpdf, controlID uint) {
	// Guardar posición actual
	x, y := pdf.GetXY()
	
	// Posicionar en esquina superior derecha (0.5" del margen derecho, 0.3" del superior)
	pdf.SetXY(210-12.7-20, 7.6) // 210mm ancho A4 - 0.5" (12.7mm) - espacio texto - 0.3" (7.6mm) del top
	
	// Configurar fuente para numeración
	pdf.SetFont("Helvetica", "", 10)
	
	// Agregar número
	numeroTexto := fmt.Sprintf("PDF #%d", controlID)
	pdf.CellFormat(20, 5, numeroTexto, "", 0, "L", false, 0, "")
	
	// Restaurar posición
	pdf.SetXY(x, y)
}

func (g *PDFGenerator) generarEncabezado(pdf *gofpdf.Fpdf, control *models.ControlOperativo) {
	// Logo y título institucional (si se requiere)
	pdf.SetFont("Arial", "B", 16)
	pdf.CellFormat(0, 10, "UNIVERSIDAD COLEGIO MAYOR DE CUNDINAMARCA", "", 1, "C", false, 0, "")
	pdf.Ln(8)
	
	pdf.SetFont("Arial", "B", 14)
	pdf.CellFormat(0, 8, "CONSULTORIO JURIDICO", "", 1, "C", false, 0, "")
	pdf.Ln(8)
	
	pdf.SetFont("Arial", "B", 12)
	pdf.CellFormat(0, 8, "CONTROL OPERATIVO", "", 1, "C", false, 0, "")
	pdf.Ln(15)
}

func (g *PDFGenerator) generarSeccionI(pdf *gofpdf.Fpdf, control *models.ControlOperativo) {
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(0, 8, "I. DATOS GENERALES", "", 1, "L", false, 0, "")
	pdf.Ln(10)
	
	pdf.SetFont("Arial", "", 10)
	
	// Primera fila
	pdf.CellFormat(60, 6, fmt.Sprintf("Ciudad: %s", control.Ciudad), "1", 0, "L", false, 0, "")
	pdf.CellFormat(60, 6, fmt.Sprintf("Fecha: %d/%d/%d", control.FechaDia, control.FechaMes, control.FechaAno), "1", 0, "L", false, 0, "")
	pdf.CellFormat(70, 6, fmt.Sprintf("ID: %d", control.ID), "1", 1, "L", false, 0, "")
	
	// Segunda fila
	pdf.CellFormat(95, 6, fmt.Sprintf("Docente Responsable: %s", control.NombreDocenteResponsable), "1", 0, "L", false, 0, "")
	pdf.CellFormat(95, 6, fmt.Sprintf("Estudiante: %s", control.NombreEstudiante), "1", 1, "L", false, 0, "")
	
	// Tercera fila
	pdf.CellFormat(95, 6, fmt.Sprintf("Area de Consulta: %s", control.AreaConsulta), "1", 0, "L", false, 0, "")
	pdf.CellFormat(95, 6, fmt.Sprintf("Remitido Por: %s", control.RemitidoPor), "1", 1, "L", false, 0, "")
	
	pdf.Ln(8)
}

func (g *PDFGenerator) generarSeccionII(pdf *gofpdf.Fpdf, control *models.ControlOperativo) {
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(0, 8, "II. INFORMACION GENERAL DEL CONSULTANTE", "", 1, "L", false, 0, "")
	pdf.Ln(10)
	
	pdf.SetFont("Arial", "", 10)
	
	// Datos personales
	pdf.CellFormat(95, 6, fmt.Sprintf("Nombre: %s", control.NombreConsultante), "1", 0, "L", false, 0, "")
	pdf.CellFormat(95, 6, fmt.Sprintf("Email: %s", control.CorreoElectronico), "1", 1, "L", false, 0, "")
	
	pdf.CellFormat(30, 6, fmt.Sprintf("Edad: %d", control.Edad), "1", 0, "L", false, 0, "")
	pdf.CellFormat(80, 6, fmt.Sprintf("Fecha Nac: %d/%d/%d", control.FechaNacimientoDia, control.FechaNacimientoMes, control.FechaNacimientoAno), "1", 0, "L", false, 0, "")
	pdf.CellFormat(80, 6, fmt.Sprintf("Lugar: %s", control.LugarNacimiento), "1", 1, "L", false, 0, "")
	
	pdf.CellFormat(30, 6, fmt.Sprintf("Sexo: %s", control.Sexo), "1", 0, "L", false, 0, "")
	pdf.CellFormat(50, 6, fmt.Sprintf("Doc: %s", control.TipoDocumento), "1", 0, "L", false, 0, "")
	pdf.CellFormat(60, 6, fmt.Sprintf("Numero: %s", control.NumeroDocumento), "1", 0, "L", false, 0, "")
	pdf.CellFormat(50, 6, fmt.Sprintf("Expedicion: %s", control.LugarExpedicion), "1", 1, "L", false, 0, "")
	
	// Datos de contacto
	pdf.CellFormat(95, 6, fmt.Sprintf("Direccion: %s", control.Direccion), "1", 0, "L", false, 0, "")
	pdf.CellFormat(50, 6, fmt.Sprintf("Barrio: %s", control.Barrio), "1", 0, "L", false, 0, "")
	pdf.CellFormat(45, 6, fmt.Sprintf("Estrato: %d", control.Estrato), "1", 1, "L", false, 0, "")
	
	pdf.CellFormat(60, 6, fmt.Sprintf("Telefono: %s", control.NumeroTelefonico), "1", 0, "L", false, 0, "")
	pdf.CellFormat(60, 6, fmt.Sprintf("Celular: %s", control.NumeroCelular), "1", 0, "L", false, 0, "")
	pdf.CellFormat(70, 6, fmt.Sprintf("Estado Civil: %s", control.EstadoCivil), "1", 1, "L", false, 0, "")
	
	pdf.CellFormat(95, 6, fmt.Sprintf("Escolaridad: %s", control.Escolaridad), "1", 0, "L", false, 0, "")
	pdf.CellFormat(95, 6, fmt.Sprintf("Profesion/Oficio: %s", control.ProfesionOficio), "1", 1, "L", false, 0, "")
	
	pdf.Ln(8)
}

func (g *PDFGenerator) generarSeccionIII(pdf *gofpdf.Fpdf, control *models.ControlOperativo) {
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(0, 8, "III. DESCRIPCION DEL CASO", "", 1, "L", false, 0, "")
	pdf.Ln(10)
	
	pdf.SetFont("Arial", "", 10)
	
	// Dividir texto largo en líneas
	lines := g.splitText(control.DescripcionCaso, 85)
	for _, line := range lines {
		pdf.CellFormat(0, 6, line, "1", 1, "L", false, 0, "")
	}
	
	pdf.Ln(8)
}

func (g *PDFGenerator) generarSeccionIV(pdf *gofpdf.Fpdf, control *models.ControlOperativo) {
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(0, 8, "IV. CONCEPTO DEL ESTUDIANTE", "", 1, "L", false, 0, "")
	pdf.Ln(10)
	
	pdf.SetFont("Arial", "", 10)
	
	// Dividir texto largo en líneas
	lines := g.splitText(control.ConceptoEstudiante, 85)
	for _, line := range lines {
		pdf.CellFormat(0, 6, line, "1", 1, "L", false, 0, "")
	}
	
	pdf.Ln(8)
}

func (g *PDFGenerator) generarSeccionV(pdf *gofpdf.Fpdf, control *models.ControlOperativo) {
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(0, 8, "V. CONCEPTO DEL ASESOR JURIDICO", "", 1, "L", false, 0, "")
	pdf.Ln(10)
	
	pdf.SetFont("Arial", "", 10)
	
	// Dividir texto largo en líneas
	lines := g.splitText(control.ConceptoAsesor, 85)
	for _, line := range lines {
		pdf.CellFormat(0, 6, line, "1", 1, "L", false, 0, "")
	}
	
	pdf.Ln(8)
}

func (g *PDFGenerator) generarResultadoFinal(pdf *gofpdf.Fpdf, control *models.ControlOperativo) {
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(0, 8, "RESULTADO FINAL", "", 1, "L", false, 0, "")
	pdf.Ln(10)
	
	pdf.SetFont("Arial", "B", 12)
	
	resultadoTexto := map[string]string{
		"asesoria_consulta":      "ASESORIA/CONSULTA",
		"auto_reparto":           "AUTO REPARTO",
		"reparto":                "REPARTO",
		"solicitud_conciliacion": "SOLICITUD DE CONCILIACION",
	}
	
	texto := resultadoTexto[*control.EstadoResultado]
	if texto == "" {
		texto = strings.ToUpper(*control.EstadoResultado)
	}
	
	pdf.CellFormat(0, 10, texto, "1", 1, "C", false, 0, "")
}

// Función auxiliar para dividir texto largo
func (g *PDFGenerator) splitText(text string, maxChars int) []string {
	var lines []string
	words := strings.Fields(text)
	currentLine := ""
	
	for _, word := range words {
		if len(currentLine+" "+word) <= maxChars {
			if currentLine == "" {
				currentLine = word
			} else {
				currentLine += " " + word
			}
		} else {
			if currentLine != "" {
				lines = append(lines, currentLine)
			}
			currentLine = word
		}
	}
	
	if currentLine != "" {
		lines = append(lines, currentLine)
	}
	
	// Asegurar al menos una línea
	if len(lines) == 0 {
		lines = append(lines, "")
	}
	
	return lines
}