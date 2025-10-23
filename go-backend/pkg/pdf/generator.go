package pdf

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf"
	"consultorio-juridico/internal/models"
)

// ProcesarTextoUTF8 - Función para convertir UTF-8 a ISO-8859-1 para gofpdf
// IMPLEMENTACIÓN SEGÚN CLAUDE.md - Corrección de caracteres especiales
func ProcesarTextoUTF8(texto string) string {
	if texto == "" {
		return texto
	}
	
	result := make([]byte, 0, len(texto))
	
	for _, r := range texto {
		switch r {
		// Vocales con acento minúsculas
		case 'á': result = append(result, 0xe1)
		case 'é': result = append(result, 0xe9) 
		case 'í': result = append(result, 0xed)
		case 'ó': result = append(result, 0xf3)
		case 'ú': result = append(result, 0xfa)
		// Vocales con acento mayúsculas
		case 'Á': result = append(result, 0xc1)
		case 'É': result = append(result, 0xc9)
		case 'Í': result = append(result, 0xcd)
		case 'Ó': result = append(result, 0xd3)
		case 'Ú': result = append(result, 0xda)
		// Ñ y ñ
		case 'ñ': result = append(result, 0xf1)
		case 'Ñ': result = append(result, 0xd1)
		// Otros caracteres comunes
		case 'ü': result = append(result, 0xfc)
		case 'Ü': result = append(result, 0xdc)
		// Checkboxes según CLAUDE.md (convertir a representación simple)
		case '☐': result = append(result, '[', ']') // Checkbox vacío
		case '☑': result = append(result, '[', 'X', ']') // Checkbox marcado
		// Caracteres ASCII normales y otros
		default:
			if r < 256 {
				result = append(result, byte(r))
			} else {
				// Caracteres no soportados por ISO-8859-1, usar carácter de reemplazo
				result = append(result, '?')
			}
		}
	}
	
	return string(result)
}

// Constantes CORREGIDAS para tamaño CARTA con márgenes reducidos
const (
	// Configuración de página CARTA (Letter size)
	ANCHO_CARTA    = 215.9  // 8.5" = 215.9mm (Letter width)
	ALTO_CARTA     = 279.4  // 11" = 279.4mm (Letter height)
	
	// Márgenes REDUCIDOS para mejor aprovechamiento
	MARGEN_SUPERIOR   = 8.0    // 8mm (reducido)
	MARGEN_INFERIOR   = 8.0    // 8mm (reducido)
	MARGEN_IZQUIERDO  = 10.0   // 10mm (reducido)
	MARGEN_DERECHO    = 10.0   // 10mm (reducido)
	
	// Área útil después de márgenes reducidos
	ANCHO_UTIL = ANCHO_CARTA - MARGEN_IZQUIERDO - MARGEN_DERECHO  // 195.9mm (215.9-10-10)
	
	// Conversión px a mm según CLAUDE.md (1px = 0.264583mm a 96 DPI)
	PX_TO_MM = 0.264583
	
	// Alturas AJUSTADAS para formato CARTA (279.4mm vs 330mm OFICIO)
	ALTURA_HEADER_22PX = 22.0 * PX_TO_MM  // 22px → mm
	ALTURA_CELDA_20PX  = 20.0 * PX_TO_MM  // 20px → mm 
	ALTURA_DESCRIPCION = 135.0 * PX_TO_MM // 135px → mm para BREVE DESCRIPCIÓN (reducido para carta)
	ALTURA_CONCEPTOS   = 105.0 * PX_TO_MM // 105px → mm para CONCEPTOS (reducido para carta)
	
	// Fuentes según especificaciones EXACTAS CLAUDE.md
	FUENTE_TITULO_13PT    = 13  // Arial Bold 13pt
	FUENTE_SUBTITULO_11PT = 11  // Arial Bold 11pt
	FUENTE_NORMAL_10PT    = 10  // Arial 10pt
	FUENTE_PEQUENA_9PT    = 9   // Arial 9pt
	FUENTE_FOOTER_8PT     = 8   // Arial 8pt
	
	// Logo ajustado para tamaño carta
	LOGO_ANCHO = 18.0  // 18mm (ancho) ajustado para carta
	LOGO_ALTO  = 22.0  // 22mm (alto) ajustado para carta
)

type PDFGenerator struct {
	// Configuración de estilos
}

func NewPDFGenerator() *PDFGenerator {
	return &PDFGenerator{}
}

// GenerarControlOperativo - NUEVA IMPLEMENTACIÓN SEGÚN CLAUDE.md
func (g *PDFGenerator) GenerarControlOperativo(control *models.ControlOperativo) ([]byte, error) {
	// Generar el PDF del formulario principal
	mainPDFBytes, err := g.generarFormularioPrincipalRefactorizado(control)
	if err != nil {
		return nil, err
	}
	
	// Si no hay documentos adjuntos, devolver solo el formulario principal
	if len(control.DocumentosAdjuntos) == 0 {
		return mainPDFBytes, nil
	}
	
	// Si hay documentos adjuntos, concatenarlos
	return g.concatenarPDFs(mainPDFBytes, control.DocumentosAdjuntos)
}

