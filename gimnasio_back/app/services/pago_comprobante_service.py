from __future__ import annotations

from html import escape
from typing import Any, Optional

from app.models.pago import Pago


def _fmt_date(d) -> str:
    if not d:
        return "—"
    return d.strftime("%d/%m/%Y")


def _fmt_money(monto) -> str:
    try:
        return f"Bs. {float(monto):.2f}"
    except (TypeError, ValueError):
        return f"Bs. {monto}"


def concepto_pago(pago: Pago, inscripcion=None) -> str:
    ins = inscripcion if inscripcion is not None else getattr(pago, "inscripcion", None)
    if ins is not None:
        if ins.tipo == "sala_maquinas":
            mes = ins.mes_inicio.strftime("%m/%Y") if ins.mes_inicio else ""
            return f"Inscripción sala de máquinas ({mes})" if mes else "Inscripción sala de máquinas"
        act = getattr(ins, "actividad", None)
        nombre = act.nombre if act else "Actividad"
        mes = ins.mes_inicio.strftime("%m/%Y") if ins.mes_inicio else ""
        return f"Inscripción actividad: {nombre}" + (f" ({mes})" if mes else "")
    if pago.membresia_id:
        return f"Membresía / plan (ID {pago.membresia_id})"
    return "Pago de servicios del gimnasio"


def metodo_label(metodo: Optional[str]) -> str:
    m = (metodo or "").lower()
    labels = {
        "qr": "QR Simple",
        "transferencia": "Transferencia bancaria",
        "efectivo": "Efectivo",
        "tarjeta": "Tarjeta POS",
    }
    return labels.get(m, metodo or "—")


def render_comprobante_pago_html(
    pago: Pago,
    *,
    org: Optional[dict[str, Any]] = None,
    inscripcion=None,
) -> str:
    org = org or {}
    org_nombre = org.get("nombre_organizacion") or "UAGRM-GYM"
    ubicacion = org.get("ubicacion") or "Gimnasio universitario U.A.G.R.M."
    telefono = org.get("telefono_contacto") or "—"
    email = org.get("email_contacto") or "—"

    estudiante = pago.estudiante
    est_nombre = estudiante.nombre if estudiante else "—"
    est_email = estudiante.email if estudiante else "—"
    est_ci = getattr(estudiante, "cs", None) or "—"
    est_registro = getattr(estudiante, "registro_univercotario", None) or "—"

    nro = f"CMP-{pago.id:06d}"
    concepto = concepto_pago(pago, inscripcion)

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Comprobante {escape(nro)}</title>
  <style>
    @page {{ margin: 14mm 12mm; }}
    * {{ box-sizing: border-box; }}
    body {{
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      margin: 0;
      padding: 24px;
      color: #111;
      background: #fff;
    }}
    .sheet {{
      max-width: 720px;
      margin: 0 auto;
      border: 1px solid #ccc;
      padding: 28px 32px;
    }}
    .head {{
      display: flex;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 2px solid #166534;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }}
    .brand {{ font-size: 18px; font-weight: 700; color: #166534; }}
    .sub {{ color: #555; font-size: 11px; margin-top: 4px; }}
    .nro {{ text-align: right; }}
    .nro strong {{ font-size: 14px; }}
    h1 {{
      font-size: 16px;
      margin: 0 0 16px;
      text-align: center;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }}
    table.info {{
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }}
    table.info th, table.info td {{
      border: 1px solid #ddd;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }}
    table.info th {{
      width: 32%;
      background: #f3f4f6;
      font-weight: 600;
    }}
    .monto {{
      font-size: 20px;
      font-weight: 700;
      color: #166534;
    }}
    .foot {{
      margin-top: 28px;
      display: flex;
      justify-content: space-between;
      gap: 24px;
      font-size: 11px;
      color: #444;
    }}
    .firma {{
      width: 45%;
      text-align: center;
      padding-top: 48px;
      border-top: 1px solid #999;
    }}
    .actions {{
      max-width: 720px;
      margin: 0 auto 12px;
      text-align: right;
    }}
    .actions button {{
      background: #166534;
      color: #fff;
      border: 0;
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    }}
    @media print {{
      .actions {{ display: none; }}
      body {{ padding: 0; }}
      .sheet {{ border: 0; }}
    }}
  </style>
</head>
<body>
  <div class="actions">
    <button type="button" onclick="window.print()">Imprimir / Guardar PDF</button>
  </div>
  <div class="sheet">
    <div class="head">
      <div>
        <div class="brand">{escape(str(org_nombre))}</div>
        <div class="sub">{escape(str(ubicacion))}</div>
        <div class="sub">Tel: {escape(str(telefono))} · {escape(str(email))}</div>
      </div>
      <div class="nro">
        <div><strong>{escape(nro)}</strong></div>
        <div class="sub">Fecha de emisión: {_fmt_date(pago.fecha)}</div>
      </div>
    </div>

    <h1>Comprobante de pago</h1>

    <table class="info">
      <tr><th>Estudiante / pagador</th><td>{escape(est_nombre)}</td></tr>
      <tr><th>Correo</th><td>{escape(est_email)}</td></tr>
      <tr><th>CI / Registro</th><td>{escape(str(est_ci))} / {escape(str(est_registro))}</td></tr>
      <tr><th>Concepto</th><td>{escape(concepto)}</td></tr>
      <tr><th>Método de pago</th><td>{escape(metodo_label(pago.metodo))}</td></tr>
      <tr><th>Referencia / Nº operación</th><td>{escape(pago.referencia or "—")}</td></tr>
      <tr><th>Monto pagado</th><td class="monto">{escape(_fmt_money(pago.monto))}</td></tr>
      <tr><th>Notas</th><td>{escape(pago.notas or "—")}</td></tr>
      <tr><th>ID interno</th><td>Pago #{pago.id}</td></tr>
    </table>

    <p style="font-size:11px;color:#555;margin:0;">
      Documento generado por el sistema UAGRM-GYM. Válido como constancia de pago registrado
      en la plataforma. Para respaldar el cobro, conserve este comprobante.
    </p>

    <div class="foot">
      <div class="firma">Firma / sello recepción</div>
      <div class="firma">Estudiante</div>
    </div>
  </div>
</body>
</html>
"""
