import { CONFIG } from '../../config.js';
import { navegar } from '../utils/router.js';
import { obtenerCookie } from '../utils/cookies.js';
import { normalizarRol, obtenerJurisdiccionUsuario, puedeConsultarDistribucionesVacunas, puedeRegistrarDistribucionesVacunas } from '../utils/permisos.js';
import { obtenerCatalogosOperativo } from '../services/operativos.service.js';
import { supabase } from '../services/supabase.js';

const esc = x => String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jur = x => String(x ?? '').trim().padStart(2,'0');
const $ = id => document.getElementById(id);
const entero = x => String(x ?? '').trim() !== '' && /^\d+$/.test(String(x).trim()) && Number.isSafeInteger(Number(x)) && Number(x)>0 ? Number(x) : null;
async function rpc(nombre, args) {
  const {data,error}=await supabase.rpc(nombre,args);
  if(error) throw new Error(error.message || 'Error de Supabase');
  if(data?.ok === false) throw new Error(data.mensaje || 'La operación fue rechazada');
  return data;
}
const aviso = (mensaje, error=false) => { const el=$('vac-aviso'); if(el){el.textContent=mensaje; el.style.color=error?'#b42318':'';} };

export async function mostrarDistribucionVacunas() {
  const app=$('app'); if(!app) throw new Error('No existe #app');
  const token=obtenerCookie(CONFIG.SESSION_COOKIE);
  app.innerHTML='<main class="operative-page"><section class="operation-flow">Cargando módulo de vacunas…</section></main>';
  try {
    if(!token) throw new Error('Sesión no disponible');
    const catalogos=await obtenerCatalogosOperativo(token);
    const usuario=catalogos.usuario || {};
    if(!puedeConsultarDistribucionesVacunas(usuario)) throw new Error('Perfil sin acceso');
    const supervisor=normalizarRol(usuario)==='SUPERVISOR';
    const escritura=puedeRegistrarDistribucionesVacunas(usuario);
    const propia=jur(obtenerJurisdiccionUsuario(usuario));
    let datos=null;
    let rangosGenerados=[];
    const maxTalonarios=1000;
    app.innerHTML=`<style>
      .vac-shell{--vac-blue:var(--color-primary,#005c97);--vac-border:var(--color-border,#d0d5dd);--vac-muted:var(--color-text-muted,#667085);color:var(--color-text,#1d2939)}
      .vac-shell .operation-flow{max-width:1240px;margin:auto}.vac-panel{background:var(--color-surface,#fff);border:1px solid #dde5ed;border-radius:17px;padding:clamp(16px,2vw,26px);margin:0 0 20px;box-shadow:0 4px 16px rgba(16,24,40,.045)}
      .vac-panel h2{font-size:1.12rem;margin:0 0 6px}.vac-muted{color:var(--vac-muted);font-size:.89rem;line-height:1.55}.vac-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.vac-grid label,.vac-field,.vac-form-grid label{display:flex;flex-direction:column;gap:7px;font-weight:650;font-size:.9rem}.vac-grid input,.vac-grid select,.vac-grid textarea,.vac-field input,.vac-field textarea,.vac-form-grid input,.vac-form-grid select,.vac-form-grid textarea,.vac-toolbar select,.vac-toolbar input{width:100%;min-height:44px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;background:var(--color-surface,#fff);color:inherit;box-sizing:border-box;font-weight:450}.vac-grid :is(input,select,textarea):focus,.vac-form-grid :is(input,select,textarea):focus{outline:2px solid #b8dcf3;border-color:var(--vac-blue)}
      .vac-step{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:9px;background:#e9f3fb;color:#005c97;font-weight:800;margin-right:9px}.vac-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.vac-summary{background:#f4f8fb;border:1px solid #e0e9f1;border-radius:12px;padding:14px;margin-top:14px;color:#24435b;font-size:.91rem}.vac-range-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:9px;margin-top:12px;max-height:240px;overflow:auto}.vac-range{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:11px;font-variant-numeric:tabular-nums}.vac-range strong{display:block}.vac-error{color:#b42318;font-size:.9rem}.vac-table-wrap{overflow:auto;border:1px solid #e5eaf0;border-radius:12px}.vac-table-wrap table{width:100%;border-collapse:collapse;font-size:.88rem}.vac-table-wrap th{text-align:left;background:#f6f8fa;color:#475467;font-size:.77rem;letter-spacing:.02em}.vac-table-wrap th,.vac-table-wrap td{padding:12px 13px;border-bottom:1px solid #edf0f3}.vac-table-wrap tbody tr:last-child td{border-bottom:0}.vac-hint{font-size:.83rem;color:var(--vac-muted);margin:7px 0}.vac-actions .button:disabled{opacity:.5;cursor:not-allowed}
      .vac-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:16px 19px;background:#fff;border:1px solid #dde5ed;border-radius:14px;margin:0 0 18px}.vac-toolbar label{display:flex;align-items:center;gap:10px;font-weight:650}.vac-toolbar select{min-width:175px}.vac-section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:8px 0 14px}.vac-section-head h2{margin:0;font-size:1.25rem}.vac-count{font-size:.79rem;font-weight:750;background:#eef3f7;color:#344054;padding:5px 10px;border-radius:20px}.vac-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 20px;padding:6px;border-radius:14px;background:#eaf0f5}.vac-tab{border:0;border-radius:10px;padding:11px 16px;font-weight:750;background:transparent;color:#475467}.vac-tab.is-active{background:#fff;color:var(--vac-blue);box-shadow:0 2px 8px #0000000b}.vac-view[hidden]{display:none!important}
      .vac-records{display:grid;gap:12px}.vac-record{border:1px solid #e0e6ed;background:#fff;border-radius:15px;overflow:hidden;box-shadow:0 3px 12px #10182808}.vac-record__top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:17px 19px 12px}.vac-record__name{margin:0;font-size:1.03rem;line-height:1.35;overflow-wrap:anywhere}.vac-record__sub{font-size:.82rem;color:var(--vac-muted);margin:5px 0 0}.vac-status{display:inline-flex;align-items:center;border-radius:30px;padding:5px 10px;font-size:.75rem;font-weight:800;white-space:nowrap;background:#eef2f6;color:#475467}.vac-status--confirmada,.vac-status--aplicada{background:#eaf7ef;color:#027a48}.vac-status--borrador,.vac-status--pendiente{background:#fff4e5;color:#a65b08}.vac-status--cancelada,.vac-status--rechazada{background:#fef0ef;color:#b42318}.vac-record__metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;border-top:1px solid #edf0f3;border-bottom:1px solid #edf0f3;background:#fafbfc}.vac-metric{padding:12px 16px;border-right:1px solid #edf0f3}.vac-metric:last-child{border:0}.vac-metric strong{display:block;font-size:1.12rem;font-variant-numeric:tabular-nums}.vac-metric small{display:block;color:var(--vac-muted);font-size:.76rem;margin-top:3px}.vac-record__bottom{padding:12px 18px}.vac-record__bottom .vac-actions{margin:0}.vac-record details{border-top:1px solid #edf0f3}.vac-record summary{padding:12px 18px;cursor:pointer;color:var(--vac-blue);font-size:.87rem;font-weight:750}.vac-folios{padding:0 18px 15px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}.vac-folio{background:#f6f9fc;border:1px solid #e7edf3;border-radius:9px;padding:10px;font-size:.83rem}.vac-folio strong{display:block;margin-bottom:3px}.vac-filterbar{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 14px}.vac-filterbar input,.vac-filterbar select{padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;min-height:43px;background:#fff}.vac-filterbar input{flex:1 1 240px}.vac-filterbar select{flex:0 1 190px}.vac-empty{text-align:center;padding:34px 18px;background:#fff;border:1px dashed #cbd5e1;border-radius:13px;color:var(--vac-muted)}
      .vac-workspace{background:#fff;border:1px solid #dbe5ec;border-radius:17px;padding:clamp(16px,2vw,25px);margin:20px 0;box-shadow:0 6px 24px #1018280b;scroll-margin-top:90px}.vac-workspace__head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:18px}.vac-workspace__head h2{margin:0 0 6px;font-size:1.22rem}.vac-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.vac-form-grid .vac-wide{grid-column:1/-1}.vac-check{display:flex;align-items:flex-start;gap:10px;padding:12px 13px;border:1px solid #e5eaf0;border-radius:10px;font-size:.89rem}.vac-check input{width:18px;height:18px;flex-shrink:0}.vac-entry-list{display:grid;gap:8px;margin-top:12px;max-height:250px;overflow:auto}.vac-entry{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#f7fafc;border:1px solid #e5eaf0;border-radius:10px;padding:10px 12px;font-size:.85rem}.vac-entry button{border:0;background:#fff;color:#b42318;border-radius:7px;padding:6px 10px;font-weight:750}.vac-comp-counter{padding:13px;border-radius:11px;background:#edf5fb;font-weight:750;color:#005c97;margin:12px 0}.vac-quiet{color:var(--vac-muted);font-size:.84rem}.vac-records .button{font-size:.84rem;min-height:39px;padding:8px 12px}
      @media(max-width:760px){.vac-grid,.vac-form-grid{grid-template-columns:1fr}.vac-record__metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.vac-metric:nth-child(2){border-right:0}.vac-metric:nth-child(-n+2){border-bottom:1px solid #edf0f3}.vac-toolbar{align-items:stretch}.vac-tabs{overflow:auto;flex-wrap:nowrap}.vac-tab{white-space:nowrap;flex:1}.vac-record__top{flex-direction:column}.vac-filterbar>*{flex:1 1 100%!important}.vac-workspace__head{flex-direction:column}}@media(max-width:520px){.vac-panel{padding:15px}.vac-record__bottom .button{width:100%}.vac-metric{padding:11px}.vac-workspace{padding:15px}}
    </style><div class="operative-page vac-shell"><header class="operative-header"><div><h1>Distribución de vacunas</h1><p>Inventario compartido con operativos · entrega y comprobación de talonarios</p></div><button id="vac-volver" class="button button--secondary" type="button">Volver</button></header><main class="operative-main"><section class="operation-flow">
    <div class="vac-toolbar">${supervisor?`<label>Jurisdicción <select id="vac-jur">${Array.from({length:8},(_,i)=>`<option value="${jur(i+1)}" ${jur(i+1)===propia?'selected':''}>Jurisdicción ${i+1}</option>`).join('')}</select></label>`:`<span>Jurisdicción: <strong>${esc(propia)}</strong></span>`}</div>
    <p id="vac-aviso" role="status"></p><div id="vac-contenido"></div></section></main></div>`;
    $('vac-volver').onclick=()=>navegar('/operativos/nuevo');
    const actualJur=()=>supervisor?$('vac-jur').value:propia;
    const cargar=async()=>{
      aviso('Consultando datos…');
      datos=await rpc('vacunas_detalle',{p_token:token,p_jurisdiccion:actualJur()});
      if(jur(datos.jurisdiccion)!==actualJur()) throw new Error('Jurisdicción de respuesta incorrecta');
      pintar(); aviso('');
    };
    function pintar(){
      const inventario=datos.inventario||[];
      const distribuciones=datos.distribuciones||[];
      const devoluciones=datos.devoluciones||[];
      rangosGenerados=[];
      $('vac-contenido').innerHTML=`<nav class="vac-tabs" aria-label="Secciones de vacunas"><button type="button" class="vac-tab is-active" data-vac-tab="inventario">Inventario y entrega</button><button type="button" class="vac-tab" data-vac-tab="distribuciones">Distribuciones (${distribuciones.length})</button><button type="button" class="vac-tab" data-vac-tab="devoluciones">Devoluciones (${devoluciones.length})</button></nav><div class="vac-view" data-vac-view="inventario"><section class="vac-panel"><h2>Inventario de vacunas</h2><p class="vac-muted">Disponibilidad actual. Un talonario requiere 5 frascos del mismo lote.</p>${inventario.length?`<div class="vac-table-wrap"><table><thead><tr><th>Vacuna</th><th>Lote</th><th>Existencia</th><th>Frascos</th><th>Talonarios</th></tr></thead><tbody>${inventario.map(v=>`<tr><td>${esc(v.producto)}</td><td>${esc(v.lote)}</td><td>${esc(v.existencia)} ${esc(v.unidad_medida)}</td><td>${esc(v.presentaciones_completas)}</td><td><strong>${Math.floor(Number(v.presentaciones_completas)/5)}</strong></td></tr>`).join('')}</tbody></table></div>`:'<p>Sin existencias suficientes. Los operativos comparten este inventario.</p>'}</section>
      ${escritura?`<form id="vac-form"><section class="vac-panel"><h2><span class="vac-step">1</span>Vacuna y destinatario</h2><p class="vac-muted">Selecciona el lote y a quién entregarás los talonarios.</p><div class="vac-grid">
        <label>Lote de vacuna <select id="vac-lote" required><option value="">Seleccionar lote…</option>${inventario.filter(v=>Number(v.presentaciones_completas)>=5).map(v=>`<option value="${esc(v.lote_id)}">${esc(v.lote)} · ${Math.floor(Number(v.presentaciones_completas)/5)} talonarios disponibles</option>`).join('')}</select></label>
        <label>Tipo de destinatario <select id="vac-tipo"><option value="CENTRO_SALUD">Centro de salud</option><option value="MICRORRED">Microrred</option><option value="OTRO">Otra institución</option></select></label></div>
        <div id="vac-destinatario" class="vac-grid" style="margin-top:14px"></div><div class="vac-grid" style="margin-top:16px"><label>Número de oficio (opcional)<input id="vac-oficio" type="text" maxlength="150" placeholder="Ej. SSA/VECT/2026/0123" autocomplete="off"></label></div><p class="vac-hint">Si la entrega cuenta con oficio, captura su número o referencia. No es obligatorio.</p></section>
        <section class="vac-panel"><h2><span class="vac-step">2</span>Folios de los talonarios</h2><p class="vac-muted">Escribe solo el <strong>primer folio</strong> y cuántos talonarios entregarás. El sistema calculará automáticamente los finales y los siguientes rangos.</p>
        <div class="vac-grid"><label>Primer folio del primer talonario<input id="vac-inicio" inputmode="numeric" type="text" placeholder="Ej. 1001" required></label><label>Cantidad de talonarios<input id="vac-cantidad" type="number" min="1" max="${maxTalonarios}" step="1" value="1" required></label></div>
        <p class="vac-hint">Ejemplo: inicio 1001 + 2 talonarios → 1001–1100 y 1101–1200. Cada rango tiene 100 folios.</p>
        <div class="vac-actions"><button type="button" class="button button--secondary" id="vac-generar">Generar rangos automáticamente</button><button type="button" class="button button--secondary" id="vac-limpiar">Limpiar</button></div>
        <div id="vac-rangos-error" class="vac-error" role="alert"></div><div id="vac-rangos-lista" class="vac-range-list"></div><div id="vac-resumen" class="vac-summary" aria-live="polite">Indica el primer folio y la cantidad de talonarios.</div></section>
        <section class="vac-panel"><h2><span class="vac-step">3</span>Revisar y guardar</h2><p class="vac-muted">Verifica el destinatario, el lote y los folios. El registro inicial no descuenta inventario; la salida se realiza al confirmar la entrega.</p><button id="vac-guardar" type="submit" class="button" disabled>Registrar distribución</button></section></form>`:'<section class="vac-panel"><p>Acceso de solo consulta. No puede registrar ni comprobar entregas.</p></section>'}
      </div><div class="vac-view" data-vac-view="distribuciones" hidden><div class="vac-section-head"><h2>Distribuciones registradas</h2><span class="vac-count">${distribuciones.length} registros</span></div><div class="vac-filterbar"><input id="vac-buscar" type="search" placeholder="Buscar destinatario o lote…" aria-label="Buscar distribuciones"><select id="vac-filtrar-estado" aria-label="Filtrar estado"><option value="">Todos los estados</option><option value="BORRADOR">Pendiente de entrega</option><option value="CONFIRMADA">Confirmada</option><option value="CANCELADA">Cancelada</option></select></div><div class="vac-records" id="vac-listado">${distribuciones.length?distribuciones.map(d=>`<article class="vac-record" data-vac-record data-search="${esc((d.destinatario||'')+' '+(d.lote||''))}" data-estado="${esc(d.estado)}"><div class="vac-record__top"><div><h3 class="vac-record__name">${esc(d.destinatario||'Destinatario no disponible')}</h3><p class="vac-record__sub">${esc(d.destinatario_tipo==='MICRORRED'?'Microrred':d.destinatario_tipo==='CENTRO_SALUD'?'Centro de salud':'Otra institución')} · Lote ${esc(d.lote)}${d.oficio?` · Oficio ${esc(d.oficio)}`:''} · ${esc(d.fecha_entrega?new Date(d.fecha_entrega).toLocaleDateString('es-MX'):'Sin entregar')}</p></div><span class="vac-status vac-status--${esc(String(d.estado).toLowerCase())}">${esc(d.estado==='BORRADOR'?'PENDIENTE DE ENTREGA':d.estado)}</span></div><div class="vac-record__metrics"><div class="vac-metric"><strong>${Number(d.frascos)/5}</strong><small>Talonarios</small></div><div class="vac-metric"><strong>${esc(d.frascos)}</strong><small>Frascos asignados</small></div><div class="vac-metric"><strong>${esc(d.folios_registrados)} / ${Number(d.frascos)*20}</strong><small>Folios documentados</small></div><div class="vac-metric"><strong>${d.estado==='CONFIRMADA'?Number(d.frascos_devueltos||0):'—'}</strong><small>Frascos reintegrados</small></div></div><div class="vac-record__bottom"><div class="vac-actions">${escritura&&d.estado==='BORRADOR'?`<button type="button" data-confirmar="${esc(d.id)}" class="button button--primary">Confirmar entrega</button>`:''}${escritura&&d.estado==='CONFIRMADA'&&Number(d.folios_registrados)<Number(d.frascos)*20?`<button type="button" data-comprobar="${esc(d.id)}" class="button button--secondary">Comprobar folios</button>`:''}${escritura&&d.estado==='CONFIRMADA'&&Number(d.folios_registrados)<Number(d.frascos)*20?`<button type="button" data-merma="${esc(d.id)}" class="button button--secondary">Folios no aplicados / merma</button>`:''}${escritura&&d.estado==='CONFIRMADA'&&Number(d.frascos_pendientes)>0?`<button type="button" data-devolver="${esc(d.id)}" class="button button--secondary">Registrar devolución</button>`:''}</div></div><details><summary>Consultar talonarios y rangos</summary><div class="vac-folios">${(d.rangos||[]).map(f=>`<div class="vac-folio"><strong>Talonario ${esc(f.numero_frasco)}</strong>${esc(f.desde)}–${esc(f.hasta)}<div class="vac-quiet">${esc(f.comprobados)} folios documentados</div></div>`).join('')}</div></details></article>`).join(''):'<div class="vac-empty">No hay distribuciones registradas en esta jurisdicción.</div>'}
      </div></div><div class="vac-view" data-vac-view="devoluciones" hidden><section class="vac-panel"><h2>Historial de devoluciones</h2>${devoluciones.length?`<div class="vac-table-wrap"><table><thead><tr><th>Fecha</th><th>Destinatario</th><th>Lote</th><th>Frascos</th><th>Estado</th><th>Recibió</th></tr></thead><tbody>${devoluciones.map(v=>{const d=distribuciones.find(x=>x.id===v.distribucion_id);return `<tr><td>${esc(v.fecha_devolucion?new Date(v.fecha_devolucion).toLocaleDateString('es-MX'):'—')}</td><td>${esc(d?.destinatario||'—')}</td><td>${esc(v.lote)}</td><td>${esc(v.frascos)}</td><td>${esc(v.estado)}</td><td>${esc(v.responsable_recepcion)}</td></tr>`;}).join('')}</tbody></table></div>`:'<p class="vac-muted">Aún no hay devoluciones registradas en esta jurisdicción.</p>'}</section>
      </div><section id="vac-comprobacion"></section><section id="vac-devolucion"></section>`;
      document.querySelectorAll('[data-vac-tab]').forEach(btn=>btn.onclick=()=>activarTab(btn.dataset.vacTab));
      $('vac-buscar')?.addEventListener('input',filtrarDistribuciones);
      $('vac-filtrar-estado')?.addEventListener('change',filtrarDistribuciones);
      if(escritura){
        $('vac-tipo').onchange=destinatario;
        destinatario();
        $('vac-inicio').oninput=invalidarRangos;
        $('vac-cantidad').oninput=invalidarRangos;
        $('vac-generar').onclick=generarRangos;
        $('vac-limpiar').onclick=()=>{$('vac-inicio').value='';$('vac-cantidad').value='1';invalidarRangos();};
        $('vac-lote').onchange=()=>{invalidarRangos();};
        $('vac-form').onsubmit=guardar;
        document.querySelectorAll('[data-confirmar]').forEach(b=>b.onclick=()=>confirmar(b.dataset.confirmar));
        document.querySelectorAll('[data-comprobar]').forEach(b=>b.onclick=()=>comprobar(b.dataset.comprobar));
        document.querySelectorAll('[data-devolver]').forEach(b=>b.onclick=()=>devolver(b.dataset.devolver));
        document.querySelectorAll('[data-merma]').forEach(b=>b.onclick=()=>registrarMerma(b.dataset.merma));
      }
    }
    function activarTab(nombre){
      document.querySelectorAll('[data-vac-tab]').forEach(b=>{const activo=b.dataset.vacTab===nombre;b.classList.toggle('is-active',activo);b.setAttribute('aria-selected',String(activo));});
      document.querySelectorAll('[data-vac-view]').forEach(v=>{v.hidden=v.dataset.vacView!==nombre;});
    }
    function filtrarDistribuciones(){
      const buscar=($('vac-buscar')?.value||'').trim().toLocaleLowerCase('es-MX');
      const estado=$('vac-filtrar-estado')?.value||'';
      document.querySelectorAll('[data-vac-record]').forEach(el=>{el.hidden=!(el.dataset.search.toLocaleLowerCase('es-MX').includes(buscar)&&(!estado||el.dataset.estado===estado));});
    }
    function destinatario(){
      const tipo=$('vac-tipo').value;
      if(tipo==='CENTRO_SALUD'){
        $('vac-destinatario').innerHTML=`<label>Centro de salud <select id="vac-centro" required><option value="">Seleccione un centro…</option>${(datos.centros||[]).map(c=>`<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('')}</select></label>`;
      }else if(tipo==='MICRORRED'){
        const microrredes=datos.microrredes||[];
        $('vac-destinatario').innerHTML=`<label>Microrred <select id="vac-microrred" required><option value="">Seleccione una microrred…</option>${microrredes.map(m=>`<option value="${esc(m.id)}">${esc(m.nombre)} (${(m.centros||[]).length} centros)</option>`).join('')}</select></label><div class="vac-summary" id="vac-centros-microrred">Seleccione una microrred para ver sus centros asociados.</div>${microrredes.length?'':'<p class="vac-error">No hay microrredes registradas para esta jurisdicción.</p>'}`;
        $('vac-microrred').onchange=()=>{
          const m=microrredes.find(x=>x.id===$('vac-microrred').value);
          $('vac-centros-microrred').textContent=m?((m.centros||[]).length?`Centros asociados: ${m.centros.map(c=>c.nombre).join(', ')}`:'Esta microrred no tiene centros asociados registrados.'):'Seleccione una microrred para ver sus centros asociados.';
        };
      }else{
        $('vac-destinatario').innerHTML=`<label>Institución <input id="vac-institucion" required></label><label>Dirección <input id="vac-direccion" required></label><label>Contacto <input id="vac-contacto" required></label><label>Teléfono <input id="vac-telefono"></label><label>Observaciones <textarea id="vac-notas"></textarea></label>`;
      }
    }
    function invalidarRangos(){
      rangosGenerados=[];
      $('vac-rangos-lista').innerHTML='';
      $('vac-rangos-error').textContent='';
      $('vac-guardar').disabled=true;
      $('vac-resumen').textContent='Genera los rangos para revisar los folios antes de guardar.';
    }
    function rangos(){
      if(!rangosGenerados.length) throw new Error('Primero genera y revisa los rangos de folios');
      return rangosGenerados.map(r=>({...r}));
    }
    function generarRangos(){
      invalidarRangos();
      try{
        const inicio=entero($('vac-inicio').value), cantidad=entero($('vac-cantidad').value);
        if(!inicio) throw new Error('Ingresa un folio inicial entero y positivo');
        if(!cantidad||cantidad>maxTalonarios) throw new Error(`Selecciona de 1 a ${maxTalonarios} talonarios`);
        const lote=$('vac-lote').value;
        const v=(datos.inventario||[]).find(x=>x.lote_id===lote);
        if(!v) throw new Error('Primero selecciona un lote con existencias');
        if(cantidad*5>Number(v.presentaciones_completas)) throw new Error('No hay suficientes frascos para esa cantidad de talonarios');
        if(!Number.isSafeInteger(inicio+cantidad*100-1)) throw new Error('Los folios superan el límite numérico admitido');
        rangosGenerados=Array.from({length:cantidad},(_,i)=>({desde:inicio+i*100,hasta:inicio+(i+1)*100-1}));
        $('vac-rangos-lista').innerHTML=rangosGenerados.map((r,i)=>`<div class="vac-range"><strong>Talonario ${i+1}</strong>${r.desde.toLocaleString('es-MX')} – ${r.hasta.toLocaleString('es-MX')}</div>`).join('');
        $('vac-resumen').innerHTML=`<strong>${cantidad} talonario(s)</strong> · ${cantidad*5} frascos · ${cantidad*100} folios · ${cantidad*5*Number(v.contenido_presentacion)} ${esc(v.unidad_medida)} a descontar al confirmar`;
        $('vac-guardar').disabled=false;
      }catch(e){$('vac-rangos-error').textContent=e.message;}
    }
    async function guardar(e){
      e.preventDefault();
      try{
        const lote=$('vac-lote').value, r=rangos();
        if(r[0].desde!==entero($('vac-inicio').value)||r.length!==entero($('vac-cantidad').value)) throw new Error('Los valores cambiaron; genera nuevamente los rangos');
        const v=(datos.inventario||[]).find(x=>x.lote_id===lote);
        if(!v||r.length*5>Number(v.presentaciones_completas)) throw new Error('Lote o cantidad no disponible');
        const tipo=$('vac-tipo').value;
        let result;
        if(tipo==='MICRORRED'){
          const microrredId=$('vac-microrred')?.value;
          if(!microrredId) throw new Error('Seleccione una microrred');
          result=await rpc('vacunas_crear_distribucion_microrred',{
            p_token:token,p_jurisdiccion:actualJur(),p_lote_id:lote,
            p_microrred_id:microrredId,p_rangos:r,p_oficio:$('vac-oficio').value.trim()||null
          });
        }else{
          const otro=tipo==='OTRO';
          const args={p_token:token,p_jurisdiccion:actualJur(),p_lote_id:lote,
            p_centro_salud_id:otro?null:($('vac-centro').value||null),
            p_institucion_otro:otro?$('vac-institucion').value:null,
            p_direccion_otro:otro?$('vac-direccion').value:null,
            p_contacto_otro:otro?$('vac-contacto').value:null,
            p_telefono_otro:otro?$('vac-telefono').value:null,
            p_notas_otro:otro?$('vac-notas').value:null,p_rangos:r,p_oficio:$('vac-oficio').value.trim()||null};
          if(!otro&&!args.p_centro_salud_id) throw new Error('Seleccione un centro de salud');
          result=await rpc('vacunas_crear_distribucion',args);
        }
        await cargar(); aviso(`Distribución registrada, pendiente de confirmar entrega: ${result.distribucion_id}`);
      }catch(err){aviso(err.message,true);}
    }
    async function confirmar(id){
      if(!window.confirm('Confirmar entrega: se descontarán 5 frascos por talonario del mismo inventario usado en operativos. Los folios asignados ya no podrán usarse en operativos. ¿Continuar?'))return;
      try{await rpc('vacunas_confirmar_distribucion',{p_token:token,p_distribucion_id:id});await cargar();aviso('Entrega confirmada; inventario descontado.');}catch(e){aviso(e.message,true);}
    }
    function devolver(id){
      const d=(datos.distribuciones||[]).find(x=>x.id===id);
      if(!d||d.estado!=='CONFIRMADA') return aviso('La distribución no está disponible para devolución',true);
      const maximo=Number(d.frascos_pendientes||0);
      if(maximo<1) return aviso('No hay frascos pendientes de reintegro',true);
      activarTab('distribuciones');
      $('vac-comprobacion').innerHTML='';
      $('vac-devolucion').innerHTML=`<section class="vac-workspace"><div class="vac-workspace__head"><div><h2>Recepción de frascos devueltos</h2><p class="vac-muted">${esc(d.destinatario)} · Lote ${esc(d.lote)}</p></div><span class="vac-count">${maximo} frascos no reintegrados</span></div><p class="vac-summary">Solo se reintegran frascos completos, sin utilizar, aptos para reutilización y con cadena de frío verificada. El saldo no reintegrado no equivale a frascos disponibles.</p><form id="vac-dev-form"><div class="vac-form-grid"><label>Frascos completos recibidos<input id="vac-dev-frascos" type="number" min="1" max="${maximo}" step="1" required></label><label>Responsable de recepción<input id="vac-dev-responsable" required maxlength="200" placeholder="Nombre de quien recibe"></label><div class="vac-wide"><label class="vac-check"><input id="vac-dev-frio" type="checkbox" required> Verifiqué la conservación de la cadena de frío</label></div><div class="vac-wide"><label class="vac-check"><input id="vac-dev-apta" type="checkbox" required> Confirmo que los frascos están completos, sin usar y son aptos para reutilización</label></div><label class="vac-wide">Observaciones<textarea id="vac-dev-notas" rows="3" placeholder="Condiciones de recepción, identificación de frascos…"></textarea></label></div><div class="vac-actions"><button class="button button--primary" type="submit" id="vac-dev-guardar">Confirmar y reintegrar inventario</button><button class="button button--secondary" type="button" id="vac-dev-cancelar">Cancelar</button></div></form></section>`;
      $('vac-dev-cancelar').onclick=()=>{$('vac-devolucion').innerHTML='';};
      $('vac-dev-form').onsubmit=async e=>{
        e.preventDefault();
        const frascos=entero($('vac-dev-frascos').value);
        if(!frascos||frascos>maximo) return aviso(`Indique entre 1 y ${maximo} frascos`,true);
        if(!$('vac-dev-frio').checked||!$('vac-dev-apta').checked) return aviso('Debe verificar la cadena de frío y la aptitud de los frascos',true);
        if(!window.confirm(`Se reintegrarán ${frascos} frascos del lote ${d.lote} al inventario jurisdiccional. ¿Confirmar recepción?`))return;
        const boton=$('vac-dev-guardar'); boton.disabled=true;
        try{
          const resultado=await rpc('vacunas_registrar_devolucion',{
            p_token:token,p_distribucion_id:id,p_frascos:frascos,
            p_responsable_recepcion:$('vac-dev-responsable').value.trim(),
            p_cadena_frio_verificada:true,p_apta_reutilizacion:true,
            p_observaciones:$('vac-dev-notas').value.trim()||null
          });
          await cargar();
          aviso(`Devolución registrada: ${frascos} frascos. Pendientes de reintegro: ${resultado.frascos_pendientes}.`);
        }catch(err){aviso(err.message,true);boton.disabled=false;}
      };
      $('vac-devolucion').scrollIntoView({behavior:'smooth',block:'start'});
    }
    function registrarMerma(id){
      const d=(datos.distribuciones||[]).find(x=>x.id===id);
      if(!d||d.estado!=='CONFIRMADA') return aviso('La distribución debe estar confirmada',true);
      const entradas=[];
      const seleccionados=new Set();
      activarTab('distribuciones');
      $('vac-comprobacion').innerHTML='';
      $('vac-devolucion').innerHTML=`<section class="vac-workspace"><div class="vac-workspace__head"><div><h2>Folios no aplicados</h2><p class="vac-muted">${esc(d.destinatario)} · Lote ${esc(d.lote)}</p></div><span class="vac-count">${esc(d.folios_registrados)} de ${Number(d.frascos)*20} documentados</span></div><p class="vac-summary">Registra únicamente folios no aplicados. Se documentarán como INCIDENCIA, con motivo obligatorio, mediante la comprobación existente. No se reintegrarán vacunas al inventario.</p><form id="vac-merma-form"><div class="vac-form-grid"><label>Modalidad<select id="vac-merma-modo"><option value="RANGO">Rango de folios</option><option value="INDIVIDUAL">Folio individual</option></select></label><label>Motivo<select id="vac-merma-motivo" required><option value="">Selecciona un motivo…</option><option value="FRASCO_ROTO">Frasco roto</option><option value="PERDIDA_CADENA_FRIO">Pérdida de cadena de frío</option><option value="CADUCIDAD">Caducidad</option><option value="DERRAME">Derrame o pérdida de contenido</option><option value="DOSIS_NO_UTILIZADA">Dosis no utilizada / descartada</option><option value="OTRO">Otro motivo</option></select></label><label>Folio inicial / individual<input id="vac-merma-desde" type="number" min="1" step="1" required></label><label id="vac-merma-fin-label">Folio final<input id="vac-merma-hasta" type="number" min="1" step="1"></label><label class="vac-wide">Descripción de lo ocurrido <textarea id="vac-merma-detalle" rows="3" required maxlength="1000" placeholder="Explica qué ocurrió, por qué no se aplicaron las dosis y las condiciones del incidente"></textarea></label></div><div class="vac-actions"><button type="button" class="button button--secondary" id="vac-merma-agregar">Agregar folios</button></div><div id="vac-merma-resumen" class="vac-comp-counter">0 folios preparados</div><div id="vac-merma-lista" class="vac-entry-list"></div><div class="vac-form-grid" style="margin-top:16px"><label class="vac-wide">Observaciones adicionales<textarea id="vac-merma-notas" rows="2" placeholder="Datos complementarios de la merma"></textarea></label></div><div class="vac-actions"><button type="submit" id="vac-merma-guardar" class="button button--primary">Registrar folios no aplicados</button><button type="button" id="vac-merma-cancelar" class="button button--secondary">Cerrar</button></div></form></section>`;
      $('vac-merma-cancelar').onclick=()=>{$('vac-devolucion').innerHTML='';};
      $('vac-merma-modo').onchange=()=>{$('vac-merma-fin-label').hidden=$('vac-merma-modo').value==='INDIVIDUAL';};
      $('vac-merma-agregar').onclick=()=>{
        try{
          const desde=entero($('vac-merma-desde').value);
          const hasta=$('vac-merma-modo').value==='INDIVIDUAL'?desde:entero($('vac-merma-hasta').value);
          const motivo=$('vac-merma-motivo').value;
          const descripcion=$('vac-merma-detalle').value.trim();
          if(!desde||!hasta||hasta<desde||hasta-desde+1>10000) throw new Error('Indica un rango válido de hasta 10,000 folios');
          if(!motivo||!descripcion) throw new Error('Selecciona un motivo y describe lo ocurrido');
          const nuevos=[];
          for(let folio=desde;folio<=hasta;folio++){
            const rango=(d.rangos||[]).find(r=>folio>=Number(r.desde)&&folio<=Number(r.hasta));
            if(!rango) throw new Error(`El folio ${folio} no pertenece a esta distribución`);
            if(seleccionados.has(folio)) throw new Error(`El folio ${folio} ya está preparado`);
            nuevos.push({frasco_id:rango.id,folio,estado:'INCIDENCIA',detalle:`NO APLICADO / MERMA - ${motivo}: ${descripcion}`});
          }
          nuevos.forEach(f=>{entradas.push(f);seleccionados.add(f.folio);});
          const item=document.createElement('div');item.className='vac-entry';
          item.textContent=`${desde}${hasta===desde?'':'–'+hasta} · ${nuevos.length} folio(s) · ${motivo}`;
          const quitar=document.createElement('button');quitar.type='button';quitar.textContent='Quitar';
          quitar.onclick=()=>{nuevos.forEach(f=>{seleccionados.delete(f.folio);const i=entradas.indexOf(f);if(i>=0)entradas.splice(i,1);});item.remove();$('vac-merma-resumen').textContent=`${entradas.length} folios preparados`;};
          item.append(' ',quitar);$('vac-merma-lista').append(item);
          $('vac-merma-resumen').textContent=`${entradas.length} folios preparados`;
          aviso('Folios preparados; todavía no se han registrado.');
        }catch(e){aviso(e.message,true);}
      };
      $('vac-merma-form').onsubmit=async e=>{
        e.preventDefault();
        if(!entradas.length) return aviso('Agrega al menos un folio no aplicado',true);
        if(!window.confirm(`Se documentarán ${entradas.length} folios como INCIDENCIA por no aplicación/merma. No se reintegrará inventario. ¿Continuar?`)) return;
        const boton=$('vac-merma-guardar');boton.disabled=true;
        try{
          const n=entradas.length;
          await rpc('vacunas_comprobar_folios',{p_token:token,p_distribucion_id:id,p_folios:entradas,p_observaciones:`FOLIOS NO APLICADOS / MERMA. ${$('vac-merma-notas').value.trim()}`});
          await cargar();aviso(`${n} folios no aplicados documentados como incidencia.`);
        }catch(err){aviso(err.message,true);boton.disabled=false;}
      };
      $('vac-devolucion').scrollIntoView({behavior:'smooth',block:'start'});
    }

    function comprobar(id){
      const d=(datos.distribuciones||[]).find(x=>x.id===id);
      if(!d) return aviso('Distribución no encontrada',true);
      const pendientes=new Set();
      const entradas=[];
      activarTab('distribuciones');
      $('vac-devolucion').innerHTML='';
      $('vac-comprobacion').innerHTML=`<section class="vac-workspace"><div class="vac-workspace__head"><div><h2>Comprobación de folios</h2><p class="vac-muted">${esc(d.destinatario)} · Lote ${esc(d.lote)}</p></div><span class="vac-count">${esc(d.folios_registrados)} de ${Number(d.frascos)*20} registrados</span></div><p class="vac-muted">Agrega folios individuales o rangos. Puedes combinar varios resultados en una misma recepción.</p><form id="vac-comp-form"><div class="vac-form-grid"><label>Modalidad<select id="vac-comp-modo"><option value="RANGO">Rango de folios</option><option value="INDIVIDUAL">Folio individual</option></select></label><label>Resultado<select id="vac-comp-estado"><option value="COMPROBADO">Comprobado</option><option value="INCIDENCIA">Incidencia</option><option value="ANULADO">Anulado</option></select></label><label>Folio inicial / individual<input id="vac-comp-desde" type="number" min="1" step="1" required></label><label id="vac-comp-fin-label">Folio final<input id="vac-comp-hasta" type="number" min="1" step="1"></label><label class="vac-wide">Detalle de incidencia (obligatorio si aplica)<input id="vac-comp-detalle" placeholder="Describe la incidencia si corresponde"></label></div><div class="vac-actions"><button type="button" class="button button--secondary" id="vac-comp-agregar">Agregar a la recepción</button></div><div id="vac-comp-resumen" class="vac-comp-counter">0 folios preparados</div><div id="vac-comp-lista" class="vac-entry-list"></div><div class="vac-form-grid" style="margin-top:17px"><label class="vac-wide">Observaciones de recepción<textarea id="vac-comp-notas" rows="3" placeholder="Notas de esta comprobación…"></textarea></label></div><div class="vac-actions"><button class="button button--primary" type="submit">Guardar comprobación</button><button class="button button--secondary" type="button" id="vac-comp-cancelar">Cerrar</button></div></form></section>`;
      $('vac-comp-cancelar').onclick=()=>{$('vac-comprobacion').innerHTML='';};
      const modo=$('vac-comp-modo');
      modo.onchange=()=>{$('vac-comp-fin-label').hidden=modo.value==='INDIVIDUAL';};
      $('vac-comp-agregar').onclick=()=>{
        try{
          const desde=entero($('vac-comp-desde').value);
          const hasta=modo.value==='INDIVIDUAL'?desde:entero($('vac-comp-hasta').value);
          if(!desde||!hasta||hasta<desde||hasta-desde+1>10000) throw new Error('Capture un rango válido de hasta 10,000 folios');
          const estado=$('vac-comp-estado').value, detalle=$('vac-comp-detalle').value.trim();
          if(estado==='INCIDENCIA'&&!detalle) throw new Error('Describa la incidencia');
          const nuevos=[];
          for(let folio=desde;folio<=hasta;folio++){
            const talonario=(d.rangos||[]).find(r=>folio>=Number(r.desde)&&folio<=Number(r.hasta));
            if(!talonario) throw new Error(`Folio ${folio} no pertenece a esta entrega`);
            if(pendientes.has(folio)) throw new Error(`Folio ${folio} ya está en esta comprobación`);
            nuevos.push({frasco_id:talonario.id,folio,estado,detalle:detalle||null});
          }
          nuevos.forEach(f=>{entradas.push(f);pendientes.add(f.folio);});
          const item=document.createElement('div');
          item.className='vac-entry';item.textContent=`${desde}${hasta===desde?'':'–'+hasta} · ${nuevos.length} folio(s) · ${estado}`;
          const btn=document.createElement('button');btn.type='button';btn.textContent='Quitar';
          btn.onclick=()=>{nuevos.forEach(f=>{pendientes.delete(f.folio);const i=entradas.indexOf(f);if(i>=0)entradas.splice(i,1);});item.remove();$('vac-comp-resumen').textContent=`${entradas.length} folios preparados`;};
          item.append(' ',btn);$('vac-comp-lista').append(item);
          $('vac-comp-resumen').textContent=`${entradas.length} folios preparados`;
          aviso('Folios agregados a la recepción; aún no guardados.');
        }catch(e){aviso(e.message,true);}
      };
      $('vac-comp-form').onsubmit=async e=>{
        e.preventDefault();
        try{
          if(!entradas.length) throw new Error('Agregue al menos un folio');
          const n=entradas.length;
          await rpc('vacunas_comprobar_folios',{p_token:token,p_distribucion_id:id,p_folios:entradas,p_observaciones:$('vac-comp-notas').value});
          await cargar();aviso(`${n} folios registrados en comprobación.`);
        }catch(err){aviso(err.message,true);}
      };
      $('vac-comprobacion').scrollIntoView({behavior:'smooth',block:'start'});
    }
    $('vac-jur')?.addEventListener('change',()=>cargar().catch(e=>aviso(e.message,true)));
    await cargar();
  }catch(e){app.innerHTML=`<main class="system-error"><h1>No fue posible abrir Distribución de Vacunas</h1><p>${esc(e.message)}</p><button id="vac-volver">Volver</button></main>`;$('vac-volver').onclick=()=>navegar('/operativos/nuevo');console.error(e);}
}