// generarFormularioPrincipalRefactorizado - NUEVA IMPLEMENTACIÓN COMPLETA según CLAUDE.md
func (g *PDFGenerator) generarFormularioPrincipalRefactorizado(control *models.ControlOperativo) ([]byte, error) {
	// CREAR PDF EN FORMATO CARTA CORREGIDO
	pdf := gofpdf.NewCustom(&gofpdf.InitType{
		OrientationStr: "P",         // Vertical
		UnitStr:        "mm",        // Milímetros
		SizeStr:        "",
		Size: gofpdf.SizeType{
			Wd: ANCHO_CARTA,         // 215.9mm (8.5")
			Ht: ALTO_CARTA,          // 279.4mm (11")
		},
		FontDirStr: "",
	})
	
	// CONFIGURAR MÁRGENES REDUCIDOS
	pdf.SetMargins(MARGEN_IZQUIERDO, MARGEN_SUPERIOR, MARGEN_DERECHO)  // izq=10mm, sup=8mm, der=10mm
	// DESACTIVAR AutoPageBreak para controlar exactamente 2 páginas según CLAUDE.md
	pdf.SetAutoPageBreak(false, 0)
	
	// ENCODING UTF-8 según CLAUDE.md
	pdf.SetFont("Arial", "", FUENTE_NORMAL_10PT)
	
	// PÁGINA 1: Encabezado + Secciones I-V
	pdf.AddPage()
	
	// Generar cada sección según diseño exacto CLAUDE.md
	g.generarEncabezadoExacto(pdf)
	g.generarSeccionI_Exacta(pdf, control)
	g.generarSeccionII_Exacta(pdf, control) 
	g.generarSeccionIII_Exacta(pdf, control)
	g.generarSeccionIV_Exacta(pdf, control)
	g.generarSeccionV_Exacta(pdf, control)
	
	// PÁGINA 2: SOLO Sección VI según CLAUDE.md
	pdf.AddPage()
	g.generarSeccionVI_Exacta(pdf)
	g.generarFooterFinal(pdf)

	// Generar bytes del PDF
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("error generando PDF refactorizado: %w", err)
	}
	
	return buf.Bytes(), nil
}

// generarEncabezadoExacto - ENCABEZADO EXACTO según CLAUDE.md - CORRECCIÓN COMPLETA
func (g *PDFGenerator) generarEncabezadoExacto(pdf *gofpdf.Fpdf) {
	// Espaciado vertical ajustado - 1cm margen superior HARDCODEADO
	pdf.Ln(5)  // Mínimo espaciado - margen superior ya es 1cm
	
	// LOGO AJUSTADO PARA CARTA
	logoAncho := LOGO_ANCHO  // 18mm
	logoAlto := LOGO_ALTO    // 22mm
	logoX := MARGEN_IZQUIERDO + (ANCHO_UTIL / 2.0) - (logoAncho / 2.0)  // Centrado en página carta
	logoY := pdf.GetY()
	
	// CARGAR LOGO con múltiples rutas y mejor manejo
	logoPaths := []string{
		"./assets/images/escudo.png",
		"assets/images/escudo.png",
		"./go-backend/assets/images/escudo.png",
		"go-backend/assets/images/escudo.png",
		"./frontend/public/escudo.png",
		"frontend/public/escudo.png",
		"/app/assets/images/escudo.png",      // Ruta Docker
		"/app/go-backend/assets/images/escudo.png", // Ruta Docker alternativa
	}
	
	logoLoaded := false
	for _, logoPath := range logoPaths {
		if _, err := os.Stat(logoPath); err == nil {
			fmt.Printf("🖼️ Logo encontrado en: %s\n", logoPath)
			pdf.ImageOptions(logoPath, logoX, logoY, logoAncho, logoAlto, false, gofpdf.ImageOptions{
				ImageType: "PNG",
				ReadDpi:   true,
			}, 0, "")
			logoLoaded = true
			break
		}
	}
	
	if !logoLoaded {
		fmt.Printf("⚠️ Logo no encontrado, usando fallback\n")
		// Dibujar logo fallback
		g.dibujarLogoFallback(pdf, logoX, logoY, logoAncho, logoAlto)
	}
	
	// Espacio 5px después del logo
	pdf.Ln(5 * PX_TO_MM + logoAlto)
	
	// UNIVERSIDAD COLEGIO MAYOR DE CUNDINAMARCA - Arial Bold 13pt, centrado, TODO EN NEGRO
	pdf.SetTextColor(0, 0, 0)  // NEGRO según CLAUDE.md
	pdf.SetFont("Arial", "B", FUENTE_TITULO_13PT)
	pdf.CellFormat(0, 5, ProcesarTextoUTF8("UNIVERSIDAD COLEGIO MAYOR DE CUNDINAMARCA"), "", 1, "C", false, 0, "")
	
	// Espacio 2px según CLAUDE.md
	pdf.Ln(2 * PX_TO_MM)
	
	// FACULTAD DE DERECHO - CONSULTORIO JURÍDICO - Arial Bold 11pt, centrado, TODO EN NEGRO
	pdf.SetTextColor(0, 0, 0)  // NEGRO según CLAUDE.md
	pdf.SetFont("Arial", "B", FUENTE_SUBTITULO_11PT)
	pdf.CellFormat(0, 4, ProcesarTextoUTF8("FACULTAD DE DERECHO - CONSULTORIO JURÍDICO"), "", 1, "C", false, 0, "")
	
	// Espacio 3px según CLAUDE.md
	pdf.Ln(3 * PX_TO_MM)
	
	// Sede Universidad Pública de Kennedy - Tintal - Arial Regular 9pt, centrado, NEGRO
	pdf.SetTextColor(0, 0, 0)  // NEGRO según CLAUDE.md
	pdf.SetFont("Arial", "", FUENTE_PEQUENA_9PT)
	pdf.CellFormat(0, 4, ProcesarTextoUTF8("Sede Universidad Pública de Kennedy - Tintal"), "", 1, "C", false, 0, "")
	
	// Espacio 2px según CLAUDE.md
	pdf.Ln(2 * PX_TO_MM)
	
	// Acrobado Acuerdo - Arial Italic 8pt, centrado, NEGRO
	pdf.SetTextColor(0, 0, 0)  // NEGRO según CLAUDE.md
	pdf.SetFont("Arial", "I", FUENTE_FOOTER_8PT)
	pdf.CellFormat(0, 3, ProcesarTextoUTF8("Acrobado Acuerdo 10/28/2002 Sala de Gobierno HTSDI de Bogotá"), "", 1, "C", false, 0, "")
	
	// Espacio 8px según CLAUDE.md
	pdf.Ln(8 * PX_TO_MM)
	
	// CONTROL OPERATIVO DE CONSULTA JURÍDICA - Arial Bold 11pt, centrado, NEGRO
	pdf.SetTextColor(0, 0, 0)  // NEGRO según CLAUDE.md
	pdf.SetFont("Arial", "B", FUENTE_SUBTITULO_11PT)
	pdf.CellFormat(0, 4, ProcesarTextoUTF8("CONTROL OPERATIVO DE CONSULTA JURÍDICA"), "", 1, "C", false, 0, "")
	
	// Espacio 12px antes de la tabla según CLAUDE.md
	pdf.Ln(12 * PX_TO_MM)
}

