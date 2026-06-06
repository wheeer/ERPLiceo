import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class DashboardPdfService {

  constructor() {}

  async generateDashboardReport(metrics: any[], chartURIs: string[]) {
    // 1. Crear documento A4
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageHeight = doc.internal.pageSize.getHeight();
    let cursorY = 20;

    // --- CABECERA OFICIAL ---
    doc.setFillColor(30, 58, 138); // Color corporativo primario
    doc.rect(14, cursorY - 6, 8, 8, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // text-slate-800
    doc.text("Liceo EMTP — Informe de Estado Ejecutivo", 26, cursorY);
    
    cursorY += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // text-slate-500
    const fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Fecha de emisión: ${fecha}`, 14, cursorY);
    
    cursorY += 15;

    // --- SECCIÓN 1: RESUMEN DE MÉTRICAS ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Resumen de Métricas Críticas", 14, cursorY);
    cursorY += 6;

    // Formatear métricas para la tabla
    const tableBody = metrics.map(m => {
      // Remover sufijos como "vs mes anterior" de la variación
      const changeText = m.change.replace(' vs mes anterior', '').replace(' vs semana anterior', '');
      return [m.title, m.value, changeText];
    });
    
    autoTable(doc, {
      startY: cursorY,
      head: [['Indicador / Área', 'Valor Actual', 'Variación (Tendencia)']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4, textColor: [51, 65, 85] }
    });
    
    cursorY = (doc as any).lastAutoTable.finalY + 15;

    // --- SECCIÓN 2: ANÁLISIS GRÁFICO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Análisis Gráfico Consolidado", 14, cursorY);
    cursorY += 8;

    // Dibujar cada gráfico exportado
    for (const uri of chartURIs) {
      if (uri) {
        // Altura de cada gráfico: 75mm
        if (cursorY + 75 > pageHeight - 20) {
          doc.addPage();
          cursorY = 20;
        }
        
        doc.addImage(uri, 'PNG', 14, cursorY, 182, 75);
        cursorY += 80;
      }
    }

    // Pie de página para todas las páginas
    const totalPages = doc.getNumberOfPages();
    for(let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generado automáticamente por el Sistema ERP EMTP - Página ${i} de ${totalPages}`, 14, pageHeight - 10);
    }

    // 5. Descargar archivo
    const safeDate = new Date().toISOString().split('T')[0];
    doc.save(`Informe_Dashboard_EMTP_${safeDate}.pdf`);
  }

  async generateExecutiveReport(moduleName: string, filterContext: string, currentUser: string, chartUri: string, summaryData: any[][]) {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageHeight = doc.internal.pageSize.getHeight();
    let cursorY = 20;

    // --- 1. CABECERA CONTEXTUAL ---
    doc.setFillColor(30, 58, 138); 
    doc.rect(14, cursorY - 6, 8, 8, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(`Informe Ejecutivo: ${moduleName.toUpperCase()}`, 26, cursorY);
    
    cursorY += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' });
    doc.text(`Generado por: ${currentUser}`, 14, cursorY);
    cursorY += 5;
    doc.text(`Período/Filtros: ${filterContext}`, 14, cursorY);
    cursorY += 5;
    doc.text(`Emisión: ${fecha}`, 14, cursorY);
    
    cursorY += 15;

    // --- 2. IMPACTO VISUAL (Gráfico) ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Tendencia Visual", 14, cursorY);
    cursorY += 6;

    if (chartUri) {
      // Dibujar gráfico con un ancho máximo de 180mm y alto proporcional
      doc.addImage(chartUri, 'PNG', 14, cursorY, 180, 80);
      cursorY += 85;
    }

    // --- 3. TABLA RESUMEN (Cifras Clave) ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Resumen de Cifras Clave", 14, cursorY);
    cursorY += 6;

    autoTable(doc, {
      startY: cursorY,
      head: [['Métrica / Item', 'Valor Consolidado']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      styles: { fontSize: 11, cellPadding: 5, textColor: [51, 65, 85] }
    });

    // Pie de página
    const totalPages = doc.getNumberOfPages();
    for(let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Reporte Oficial ERP EMTP - Página ${i} de ${totalPages}`, 14, pageHeight - 10);
    }

    const safeDate = new Date().toISOString().split('T')[0];
    doc.save(`Reporte_Ejecutivo_${moduleName.replace(/\s+/g, '_')}_${safeDate}.pdf`);
  }
}
