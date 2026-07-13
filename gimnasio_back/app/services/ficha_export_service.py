import base64
from html import escape
from pathlib import Path

from app.models.ficha_inscripcion import FichaInscripcion

BRANDING_DIR = Path(__file__).resolve().parents[1] / "static" / "branding"

CONDICIONES_LABELS = {
    "hipertension": "Hipertensión arterial",
    "pulmonar": "Enfermedades pulmonares",
    "diabetes": "Diabetes",
    "osteoarticular": "Enfermedades osteoarticulares",
    "neurologica": "Enfermedades neurológicas",
    "convulsiones": "Convulsiones",
}

FORM_VERSION = "1.0"
FORM_CODE = "DUBSS-FR-03"


def _si_no(val: bool) -> str:
    return "Sí" if val else "No"


def _fmt_date(d) -> str:
    if not d:
        return "—"
    return d.strftime("%d/%m/%Y")


def _img_data_uri(filename: str) -> str:
    path = BRANDING_DIR / filename
    if not path.is_file():
        return ""
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def render_ficha_html(ficha: FichaInscripcion) -> str:
    condiciones = ficha.condiciones or {}
    cond_lines = []
    for key, label in CONDICIONES_LABELS.items():
        mark = "X" if condiciones.get(key) else " "
        cond_lines.append(
            f"<tr><td>[{mark}] {escape(label)}</td><td>{_si_no(bool(condiciones.get(key)))}</td></tr>"
        )
    condiciones_html = "\n".join(cond_lines)

    logo_dubss = _img_data_uri("logo-dubss.png")
    logo_uagrm = _img_data_uri("logo-uagrm-watermark.png")

    dubss_img = (
        f'<img src="{logo_dubss}" alt="DUBSS UAGRM" class="header-logo" />'
        if logo_dubss
        else '<div class="header-logo-placeholder">DUBSS</div>'
    )
    watermark_img = (
        f'<img src="{logo_uagrm}" alt="" class="watermark-img" />' if logo_uagrm else ""
    )

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Ficha inscripción — {escape(ficha.nombre)}</title>
  <style>
    @page {{
      margin: 14mm 12mm;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      margin: 0;
      padding: 24px;
      color: #111;
      background: #fff;
    }}
    .page {{
      position: relative;
      max-width: 210mm;
      margin: 0 auto;
    }}
    .watermark {{
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 0;
      pointer-events: none;
      opacity: 0.12;
      width: 62%;
      max-width: 480px;
      text-align: center;
    }}
    .watermark-img {{
      width: 100%;
      height: auto;
    }}
    .content {{
      position: relative;
      z-index: 1;
    }}
    .header {{
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 18px;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 12px;
    }}
    .header-logo {{
      width: 88px;
      height: auto;
      flex-shrink: 0;
    }}
    .header-logo-placeholder {{
      width: 88px;
      height: 88px;
      border: 1px solid #ccc;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      flex-shrink: 0;
    }}
    .header-center {{
      flex: 1;
      text-align: center;
      padding-top: 4px;
    }}
    .header-center .form-label {{
      font-size: 10px;
      letter-spacing: 0.5px;
      margin: 0;
    }}
    .header-center .form-code {{
      font-size: 13px;
      font-weight: bold;
      margin: 4px 0;
    }}
    .header-center .form-title {{
      font-size: 14px;
      font-weight: bold;
      margin: 6px 0 8px;
      text-transform: uppercase;
    }}
    .header-meta {{
      display: flex;
      justify-content: center;
      gap: 24px;
      font-size: 10px;
      color: #333;
      flex-wrap: wrap;
    }}
    .header-meta span strong {{
      font-weight: 600;
    }}
    .ficha-meta {{
      text-align: center;
      font-size: 10px;
      color: #444;
      margin-bottom: 16px;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      background: rgba(255, 255, 255, 0.92);
    }}
    th, td {{
      border: 1px solid #999;
      padding: 5px 7px;
      vertical-align: top;
    }}
    th {{
      background: rgba(245, 245, 245, 0.95);
      text-align: left;
      width: 36%;
      font-weight: 600;
    }}
    .section {{
      font-weight: bold;
      background: rgba(230, 230, 230, 0.95);
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.3px;
    }}
    .no-print {{
      margin-bottom: 16px;
    }}
    @media print {{
      body {{ padding: 0; }}
      .no-print {{ display: none !important; }}
      .watermark {{ opacity: 0.1; }}
      table, th, td {{ background: transparent; }}
      th {{ background: #f5f5f5; }}
      .section {{ background: #eee; }}
    }}
  </style>
</head>
<body>
  <div class="page">
    <div class="watermark" aria-hidden="true">
      {watermark_img}
    </div>

    <div class="content">
      <button class="no-print" type="button" onclick="window.print()" style="padding:8px 16px;cursor:pointer;">
        Imprimir / Guardar PDF
      </button>

      <header class="header">
        {dubss_img}
        <div class="header-center">
          <p class="form-label">FORMULARIO</p>
          <p class="form-code">{FORM_CODE}</p>
          <p class="form-title">Inscripción Gimnasio Universitario</p>
          <div class="header-meta">
            <span><strong>Versión:</strong> {FORM_VERSION}</span>
            <span><strong>Fecha:</strong> {_fmt_date(ficha.firma_fecha)}</span>
            <span><strong>Aprobado por:</strong> —</span>
          </div>
        </div>
      </header>

      <p class="ficha-meta">
        Registro digital v{ficha.version} · Vigente hasta {_fmt_date(ficha.fecha_vigencia_hasta)} · Estado: {escape(ficha.estado)}
      </p>

      <table>
        <tr><td colspan="2" class="section">Datos personales</td></tr>
        <tr><th>Nombres y apellidos</th><td>{escape(ficha.nombre)}</td></tr>
        <tr><th>C.I. / Código o registro</th><td>{escape(ficha.cs or '—')}</td></tr>
        <tr><th>Facultad / Carrera / Unidad</th><td>{escape(ficha.carrera or '—')}</td></tr>
        <tr><th>Domicilio</th><td>{escape(ficha.domicilio or '—')}</td></tr>
        <tr><th>Correo electrónico</th><td>{escape(ficha.email)}</td></tr>
        <tr><th>Celular</th><td>{escape(ficha.telefono or '—')}</td></tr>
        <tr><th>Fecha de nacimiento</th><td>{_fmt_date(ficha.fecha_nacimiento)}</td></tr>
        <tr><th>Sexo</th><td>{'F' if ficha.sexo == 'F' else 'M' if ficha.sexo == 'M' else '—'}</td></tr>
        <tr><th>Grupo sanguíneo</th><td>{escape(ficha.grupo_sanguineo or '—')}</td></tr>
        <tr><th>Altura</th><td>{ficha.altura_cm or '—'} cm</td></tr>
        <tr><th>Peso</th><td>{ficha.peso_kg or '—'} kg</td></tr>
        <tr><th>Mes / Horario</th><td>{escape(ficha.mes_horario or '—')}</td></tr>
      </table>

      <table>
        <tr><td colspan="2" class="section">Cuestionario médico — Gimnasio Universitario</td></tr>
        <tr><th>¿Antecedentes cardiovasculares?</th><td>{_si_no(ficha.antecedentes_cardiovasculares)}<br/>{escape(ficha.antecedentes_cardiovasculares_detalle or '')}</td></tr>
        <tr><th>¿Procedimientos cardiovasculares?</th><td>{_si_no(ficha.procedimientos_cardiovasculares)}<br/>{escape(ficha.procedimientos_cardiovasculares_detalle or '')}</td></tr>
        <tr><th colspan="2">¿Padece alguna de las siguientes condiciones?</th></tr>
        {condiciones_html}
        <tr><th>Detalle condiciones</th><td>{escape(ficha.condiciones_detalle or '—')}</td></tr>
        <tr><th>¿Intervención quirúrgica?</th><td>{_si_no(ficha.intervencion_quirurgica)}<br/>{escape(ficha.intervencion_quirurgica_detalle or '')}</td></tr>
        <tr><th>¿Fracturas óseas?</th><td>{_si_no(ficha.fracturas)}<br/>{escape(ficha.fracturas_detalle or '')}</td></tr>
        <tr><th>¿Síntomas en práctica deportiva?</th><td>{_si_no(ficha.sintomas_deportivos)}<br/>{escape(ficha.sintomas_deportivos_detalle or '')}</td></tr>
      </table>

      <table>
        <tr><td colspan="2" class="section">Declaración jurada</td></tr>
        <tr><th>Acepta reglamento del gimnasio</th><td>{_si_no(ficha.acepta_reglamento)}</td></tr>
        <tr><th>Declaración jurada aceptada</th><td>{_si_no(ficha.declaracion_jurada)}</td></tr>
        <tr><th>Aclaración de firma</th><td>{escape(ficha.firma_nombre)}</td></tr>
        <tr><th>C.I.</th><td>{escape(ficha.firma_ci or '—')}</td></tr>
        <tr><th>Fecha</th><td>{_fmt_date(ficha.firma_fecha)}</td></tr>
        <tr><th>Certificado médico</th><td>{'Recibido' if ficha.certificado_medico_recibido else 'Pendiente' if ficha.requiere_certificado_medico else 'No requerido'}</td></tr>
      </table>
    </div>
  </div>
</body>
</html>"""