// dibujarLogoFallback - Logo fallback mejorado para UCMC
func (g *PDFGenerator) dibujarLogoFallback(pdf *gofpdf.Fpdf, x, y, ancho, alto float64) {
	// Escudo universitario más profesional
	pdf.SetFillColor(0, 51, 102)    // Azul universitario
	pdf.SetDrawColor(0, 0, 0)       // Borde negro
	pdf.SetLineWidth(0.8)
	
	// Forma de escudo clásico universitario
	pdf.Polygon([]gofpdf.PointType{
		{X: x + ancho/2, Y: y},                // Punta superior
		{X: x + ancho*0.85, Y: y + alto*0.12}, // Derecha superior
		{X: x + ancho*0.85, Y: y + alto*0.65}, // Derecha media
		{X: x + ancho/2, Y: y + alto*0.95},    // Punta inferior
		{X: x + ancho*0.15, Y: y + alto*0.65}, // Izquierda media
		{X: x + ancho*0.15, Y: y + alto*0.12}, // Izquierda superior
	}, "FD")
	
	// Cruz dorada en el centro
	pdf.SetFillColor(255, 215, 0)    // Dorado
	crossW := ancho * 0.08
	crossH := alto * 0.35
	centerX := x + ancho/2
	centerY := y + alto*0.40
	
	// Cruz vertical
	pdf.Rect(centerX - crossW/2, centerY - crossH/2, crossW, crossH, "F")
	// Cruz horizontal  
	pdf.Rect(centerX - crossH/2, centerY - crossW/2, crossH, crossW, "F")
	
	// Banda inferior con texto
	pdf.SetFillColor(255, 255, 255)  // Blanco
	pdf.Rect(x + ancho*0.15, y + alto*0.75, ancho*0.70, alto*0.15, "F")
	
	// Texto "UCMC" 
	pdf.SetXY(x, y + alto*0.80)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetTextColor(0, 51, 102)  // Azul universitario
	pdf.CellFormat(ancho, 3, "UCMC", "", 0, "C", false, 0, "")
	pdf.SetTextColor(0, 0, 0) // Restaurar color negro
}

// generarSeccionI_Exacta - SECCIÓN I EXACTA según tabla CLAUDE.md - CORRECCIÓN 5 COLUMNAS
func (g *PDFGenerator) generarSeccionI_Exacta(pdf *gofpdf.Fpdf, control *models.ControlOperativo) {
	// HEADER: "I. DATOS DEL USUARIO" (100% width, 22px height, fondo gris claro #EFEFEF)
	pdf.SetFillColor(239, 239, 239)  // #EFEFEF gris MUY claro según CLAUDE.md
	pdf.SetTextColor(0, 0, 0)        // Negro
	pdf.SetFont("Arial", "B", FUENTE_NORMAL_10PT)
	
	pdf.CellFormat(ANCHO_UTIL, ALTURA_HEADER_22PX, ProcesarTextoUTF8("I. DATOS DEL USUARIO"), "1", 1, "L", true, 0, "")
	
	// Configuración para celdas de datos
	pdf.SetFillColor(255, 255, 255)  // Fondo blanco
	pdf.SetFont("Arial", "", FUENTE_PEQUENA_9PT)
	
	// ESTRUCTURA DE 5 COLUMNAS EXACTA según CLAUDE.md
	ciudad := control.Ciudad
	if ciudad == "" {
		ciudad = "Bogotá D.C."
	}
	
	// Anchos de columna EXACTOS según CLAUDE.md
	anchoCiudad := ANCHO_UTIL * 0.55     // 55%
	anchoDia := ANCHO_UTIL * 0.10        // 10%
	anchoMes := ANCHO_UTIL * 0.10        // 10%
	anchoAno := ANCHO_UTIL * 0.15        // 15%
	anchoVacio := ANCHO_UTIL * 0.10      // 10% celda vacía derecha
	
	// FILA 1: Ciudad: Bogotá D.C. | Día | Mes | Año | [vacío]
	pdf.CellFormat(anchoCiudad, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fmt.Sprintf("Ciudad: %s", ciudad)), "1", 0, "L", false, 0, "")
	pdf.CellFormat(anchoDia, ALTURA_CELDA_20PX, ProcesarTextoUTF8("Día"), "1", 0, "C", false, 0, "")
	pdf.CellFormat(anchoMes, ALTURA_CELDA_20PX, ProcesarTextoUTF8("Mes"), "1", 0, "C", false, 0, "")
	pdf.CellFormat(anchoAno, ALTURA_CELDA_20PX, ProcesarTextoUTF8("Año"), "1", 0, "C", false, 0, "")
	pdf.CellFormat(anchoVacio, ALTURA_CELDA_20PX, "", "1", 1, "C", false, 0, "")  // Celda vacía
	
	// FILA 2: [vacío] | 20 | 8 | 2025 | [vacío]
	pdf.CellFormat(anchoCiudad, ALTURA_CELDA_20PX, "", "1", 0, "L", false, 0, "")  // Espacio vacío
	pdf.CellFormat(anchoDia, ALTURA_CELDA_20PX, fmt.Sprintf("%d", control.FechaDia), "1", 0, "C", false, 0, "")
	pdf.CellFormat(anchoMes, ALTURA_CELDA_20PX, fmt.Sprintf("%d", control.FechaMes), "1", 0, "C", false, 0, "")
	pdf.CellFormat(anchoAno, ALTURA_CELDA_20PX, fmt.Sprintf("%d", control.FechaAno), "1", 0, "C", false, 0, "")
	pdf.CellFormat(anchoVacio, ALTURA_CELDA_20PX, "", "1", 1, "C", false, 0, "")  // Celda vacía
	
	// SIGUIENTES FILAS COMBINADAS (altura 20px cada una según CLAUDE.md)
	docente := control.NombreDocenteResponsable
	pdf.CellFormat(ANCHO_UTIL, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fmt.Sprintf("Nombre del Docente Responsable: %s", docente)), "1", 1, "L", false, 0, "")
	
	estudiante := control.NombreEstudiante  
	pdf.CellFormat(ANCHO_UTIL, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fmt.Sprintf("Nombre del Estudiante: %s", estudiante)), "1", 1, "L", false, 0, "")
	
	area := control.AreaConsulta
	pdf.CellFormat(ANCHO_UTIL, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fmt.Sprintf("Área de Consulta: %s", area)), "1", 1, "L", false, 0, "")
	
	// Espaciado 8px según CLAUDE.md
	pdf.Ln(8 * PX_TO_MM)
}

