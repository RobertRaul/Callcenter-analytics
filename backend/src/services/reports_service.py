# services/reports_service.py
"""
Servicio para generar reportes en diferentes formatos (Excel, PDF)
"""

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from datetime import datetime
import io
import logging

logger = logging.getLogger(__name__)

class ReportsService:
    """Servicio para generación de reportes"""

    def generate_excel_report(self, data: dict, report_type: str) -> bytes:
        """
        Genera un reporte en formato Excel

        Args:
            data: Diccionario con los datos del reporte
            report_type: Tipo de reporte (general, agents, queues, calls)

        Returns:
            Bytes del archivo Excel generado
        """
        wb = Workbook()
        ws = wb.active
        ws.title = f"Reporte {report_type}"

        # Estilos
        header_font = Font(bold=True, size=12, color="FFFFFF")
        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        title_font = Font(bold=True, size=14)

        # Título
        ws['A1'] = f"Reporte de {report_type.upper()}"
        ws['A1'].font = title_font
        ws['A2'] = f"Generado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

        row = 4

        if report_type == "general":
            self._add_general_report_to_excel(ws, data, row, header_font, header_fill)
        elif report_type == "agents":
            self._add_agents_report_to_excel(ws, data, row, header_font, header_fill)
        elif report_type == "queues":
            self._add_queues_report_to_excel(ws, data, row, header_font, header_fill)
        elif report_type == "calls":
            self._add_calls_report_to_excel(ws, data, row, header_font, header_fill)

        # Ajustar ancho de columnas
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(cell.value)
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width

        # Guardar en memoria
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output.getvalue()

    def _add_general_report_to_excel(self, ws, data, start_row, header_font, header_fill):
        """Agrega datos del reporte general"""
        # Resumen
        ws[f'A{start_row}'] = "RESUMEN GENERAL"
        ws[f'A{start_row}'].font = header_font
        ws[f'A{start_row}'].fill = header_fill

        start_row += 1
        summary_data = [
            ["Métrica", "Valor"],
            ["Total Llamadas", data.get('total_calls', 0)],
            ["Contestadas", data.get('answered_calls', 0)],
            ["Abandonadas", data.get('abandoned_calls', 0)],
            ["Tasa de Respuesta", f"{data.get('answer_rate', 0):.2f}%"],
            ["Duración Promedio", f"{data.get('avg_duration', 0):.0f}s"],
        ]

        for row_data in summary_data:
            ws.append(row_data)

    def _add_agents_report_to_excel(self, ws, data, start_row, header_font, header_fill):
        """Agrega datos del reporte de agentes"""
        ws[f'A{start_row}'] = "ESTADÍSTICAS POR AGENTE"
        ws[f'A{start_row}'].font = header_font
        ws[f'A{start_row}'].fill = header_fill

        start_row += 1
        headers = ["Agente", "Llamadas", "Completadas", "Tiempo Total", "Promedio"]
        ws.append(headers)

        for agent in data.get('agents', []):
            ws.append([
                agent.get('agent', ''),
                agent.get('total_calls', 0),
                agent.get('completed_calls', 0),
                agent.get('total_talk_time_formatted', '00:00:00'),
                f"{agent.get('avg_talk_time', 0):.0f}s"
            ])

    def _add_queues_report_to_excel(self, ws, data, start_row, header_font, header_fill):
        """Agrega datos del reporte de colas"""
        ws[f'A{start_row}'] = "ESTADÍSTICAS POR COLA"
        ws[f'A{start_row}'].font = header_font
        ws[f'A{start_row}'].fill = header_fill

        start_row += 1
        headers = ["Cola", "Total", "Contestadas", "Abandonadas", "Tasa Respuesta", "Nivel Servicio"]
        ws.append(headers)

        for queue in data.get('queues', []):
            ws.append([
                queue.get('queue_name', ''),
                queue.get('total_calls', 0),
                queue.get('answered_calls', 0),
                queue.get('abandoned_calls', 0),
                f"{queue.get('answer_rate', 0):.2f}%",
                f"{queue.get('service_level', 0):.2f}%"
            ])

    def _add_calls_report_to_excel(self, ws, data, start_row, header_font, header_fill):
        """Agrega datos del reporte de llamadas"""
        ws[f'A{start_row}'] = "DETALLE DE LLAMADAS"
        ws[f'A{start_row}'].font = header_font
        ws[f'A{start_row}'].fill = header_fill

        start_row += 1
        headers = ["Fecha", "Número", "Cola", "Agente", "Estado", "Espera", "Conversación"]
        ws.append(headers)

        for call in data.get('calls', []):
            ws.append([
                call.get('calldate', ''),
                call.get('phone_number', ''),
                call.get('queuename', ''),
                call.get('agent', ''),
                call.get('status', ''),
                call.get('wait_time_formatted', ''),
                call.get('talk_time_formatted', '')
            ])

    def generate_pdf_report(self, data: dict, report_type: str) -> bytes:
        """
        Genera un reporte en formato PDF

        Args:
            data: Diccionario con los datos del reporte
            report_type: Tipo de reporte

        Returns:
            Bytes del archivo PDF generado
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()

        # Título
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#366092'),
            spaceAfter=30,
            alignment=1
        )

        title = Paragraph(f"Reporte de {report_type.upper()}", title_style)
        elements.append(title)

        subtitle = Paragraph(
            f"Generado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            styles['Normal']
        )
        elements.append(subtitle)
        elements.append(Spacer(1, 0.3*inch))

        if report_type == "general":
            self._add_general_report_to_pdf(elements, data, styles)
        elif report_type == "agents":
            self._add_agents_report_to_pdf(elements, data, styles)
        elif report_type == "queues":
            self._add_queues_report_to_pdf(elements, data, styles)
        elif report_type == "calls":
            self._add_calls_report_to_pdf(elements, data, styles)

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    def _add_general_report_to_pdf(self, elements, data, styles):
        """Agrega datos generales al PDF"""
        table_data = [
            ["Métrica", "Valor"],
            ["Total Llamadas", str(data.get('total_calls', 0))],
            ["Contestadas", str(data.get('answered_calls', 0))],
            ["Abandonadas", str(data.get('abandoned_calls', 0))],
            ["Tasa de Respuesta", f"{data.get('answer_rate', 0):.2f}%"],
            ["Duración Promedio", f"{data.get('avg_duration', 0):.0f}s"],
        ]

        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#366092')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(table)

    def _add_agents_report_to_pdf(self, elements, data, styles):
        """Agrega datos de agentes al PDF"""
        table_data = [["Agente", "Llamadas", "Completadas", "Tiempo Total", "Promedio"]]

        for agent in data.get('agents', []):
            table_data.append([
                agent.get('agent', ''),
                str(agent.get('total_calls', 0)),
                str(agent.get('completed_calls', 0)),
                agent.get('total_talk_time_formatted', '00:00:00'),
                f"{agent.get('avg_talk_time', 0):.0f}s"
            ])

        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#366092')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(table)

    def _add_queues_report_to_pdf(self, elements, data, styles):
        """Agrega datos de colas al PDF"""
        table_data = [["Cola", "Total", "Contestadas", "Abandonadas", "Tasa Resp.", "Nivel Serv."]]

        for queue in data.get('queues', []):
            table_data.append([
                queue.get('queue_name', ''),
                str(queue.get('total_calls', 0)),
                str(queue.get('answered_calls', 0)),
                str(queue.get('abandoned_calls', 0)),
                f"{queue.get('answer_rate', 0):.1f}%",
                f"{queue.get('service_level', 0):.1f}%"
            ])

        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#366092')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(table)

    def _add_calls_report_to_pdf(self, elements, data, styles):
        """Agrega datos de llamadas al PDF"""
        table_data = [["Fecha", "Número", "Agente", "Estado", "Tiempo"]]

        for call in data.get('calls', [])[:50]:  # Limitar a 50 para PDF
            table_data.append([
                call.get('calldate', '')[:16],
                call.get('phone_number', ''),
                call.get('agent', '')[:10],
                call.get('status', '')[:10],
                call.get('talk_time_formatted', '')
            ])

        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#366092')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(table)

# Instancia global
reports_service = ReportsService()