// generarSeccionII_Exacta - SECCIÓN II EXACTA según estructura CLAUDE.md - CORRECCIÓN COMPLETA
func (g *PDFGenerator) generarSeccionII_Exacta(pdf *gofpdf.Fpdf, control *models.ControlOperativo) {
	// HEADER: "II. INFORMACIÓN GENERAL DEL CONSULTANTE" (fondo gris claro #EFEFEF)
	pdf.SetFillColor(239, 239, 239)  // #EFEFEF gris MUY claro según CLAUDE.md
	pdf.SetTextColor(0, 0, 0)        // Negro
	pdf.SetFont("Arial", "B", FUENTE_NORMAL_10PT)
	
	pdf.CellFormat(ANCHO_UTIL, ALTURA_HEADER_22PX, ProcesarTextoUTF8("II. INFORMACIÓN GENERAL DEL CONSULTANTE"), "1", 1, "L", true, 0, "")
	
	// Configuración para celdas de datos
	pdf.SetFillColor(255, 255, 255)  // Fondo blanco
	pdf.SetFont("Arial", "", FUENTE_PEQUENA_9PT)
	
	// ESTRUCTURA DE TABLA EXACTA SEGÚN CLAUDE.MD (todas las celdas altura 20px)
	
	// Fila 1: Remitido por (dejar vacío si no se proporciona)
	remitido := control.RemitidoPor
	pdf.CellFormat(ANCHO_UTIL, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fmt.Sprintf("Remitido por: %s", remitido)), "1", 1, "L", false, 0, "")
	
	// Fila 2: Correo electrónico (dejar vacío si no se proporciona)
	email := control.CorreoElectronico
	pdf.CellFormat(ANCHO_UTIL, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fmt.Sprintf("Correo electrónico: %s", email)), "1", 1, "L", false, 0, "")
	
	// Fila 3: 1. Nombre (COMPLETA - nombres pueden ser muy largos)
	nombre := control.NombreConsultante
	// Truncar nombre si es muy largo para evitar desbordamiento
	if len(nombre) > 50 {
		nombre = nombre[:47] + "..."
	}
	pdf.CellFormat(ANCHO_UTIL, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fmt.Sprintf("1. Nombre: %s", nombre)), "1", 1, "L", false, 0, "")
	
	// Fila 4: 2. Edad (30%) | 3. Fecha de nacimiento (70%)
	edad := control.Edad
	edadText := ""
	if edad > 0 {
		edadText = fmt.Sprintf("%d", edad)
	}
	pdf.CellFormat(ANCHO_UTIL*0.3, ALTURA_CELDA_20PX, fmt.Sprintf("2. Edad: %s", edadText), "1", 0, "L", false, 0, "")
	
	// Mostrar fecha de nacimiento real si está disponible
	fechaNacText := "3. Fecha de nacimiento   Día:    Mes:    Año:"
	if control.FechaNacimientoDia > 0 && control.FechaNacimientoMes > 0 && control.FechaNacimientoAno > 0 {
		fechaNacText = fmt.Sprintf("3. Fecha de nacimiento   Día: %d   Mes: %d   Año: %d", 
			control.FechaNacimientoDia, control.FechaNacimientoMes, control.FechaNacimientoAno)
	}
	pdf.CellFormat(ANCHO_UTIL*0.7, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fechaNacText), "1", 1, "L", false, 0, "")
	
	// Fila 5: 4. Lugar de nacimiento (60%) | 5. Sexo (40%)
	lugarNac := control.LugarNacimiento
	// Truncar lugar de nacimiento si es muy largo para evitar desbordamiento
	if len(lugarNac) > 25 {
		lugarNac = lugarNac[:22] + "..."
	}
	pdf.CellFormat(ANCHO_UTIL*0.6, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fmt.Sprintf("4. Lugar de nacimiento: %s", lugarNac)), "1", 0, "L", false, 0, "")
	
	// Checkboxes según CLAUDE.md con formato [ ] y [ x ]
	sexoF := "[ ]"
	sexoM := "[ ]"
	switch control.Sexo {
	case "Femenino":
		sexoF = "[ x ]"
	case "Masculino":
		sexoM = "[ x ]"
	// No default - dejar vacío si no se especifica
	}
	sexoText := fmt.Sprintf("5. Sexo\nFemenino %s  Masculino %s", sexoF, sexoM)
	pdf.CellFormat(ANCHO_UTIL*0.4, ALTURA_CELDA_20PX, sexoText, "1", 1, "L", false, 0, "")
	
	// Fila 6: 7. Número de documento (55%) | 8. Lugar de expedición (45%)
	numeroDoc := control.NumeroDocumento
	lugarExp := control.LugarExpedicion
	// Truncar lugar de expedición si es muy largo
	if len(lugarExp) > 18 {
		lugarExp = lugarExp[:15] + "..."
	}
	pdf.CellFormat(ANCHO_UTIL*0.55, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fmt.Sprintf("7. Número de documento: %s", numeroDoc)), "1", 0, "L", false, 0, "")
	pdf.CellFormat(ANCHO_UTIL*0.45, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fmt.Sprintf("8. Lugar de expedición: %s", lugarExp)), "1", 1, "L", false, 0, "")
	
	// Fila 6: Checkboxes tipo documento con formato [ ] y [ x ]
	tiCheckbox := "[ ]"
	ccCheckbox := "[ ]"
	nuipCheckbox := "[ ]"
	switch control.TipoDocumento {
	case "T.I.":
		tiCheckbox = "[ x ]"
	case "C.C.":
		ccCheckbox = "[ x ]"
	case "NUIP":
		nuipCheckbox = "[ x ]"
	// No default - dejar vacío si no se especifica
	}
	tipodocText := fmt.Sprintf("%s T.I.    %s C.C.    %s NUIP", tiCheckbox, ccCheckbox, nuipCheckbox)
	pdf.CellFormat(ANCHO_UTIL, ALTURA_CELDA_20PX, tipodocText, "1", 1, "L", false, 0, "")
	
	// Fila 8: 9. Dirección (COMPLETA - direcciones pueden ser muy largas)
	direccion := control.Direccion
	// Truncar dirección si es muy larga
	if len(direccion) > 60 {
		direccion = direccion[:57] + "..."
	}
	pdf.CellFormat(ANCHO_UTIL, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fmt.Sprintf("9. Dirección: %s", direccion)), "1", 1, "L", false, 0, "")
	
	// Fila 9: 10. Barrio (50%) | Estrato (50%)
	barrio := control.Barrio
	// Truncar barrio si es muy largo
	if len(barrio) > 25 {
		barrio = barrio[:22] + "..."
	}
	estrato := control.Estrato
	estratoText := ""
	if estrato > 0 {
		estratoText = fmt.Sprintf("%d", estrato)
	}
	pdf.CellFormat(ANCHO_UTIL*0.5, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fmt.Sprintf("10. Barrio: %s", barrio)), "1", 0, "L", false, 0, "")
	pdf.CellFormat(ANCHO_UTIL*0.5, ALTURA_CELDA_20PX, fmt.Sprintf("Estrato: %s", estratoText), "1", 1, "L", false, 0, "")
	
	// Fila 10: 11. Número telefónico (50%) | 12. Número celular (50%) - MISMA FILA según CLAUDE.md
	telefonico := control.NumeroTelefonico
	celular := control.NumeroCelular
	pdf.CellFormat(ANCHO_UTIL*0.5, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fmt.Sprintf("11. Número telefónico: %s", telefonico)), "1", 0, "L", false, 0, "")
	pdf.CellFormat(ANCHO_UTIL*0.5, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fmt.Sprintf("12. Número celular: %s", celular)), "1", 1, "L", false, 0, "")
	
	// Fila 11: 13. Estado civil actual (COMPLETA)
	estadoCivil := control.EstadoCivil
	// Truncar estado civil si es muy largo
	if len(estadoCivil) > 40 {
		estadoCivil = estadoCivil[:37] + "..."
	}
	pdf.CellFormat(ANCHO_UTIL, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fmt.Sprintf("13. Estado civil actual: %s", estadoCivil)), "1", 1, "L", false, 0, "")
	
	// Fila 12: 15. Profesión u oficio (COMPLETA - profesiones pueden ser largas)
	profesion := control.ProfesionOficio
	// Truncar profesión si es muy larga
	if len(profesion) > 50 {
		profesion = profesion[:47] + "..."
	}
	pdf.CellFormat(ANCHO_UTIL, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fmt.Sprintf("15. Profesión u oficio: %s", profesion)), "1", 1, "L", false, 0, "")
	
	// Fila 13: 14. Escolaridad (completa)
	escolaridad := control.Escolaridad
	// Truncar escolaridad si es muy larga
	if len(escolaridad) > 45 {
		escolaridad = escolaridad[:42] + "..."
	}
	pdf.CellFormat(ANCHO_UTIL, ALTURA_CELDA_20PX, ProcesarTextoUTF8(fmt.Sprintf("14. Escolaridad: %s", escolaridad)), "1", 1, "L", false, 0, "")
	
	// Espaciado 8px según CLAUDE.md
	pdf.Ln(8 * PX_TO_MM)
}

// generarSeccionIII_Exacta - SECCIÓN III EXACTA según CLAUDE.md
func (g *PDFGenerator) generarSeccionIII_Exacta(pdf *gofpdf.Fpdf, control *models.ControlOperativo) {
	// HEADER: "III. BREVE DESCRIPCIÓN DEL CASO" - 22px height, fondo gris claro #EFEFEF
	pdf.SetFillColor(239, 239, 239)  // #EFEFEF gris MUY claro según CLAUDE.md
	pdf.SetTextColor(0, 0, 0)        // Negro
	pdf.SetFont("Arial", "B", FUENTE_NORMAL_10PT)
	
	pdf.CellFormat(ANCHO_UTIL, ALTURA_HEADER_22PX, ProcesarTextoUTF8("III. BREVE DESCRIPCIÓN DEL CASO"), "1", 1, "L", true, 0, "")
	
	// Configuración para área de texto
	pdf.SetFillColor(255, 255, 255)
	pdf.SetFont("Arial", "", FUENTE_PEQUENA_9PT)
	
	// ÁREA DE TEXTO GRANDE: altura 135px según CLAUDE.md
	descripcion := control.DescripcionCaso
	if descripcion == "" {
		descripcion = "Reclamación de salarios y prestaciones no pagadas"  // Ejemplo corto según CLAUDE.md
	}
	descripcionProcesada := ProcesarTextoUTF8(descripcion)
	
	y := pdf.GetY()
	
	// ÁREA OPTIMIZADA para formato CARTA - Sección III
	alturaSeccionIII := ALTURA_DESCRIPCION  // Usar constante definida
	pdf.SetLineWidth(0.75)
	pdf.Rect(MARGEN_IZQUIERDO, y, ANCHO_UTIL, alturaSeccionIII, "D")
	
	// Escribir texto con padding interno
	if descripcionProcesada != "" {
		pdf.SetXY(MARGEN_IZQUIERDO+3, y+3)
		lines := g.splitTextForWidth(descripcionProcesada, 85)
		
		// Ajustar número de líneas según altura disponible
		maxLines := int((alturaSeccionIII - 6) / 4)  // 4mm por línea, 6mm padding
		for i, line := range lines {
			if i < maxLines {
				pdf.SetXY(MARGEN_IZQUIERDO+3, y+3+float64(i*4))
				pdf.Cell(ANCHO_UTIL-6, 4, line)
			}
		}
	}
	
	// Posicionar para siguiente sección
	pdf.SetXY(MARGEN_IZQUIERDO, y+alturaSeccionIII)
	// Espaciado 8px según CLAUDE.md
	pdf.Ln(8 * PX_TO_MM)
}

// generarSeccionIV_Exacta - SECCIÓN IV EXACTA según CLAUDE.md - CORRECCIÓN FIRMA ALINEADA
func (g *PDFGenerator) generarSeccionIV_Exacta(pdf *gofpdf.Fpdf, control *models.ControlOperativo) {
	// HEADER: "IV. CONCEPTO DEL ESTUDIANTE" - 22px height, fondo gris claro #EFEFEF
	pdf.SetFillColor(239, 239, 239)  // #EFEFEF gris MUY claro según CLAUDE.md
	pdf.SetTextColor(0, 0, 0)        // Negro
	pdf.SetFont("Arial", "B", FUENTE_NORMAL_10PT)
	
	pdf.CellFormat(ANCHO_UTIL, ALTURA_HEADER_22PX, ProcesarTextoUTF8("IV. CONCEPTO DEL ESTUDIANTE"), "1", 1, "L", true, 0, "")
	
	pdf.SetFillColor(255, 255, 255)
	pdf.SetFont("Arial", "", FUENTE_PEQUENA_9PT)
	
	concepto := control.ConceptoEstudiante
	if concepto == "" {
		concepto = "Análisis de requisitos legales"  // Default según CLAUDE.md
	}
	conceptoProcesado := ProcesarTextoUTF8(concepto)
	
	y := pdf.GetY()
	
	// RECUADRO OPTIMIZADO para formato CARTA - Sección IV
	alturaSeccionIV := ALTURA_CONCEPTOS  // Usar constante definida
	pdf.SetLineWidth(0.75)
	pdf.Rect(MARGEN_IZQUIERDO, y, ANCHO_UTIL, alturaSeccionIV, "D")
	
	// Escribir texto del concepto
	if conceptoProcesado != "" {
		pdf.SetXY(MARGEN_IZQUIERDO+3, y+3)
		lines := g.splitTextForWidth(conceptoProcesado, 85)
		
		// Ajustar número de líneas según altura disponible (reservar espacio para firma)
		maxLines := int((alturaSeccionIV - 16) / 4)  // 16mm reservados para firma
		for i, line := range lines {
			if i < maxLines {
				pdf.SetXY(MARGEN_IZQUIERDO+3, y+3+float64(i*4))
				pdf.Cell(ANCHO_UTIL-6, 4, line)
			}
		}
	}
	
	// "Firma Estudiante:" ALINEADO A LA DERECHA
	firmaX := MARGEN_IZQUIERDO + ANCHO_UTIL - 35  // 35mm desde el borde derecho
	firmaY := y + alturaSeccionIV - 6       // 6mm desde abajo del área
	
	pdf.SetXY(firmaX, firmaY-3)
	pdf.Cell(30, 3, ProcesarTextoUTF8("Firma Estudiante:"))
	
	// Línea de firma
	pdf.SetXY(firmaX, firmaY)
	pdf.Cell(30, 3, "________________")
	
	// Mover cursor después del recuadro
	pdf.SetXY(MARGEN_IZQUIERDO, y+alturaSeccionIV)
	// Espaciado 8px según CLAUDE.md
	pdf.Ln(8 * PX_TO_MM)
}

// generarSeccionV_Exacta - SECCIÓN V EXACTA según CLAUDE.md - CORRECCIÓN FIRMA ALINEADA
func (g *PDFGenerator) generarSeccionV_Exacta(pdf *gofpdf.Fpdf, control *models.ControlOperativo) {
	// HEADER: "V. CONCEPTO DEL ASESOR JURÍDICO" - 22px height, fondo gris claro #EFEFEF
	pdf.SetFillColor(239, 239, 239)  // #EFEFEF gris MUY claro según CLAUDE.md
	pdf.SetTextColor(0, 0, 0)        // Negro
	pdf.SetFont("Arial", "B", FUENTE_NORMAL_10PT)
	
	pdf.CellFormat(ANCHO_UTIL, ALTURA_HEADER_22PX, ProcesarTextoUTF8("V. CONCEPTO DEL ASESOR JURÍDICO"), "1", 1, "L", true, 0, "")
	
	pdf.SetFillColor(255, 255, 255)
	pdf.SetFont("Arial", "", FUENTE_PEQUENA_9PT)
	
	concepto := control.ConceptoAsesor
	if concepto == "" {
		concepto = "Procede la consulta jurídica"  // Default según CLAUDE.md
	}
	conceptoProcesado := ProcesarTextoUTF8(concepto)
	
	y := pdf.GetY()
	
	// RECUADRO OPTIMIZADO para formato CARTA - Sección V (FINAL DE PÁGINA 1)
	alturaSeccionV := ALTURA_CONCEPTOS  // Usar constante definida
	pdf.SetLineWidth(0.75)
	pdf.Rect(MARGEN_IZQUIERDO, y, ANCHO_UTIL, alturaSeccionV, "D")
	
	// Escribir texto del concepto
	if conceptoProcesado != "" {
		pdf.SetXY(MARGEN_IZQUIERDO+3, y+3)
		lines := g.splitTextForWidth(conceptoProcesado, 85)
		
		// Ajustar número de líneas según altura disponible (reservar espacio para firma)
		maxLines := int((alturaSeccionV - 16) / 4)  // 16mm reservados para firma
		for i, line := range lines {
			if i < maxLines {
				pdf.SetXY(MARGEN_IZQUIERDO+3, y+3+float64(i*4))
				pdf.Cell(ANCHO_UTIL-6, 4, line)
			}
		}
	}
	
	// "Firma Asesor:" ALINEADO A LA DERECHA - CORREGIDO para no cortarse
	firmaX := MARGEN_IZQUIERDO + ANCHO_UTIL - 30  // 30mm desde el borde derecho
	firmaY := y + alturaSeccionV - 6       // 6mm desde abajo del área
	
	pdf.SetXY(firmaX, firmaY-3)
	pdf.Cell(25, 3, ProcesarTextoUTF8("Firma Asesor:"))
	
	// Línea de firma
	pdf.SetXY(firmaX, firmaY)
	pdf.Cell(25, 3, "________________")
	
	// FINAL DE PÁGINA 1 - cursor al final del área
}

// generarSeccionVI_Exacta - PÁGINA 2 SECCIÓN VI EXACTA según CLAUDE.md
func (g *PDFGenerator) generarSeccionVI_Exacta(pdf *gofpdf.Fpdf) {
	// HEADER: "VI. DECLARACIÓN DEL USUARIO" (altura 25px)
	pdf.SetFillColor(239, 239, 239)  // #EFEFEF gris MUY claro según CLAUDE.md
	pdf.SetFont("Arial", "B", FUENTE_NORMAL_10PT)
	pdf.CellFormat(ANCHO_UTIL, ALTURA_HEADER_22PX, ProcesarTextoUTF8("VI. DECLARACIÓN DEL USUARIO"), "1", 1, "L", true, 0, "")
	
	// TEXTO COMPLETO CON NUMERACIÓN (Fuente Arial 9pt, justificado) - EXACTO DE CLAUDE.md
	declaraciones := []string{
		"Que la información arriba suministrada es cierta, se puede verificar y si es comprobada que falta a la verdad y omití información, acepto el archivo y renuncia del caso por parte del CONSULTORIO JURÍDICO de la UNIVERSIDAD COLEGIO MAYOR DE CUNDINAMARCA.",
		"Que la información personal, que suministre y las que requiera para exposición del caso y la orientación ofrecida se compromete a la UNIVERSIDAD COLEGIO (CONSULTORIO JURÍDICO), ni a ninguno de los profesionales que allí labora a si misma al asesorado del caso.",
		"Autorizo que en caso de no poder dar solución a mi problema en el tiempo prudencial o me incurran en ser la misma a diez cietas, o comete alguna falta de personal que me atiende será ARCHIVADO.",
		"Igualmente autorizo a la UNIVERSIDAD COLEGIO MAYOR DE CUNDINAMARCA (CONSULTORIO JURÍDICO), para utilizar la información confidencial suministrada y requerida, con académicos e investigativos.",
		"Manifiesto que mi vinculación al el CONSULTORIO JURÍDICO de la UNIVERSIDAD COLEGIO MAYOR DE CUNDINAMARCA de la existencia de un equipo interdisciplinario que permite dar atención integral a los usuarios y con el fin de mejorar la calidad de vida de nivel individual y/o familiar incluyendo en seguimiento de los casos requeridos.",
	}

	// Configurar fuente para el contenido - Arial 9pt
	pdf.SetFillColor(255, 255, 255)
	pdf.SetFont("Arial", "", FUENTE_PEQUENA_9PT)
	
	y := pdf.GetY()
	
	// RECUADRO PARA EL TEXTO - Calcular altura total necesaria
	alturaTexto := float64(len(declaraciones)*25 + 30) // Aproximadamente 25mm por declaración + 30mm espacio
	
	// Dibujar el recuadro
	pdf.SetLineWidth(0.75)
	pdf.Rect(MARGEN_IZQUIERDO, y, ANCHO_UTIL, alturaTexto, "D")
	
	lineaY := y + 5
	
	// AGREGAR CADA DECLARACIÓN CON NUMERACIÓN
	for i, declaracion := range declaraciones {
		declaracionProcesada := ProcesarTextoUTF8(declaracion)
		
		// NÚMERO en negrita
		pdf.SetXY(MARGEN_IZQUIERDO, lineaY)
		pdf.SetFont("Arial", "B", FUENTE_PEQUENA_9PT)
		pdf.Cell(8, 5, fmt.Sprintf("%d.", i+1))
		
		// TEXTO DE LA DECLARACIÓN - justificado
		pdf.SetFont("Arial", "", FUENTE_PEQUENA_9PT)
		
		// Dividir texto en líneas justificadas
		lines := g.splitTextForWidth(declaracionProcesada, 85)
		
		for _, line := range lines {
			pdf.SetXY(MARGEN_IZQUIERDO+5, lineaY)  // Sangría después del número
			pdf.Cell(ANCHO_UTIL-25, 5, line)
			lineaY += 5
		}
		
		lineaY += 8 // Espacio entre declaraciones
	}
	
	// ÁREA EN BLANCO dentro del recuadro
	lineaY += 20
	
	// PIE DE PÁGINA (alineado a la derecha) dentro del recuadro según CLAUDE.md
	firmaY := y + alturaTexto - 15  // Posicionar firma cerca del borde inferior del recuadro
	pdf.SetXY(MARGEN_IZQUIERDO + ANCHO_UTIL - 50, firmaY)
	pdf.Cell(50, 5, "____________________")
	pdf.SetXY(MARGEN_IZQUIERDO + ANCHO_UTIL - 50, firmaY + 6)
	pdf.Cell(50, 5, ProcesarTextoUTF8("Firma del Usuario"))
}

// generarFooterFinal - FOOTER FINAL según CLAUDE.md
func (g *PDFGenerator) generarFooterFinal(pdf *gofpdf.Fpdf) {
	// FOOTER FINAL (centrado, fuente Arial 8pt) según CLAUDE.md
	pdf.SetXY(MARGEN_IZQUIERDO, ALTO_CARTA - MARGEN_INFERIOR - 10)
	pdf.SetFont("Arial", "", FUENTE_FOOTER_8PT)
	footerText := ProcesarTextoUTF8("Calle 6C No. 94I – 25 Edificio Nuevo Piso 4 – UPK   Bogotá, D.C.    Correo: consultoriojuridico.kennedy@unicolmayor.edu.co")
	pdf.CellFormat(ANCHO_UTIL, 5, footerText, "", 1, "C", false, 0, "")
}

// Función auxiliar para dividir texto por ancho de caracteres
func (g *PDFGenerator) splitTextForWidth(text string, maxChars int) []string {
	var lines []string
	words := strings.Fields(text)
	currentLine := ""
	
	for _, word := range words {
		testLine := currentLine
		if testLine != "" {
			testLine += " "
		}
		testLine += word
		
		if len(testLine) <= maxChars {
			currentLine = testLine
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

// Función para concatenar PDFs usando ghostscript
func (g *PDFGenerator) concatenarPDFs(mainPDFBytes []byte, documentos []models.DocumentoAdjunto) ([]byte, error) {
	// Crear directorio temporal
	tempDir := fmt.Sprintf("/tmp/pdf_merge_%d", time.Now().Unix())
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return nil, fmt.Errorf("error creando directorio temporal: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Guardar el PDF principal
	mainPDFPath := filepath.Join(tempDir, "main.pdf")
	if err := os.WriteFile(mainPDFPath, mainPDFBytes, 0644); err != nil {
		return nil, fmt.Errorf("error guardando PDF principal: %v", err)
	}

	// Preparar lista de PDFs para concatenar
	var pdfPaths []string
	pdfPaths = append(pdfPaths, mainPDFPath)

	// Agregar documentos adjuntos
	for _, doc := range documentos {
		if _, err := os.Stat(doc.RutaArchivo); err == nil {
			pdfPaths = append(pdfPaths, doc.RutaArchivo)
		} else {
			fmt.Printf("Warning: Documento adjunto no encontrado: %s\n", doc.RutaArchivo)
		}
	}

	// Si solo tenemos el PDF principal, devolverlo
	if len(pdfPaths) == 1 {
		return mainPDFBytes, nil
	}

	// Concatenar PDFs usando ghostscript
	outputPath := filepath.Join(tempDir, "merged.pdf")
	
	// Construir comando gs
	args := []string{
		"-dNOPAUSE",
		"-dBATCH",
		"-sDEVICE=pdfwrite",
		fmt.Sprintf("-sOutputFile=%s", outputPath),
	}
	args = append(args, pdfPaths...)
	
	cmd := exec.Command("gs", args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("error ejecutando ghostscript: %v, stderr: %s", err, stderr.String())
	}

	// Leer el PDF concatenado
	mergedBytes, err := os.ReadFile(outputPath)
	if err != nil {
		return nil, fmt.Errorf("error leyendo PDF concatenado: %v", err)
	}

	return mergedBytes, nil
}

// GenerarControlOperativoConAdjuntos genera el PDF del control operativo y anexa los archivos PDF adjuntos
func (g *PDFGenerator) GenerarControlOperativoConAdjuntos(control *models.ControlOperativo, archivosAdjuntos []string) ([]byte, error) {
	// Primero generar el PDF principal del control operativo
	pdfPrincipal, err := g.GenerarControlOperativo(control)
	if err != nil {
		return nil, fmt.Errorf("error generando PDF principal: %w", err)
	}
	
	// Si no hay archivos adjuntos, retornar solo el PDF principal
	if len(archivosAdjuntos) == 0 {
		return pdfPrincipal, nil
	}
	
	// Crear archivo temporal para el PDF principal
	tmpDir := "storage/temp"
	os.MkdirAll(tmpDir, 0755)
	
	timestamp := time.Now().Unix()
	principalFile := filepath.Join(tmpDir, fmt.Sprintf("principal_%d.pdf", timestamp))
	
	// Escribir el PDF principal al archivo temporal
	err = os.WriteFile(principalFile, pdfPrincipal, 0644)
	if err != nil {
		return nil, fmt.Errorf("error escribiendo PDF principal temporal: %w", err)
	}
	defer os.Remove(principalFile)
	
	// Preparar lista de archivos para combinar
	archivosParaCombinar := []string{principalFile}
	
	// Agregar archivos adjuntos PDF que existan
	for _, rutaArchivo := range archivosAdjuntos {
		if filepath.Ext(strings.ToLower(rutaArchivo)) == ".pdf" {
			if _, err := os.Stat(rutaArchivo); err == nil {
				archivosParaCombinar = append(archivosParaCombinar, rutaArchivo)
			} else {
				fmt.Printf("⚠️ Warning: Archivo no encontrado: %s\n", rutaArchivo)
			}
		}
	}
	
	// Si solo tenemos el PDF principal, retornarlo
	if len(archivosParaCombinar) == 1 {
		return pdfPrincipal, nil
	}
	
	// Usar gs (ghostscript) para combinar PDFs si está disponible
	outputFile := filepath.Join(tmpDir, fmt.Sprintf("combined_%d.pdf", timestamp))
	defer os.Remove(outputFile)
	
	err = g.combinarPDFsConGhostscript(archivosParaCombinar, outputFile)
	if err != nil {
		fmt.Printf("⚠️ Warning: No se pudo usar ghostscript, retornando PDF principal: %v\n", err)
		return pdfPrincipal, nil
	}
	
	// Leer el PDF combinado
	combinedBytes, err := os.ReadFile(outputFile)
	if err != nil {
		fmt.Printf("⚠️ Warning: Error leyendo PDF combinado, retornando PDF principal: %v\n", err)
		return pdfPrincipal, nil
	}
	
	return combinedBytes, nil
}

// combinarPDFsConGhostscript combina múltiples PDFs usando ghostscript
func (g *PDFGenerator) combinarPDFsConGhostscript(archivos []string, output string) error {
	// Verificar si ghostscript está disponible
	_, err := exec.LookPath("gs")
	if err != nil {
		return fmt.Errorf("ghostscript no encontrado: %w", err)
	}
	
	// Construir comando de ghostscript
	args := []string{
		"-dNOPAUSE",
		"-dBATCH", 
		"-sDEVICE=pdfwrite",
		"-sOutputFile=" + output,
	}
	args = append(args, archivos...)
	
	// Ejecutar comando
	cmd := exec.Command("gs", args...)
	output_bytes, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("error ejecutando ghostscript: %w, output: %s", err, string(output_bytes))
	}
	
	return nil
}