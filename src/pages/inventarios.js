import { CONFIG } from "../../config.js";
import {
    obtenerCatalogosInventario,
    registrarProductoInventario,
    registrarPresentacionProducto,
    registrarRecepcionInventario,
    registrarMovimientoInventario,
    consultarInventario,
    consultarMovimientosInventario,
    obtenerResumenInventario
} from "../services/inventarios.service.js";
import { obtenerCookie } from "../utils/cookies.js";
import { navegar } from "../utils/router.js";
import {
    puedeAdministrarInventario,
    puedeRegistrarMovimientoInventario,
    puedeConsultarEstado
} from "../utils/permisos.js";

const UNIDADES = ["MG", "G", "KG", "ML", "L", "PIEZA", "DOSIS", "TABLETA", "AMPOLLETA"];

const CATEGORIAS = [
    { id: "1cc15203-fb5c-4647-87c7-518fbd619818", codigo: "COMB", nombre: "Combustible" },
    { id: "6bf2c6e1-11a6-4cb0-8f18-fb18a73a9820", codigo: "MAT", nombre: "Material" },
    { id: "d30b040d-e085-4229-88b8-5f7a9ed02195", codigo: "ECTO", nombre: "Ectodesparasitantes" },
    { id: "e0054aef-ef1a-4d9f-8e97-cd3c3d9a70d8", codigo: "VAC", nombre: "Vacunas" },
    { id: "e0ab2041-e512-4efc-9d0d-628be8d8d6bf", codigo: "EPP", nombre: "Equipo Protección" },
    { id: "ec161628-f6a9-47e2-8c73-cde42b4600f5", codigo: "INSECT", nombre: "Insecticidas" }
];

const ESTADO = {
    pestaña: "existencias",
    cargando: false,
    ambito: null,
    usuario: {},
    catalogos: {
        puede_administrar: false,
        jurisdiccion_usuario: null,
        productos: [],
        presentaciones: [],
        lotes: [],
        jurisdicciones: [],
        tipos_movimiento: []
    },
    resumen: {},
    inventario: { registros: [], total: 0, busqueda: "", solo: false, limite: 50, offset: 0 },
    movimientos: { registros: [], total: 0, limite: 50, offset: 0 }
};

function obtenerToken() {
    const token = obtenerCookie(CONFIG.SESSION_COOKIE);
    if (!token) throw new Error("No existe una sesión activa.");
    return token;
}

const arreglo = valor => Array.isArray(valor) ? valor : [];
const escapar = valor => String(valor ?? "").replace(/[&<>'"]/g, caracter => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
}[caracter]));
const numero = valor => new Intl.NumberFormat("es-MX", { maximumFractionDigits: 6 }).format(Number(valor) || 0);
const fecha = valor => valor ? new Intl.DateTimeFormat("es-MX").format(new Date(`${String(valor).slice(0, 10)}T00:00:00`)) : "—";
const valor = id => document.getElementById(id)?.value?.trim() || "";
const valorNumero = id => Number(valor(id));
const app = () => document.getElementById("app");

export async function mostrarInventarios(opciones = {}) {
    document.title = `Inventarios | ${CONFIG.APP_NAME}`;
    ESTADO.pestaña = opciones.pestañaInicial === "movimientos" ? "movimientos" : "existencias";
    app().innerHTML = `<main class="initial-loader"><div class="initial-loader__content"><div class="initial-loader__spinner"></div><p>Cargando inventarios...</p></div></main>`;

    try {
        await cargarCatalogos();
        ESTADO.ambito =
            ESTADO.catalogos.puede_administrar &&
            puedeConsultarEstado(ESTADO.usuario)
                ? "TODO_ESTADO"
                : ESTADO.catalogos.jurisdiccion_usuario;
        renderizarPagina();
        await cargarTodo();
    } catch (error) {
        app().innerHTML = `<main class="system-error"><section class="system-error__card"><h1>No fue posible abrir inventarios</h1><p>${escapar(error.message)}</p></section></main>`;
    }
}

async function cargarCatalogos() {
    const respuesta = await obtenerCatalogosInventario(obtenerToken());

    ESTADO.usuario =
        respuesta?.usuario ||
        respuesta?.contexto ||
        {};

    ESTADO.catalogos = {
        puede_administrar: respuesta.puede_administrar === true,
        jurisdiccion_usuario: respuesta.jurisdiccion_usuario || null,
        productos: arreglo(respuesta.productos),
        presentaciones: arreglo(respuesta.presentaciones),
        lotes: arreglo(respuesta.lotes),
        jurisdicciones: arreglo(respuesta.jurisdicciones),
        tipos_movimiento: arreglo(respuesta.tipos_movimiento)
    };
}

function renderizarPagina() {
    app().innerHTML = `
        <div class="inventory-page inventory-page--v4">
            <header class="inventory-header inventory-header--v4">
                <div>
                    <p class="inventory-header__eyebrow">Control estatal de existencias</p>
                    <h1>Inventarios</h1>
                    <p>Recepción, distribución, transferencias, lotes, caducidades y consumos.</p>
                </div>
                <div class="inventory-header__actions">
                    ${ESTADO.catalogos.puede_administrar ? `
                        <button id="btn-producto" class="button button--secondary" type="button">Registrar insumo</button>
                        <button id="btn-presentacion" class="button button--secondary" type="button">Registrar presentación</button>
                    ` : ""}
                    ${ESTADO.catalogos.puede_administrar ||
  puedeRegistrarMovimientoInventario(ESTADO.usuario) ? `
                        <button id="btn-movimiento" class="button button--primary" type="button">Registrar movimiento</button>
                    ` : ""}
                    <button id="btn-volver" class="button button--secondary" type="button">Volver</button>
                </div>
            </header>
            <main class="inventory-main">
                ${crearSelectorAmbito()}
                <section id="inventory-summary" class="inventory-summary"></section>
                <nav class="inventory-tabs" aria-label="Secciones de inventario">
                    <button data-tab="existencias" class="inventory-tab ${ESTADO.pestaña === "existencias" ? "is-active" : ""}" type="button">Existencias</button>
                    <button data-tab="movimientos" class="inventory-tab ${ESTADO.pestaña === "movimientos" ? "is-active" : ""}" type="button">Movimientos</button>
                </nav>
                <section id="inventory-content" class="inventory-content"></section>
            </main>
            <div id="inventory-modal-root" class="modal-root"></div>
        </div>
    `;

    document.getElementById("btn-volver").onclick = () => navegar("/inicio");
    document.getElementById("btn-producto")?.addEventListener("click", mostrarFormularioProducto);
    document.getElementById("btn-presentacion")?.addEventListener("click", mostrarFormularioPresentacion);
    document.getElementById("btn-movimiento")?.addEventListener("click", mostrarFormularioMovimiento);
    document.getElementById("inventory-scope-select")?.addEventListener("change", async evento => {
        ESTADO.ambito = evento.target.value;
        ESTADO.inventario.offset = 0;
        ESTADO.movimientos.offset = 0;
        await cargarTodo();
    });
    document.querySelectorAll("[data-tab]").forEach(boton => boton.addEventListener("click", async () => {
        ESTADO.pestaña = boton.dataset.tab;
        document.querySelectorAll("[data-tab]").forEach(item => item.classList.toggle("is-active", item === boton));
        await cargarContenido();
    }));
}

function crearSelectorAmbito() {
    if (!ESTADO.catalogos.puede_administrar) {
        const jurisdiccion = ESTADO.catalogos.jurisdicciones.find(item => item.clave === ESTADO.ambito);
        return `<section class="inventory-scope"><div><span>Ámbito</span><strong>${escapar(jurisdiccion ? `${jurisdiccion.clave} - ${jurisdiccion.nombre}` : ESTADO.ambito || "Jurisdiccional")}</strong></div></section>`;
    }

    return `
        <section class="inventory-scope inventory-scope--v4">
            <div class="form-group">
                <label for="inventory-scope-select">Ámbito del inventario</label>
                <select id="inventory-scope-select">
                    <option value="TODO_ESTADO">Todo el estado</option>
                    <option value="ESTATAL">Almacén estatal</option>
                    ${ESTADO.catalogos.jurisdicciones.map(jurisdiccion => `
                        <option value="${escapar(jurisdiccion.clave)}">${escapar(`${jurisdiccion.clave} - ${jurisdiccion.nombre}`)}</option>
                    `).join("")}
                </select>
            </div>
            <p>El consolidado agrupa por insumo, lote, presentación y unidad base.</p>
        </section>
    `;
}

async function cargarTodo() {
    document.getElementById("inventory-summary").innerHTML = "Cargando...";
    await Promise.all([cargarResumen(), cargarContenido()]);
}

async function cargarResumen() {
    const respuesta = await obtenerResumenInventario(obtenerToken(), ESTADO.ambito);
    ESTADO.resumen = respuesta.resumen || {};
    const resumen = ESTADO.resumen;

    document.getElementById("inventory-summary").innerHTML = [
        crearTarjeta("Insumos", resumen.productos, "green"),
        crearTarjeta("Lotes", resumen.lotes, "purple"),
        crearTarjeta("Agotados", resumen.agotados, "red"),
        crearTarjeta("Próximos a terminar", resumen.stock_bajo ?? resumen.proximos_terminar ?? 0, "yellow"),
        crearTarjeta("Próximos a caducar", resumen.proximos_caducar, "yellow"),
        crearTarjeta("Caducados", resumen.caducados, "red")
        
    ].join("");
}

function crearTarjeta(etiqueta, contenido, clase) {
    return `<article class="inventory-summary-card inventory-summary-card--${clase}"><span>${escapar(etiqueta)}</span><strong>${escapar(contenido ?? 0)}</strong></article>`;
}

async function cargarContenido() {
    const contenedor = document.getElementById("inventory-content");
    contenedor.innerHTML = "Cargando...";

    if (ESTADO.pestaña === "movimientos") {
        const respuesta = await consultarMovimientosInventario(obtenerToken(), {
            jurisdiccion: ["TODO_ESTADO", "ESTATAL"].includes(ESTADO.ambito) ? null : ESTADO.ambito,
            limite: ESTADO.movimientos.limite,
            offset: ESTADO.movimientos.offset
        });
        ESTADO.movimientos.registros = arreglo(respuesta.movimientos);
        ESTADO.movimientos.total = Number(respuesta.total) || 0;
        renderizarMovimientos();
        return;
    }

    const respuesta = await consultarInventario(obtenerToken(), {
        jurisdiccion: ESTADO.ambito,
        busqueda: ESTADO.inventario.busqueda,
        solo_disponible: ESTADO.inventario.solo,
        limite: ESTADO.inventario.limite,
        offset: ESTADO.inventario.offset
    });
    ESTADO.inventario.registros = arreglo(respuesta.inventario);
    ESTADO.inventario.total = Number(respuesta.total) || 0;
    renderizarInventario();
}

function renderizarInventario() {
    document.getElementById("inventory-content").innerHTML = `
        <section class="inventory-panel">
            <header class="inventory-panel__header"><div><h2>Existencias</h2><p>${ESTADO.inventario.total} lote(s) encontrado(s).</p></div></header>
            <form id="form-inventory-filter" class="inventory-filters inventory-filters--v4">
                <div class="form-group"><label for="inventory-search">Buscar</label><input id="inventory-search" type="search" value="${escapar(ESTADO.inventario.busqueda)}" placeholder="Insumo, lote o presentación"></div>
                <label class="checkbox-control"><input id="inventory-stock" type="checkbox" ${ESTADO.inventario.solo ? "checked" : ""}> Solo con existencia</label>
                <button class="button button--primary" type="submit">Consultar</button>
            </form>
            <div class="inventory-table-wrapper">${crearTablaInventario()}</div>
        </section>
    `;

    document.getElementById("form-inventory-filter").onsubmit = async evento => {
        evento.preventDefault();
        ESTADO.inventario.busqueda = valor("inventory-search");
        ESTADO.inventario.solo = document.getElementById("inventory-stock").checked;
        ESTADO.inventario.offset = 0;
        await cargarContenido();
    };
}

function crearTablaInventario() {
    if (!ESTADO.inventario.registros.length) return `<div class="empty-state"><h3>Sin existencias</h3><p>No hay registros para el ámbito seleccionado.</p></div>`;

    return `
        <table class="inventory-table">
            <thead><tr><th>Insumo</th><th>Lote</th><th>Presentación</th><th>Existencia</th><th>Equivalencia</th><th>Caducidad</th><th>Estado</th></tr></thead>
            <tbody>${ESTADO.inventario.registros.map(item => `
                <tr>
                    <td><strong>${escapar(item.producto)}</strong><small class="inventory-table__secondary">${escapar(item.categoria || "")}</small></td>
                    <td>${escapar(item.lote)}</td>
                    <td>${escapar(item.presentacion || "Sin presentación")}</td>
                    <td><strong>${numero(item.existencia)} ${escapar(item.unidad_base || item.unidad_medida || "")}</strong></td>
                    <td>${item.presentacion_id ? `${numero(item.presentaciones_completas)} completa(s)${Number(item.residuo_unidad_base) > 0 ? ` + ${numero(item.residuo_unidad_base)} ${escapar(item.unidad_base || "")}` : ""}` : "—"}</td>
                    <td>${fecha(item.fecha_caducidad)}</td>
                    <td><span class="inventory-status inventory-status--${String(item.estado || "disponible").toLowerCase()}">${escapar(item.estado || "DISPONIBLE")}</span></td>
                </tr>
            `).join("")}</tbody>
        </table>
    `;
}

function renderizarMovimientos() {
    document.getElementById("inventory-content").innerHTML = `
        <section class="inventory-panel">
            <header class="inventory-panel__header"><div><h2>Movimientos</h2><p>${ESTADO.movimientos.total} movimiento(s) encontrado(s).</p></div>${puedeRegistrarMovimientoInventario(ESTADO.usuario) ? `<button id="btn-movement-tab" class="button button--primary" type="button">Registrar movimiento</button>` : ""}</header>
            <div class="inventory-table-wrapper">${crearTablaMovimientos()}</div>
        </section>
    `;
    document.getElementById("btn-movement-tab")?.addEventListener("click", mostrarFormularioMovimiento);
}

function equivalenciaMovimiento(item) {
    const lotes = ESTADO.catalogos.lotes;
    const presentaciones = ESTADO.catalogos.presentaciones;
    const lote = lotes.find(l => String(l.id) === String(item.lote_id)) ||
        lotes.find(l => String(l.lote) === String(item.lote) &&
            String(l.producto_id || l.producto) === String(item.producto_id || item.producto));
    const presentacion = presentaciones.find(p =>
        String(p.id || p.presentacion_id) === String(item.presentacion_id || lote?.presentacion_id)) ||
        presentaciones.find(p =>
            String(p.nombre || '').trim().toLowerCase() === String(item.presentacion || lote?.presentacion || '').trim().toLowerCase() &&
            String(p.producto_id) === String(item.producto_id || lote?.producto_id));

    const cantidadBase = Number(item.cantidad ?? item.cantidad_base);
    const capturada = Number(item.cantidad_capturada);
    const tipo = String(item.tipo_captura || '').toUpperCase();
    const contenidoCatalogo = Number(item.contenido_presentacion ??
        presentacion?.contenido ?? presentacion?.contenido_presentacion ?? lote?.contenido_presentacion);
    const contenidoDeducido = tipo === 'PRESENTACION' &&
        Number.isFinite(capturada) && capturada > 0 &&
        Number.isFinite(cantidadBase) && cantidadBase > 0
        ? cantidadBase / capturada : NaN;
    const contenido = Number.isFinite(contenidoCatalogo) && contenidoCatalogo > 0
        ? contenidoCatalogo : contenidoDeducido;
    const nombre = item.presentacion || presentacion?.nombre || lote?.presentacion || 'presentación';
    const unidad = item.unidad_base || presentacion?.unidad_medida || lote?.unidad_base || '';

    if (!Number.isFinite(contenido) || contenido <= 0 || !Number.isFinite(cantidadBase)) {
        return 'Sin datos suficientes para convertir a presentaciones';
    }
    const equivalentes = cantidadBase / contenido;
    return `${numero(equivalentes)} presentaciones equivalentes · ${nombre} (1 = ${numero(contenido)} ${unidad})`;
}

function ubicacionMovimiento(tipo, id) {
    const t = String(tipo || "").toUpperCase();
    const clave = String(id ?? "");
    if (t.includes("ESTATAL")) return "Almacén estatal";
    if (t.includes("JUR")) {
        const j = ESTADO.catalogos.jurisdicciones.find(x => String(x.id) === clave || String(x.clave) === clave || String(Number(x.clave)) === clave);
        return j ? `JS ${j.clave} · ${j.nombre}` : `Jurisdicción ${clave || "no especificada"}`;
    }
    return [tipo, id].filter(Boolean).join(" · ") || "No especificado";
}

function crearTablaMovimientos() {
    if (!ESTADO.movimientos.registros.length) return `<div class="empty-state"><h3>Sin movimientos</h3></div>`;

    return `
        <table class="inventory-table inventory-table--movements">
            <thead><tr><th>Fecha</th><th>Movimiento</th><th>Insumo / lote</th><th>Origen</th><th>Destino</th><th>Capturado</th><th>Cantidad base y equivalencia</th><th>Observaciones</th></tr></thead>
            <tbody>${ESTADO.movimientos.registros.map(item => `
                <tr>
                    <td>${escapar(String(item.fecha_movimiento || "").replace("T", " ").slice(0, 16))}</td>
                    <td>${escapar(item.tipo_movimiento)}</td>
                    <td><strong>${escapar(item.producto)}</strong><small class="inventory-table__secondary">${escapar(item.lote)}</small></td>
                    <td>${escapar(ubicacionMovimiento(item.origen_tipo, item.origen_id))}</td>
                    <td>${escapar(ubicacionMovimiento(item.destino_tipo, item.destino_id))}</td>
                    <td>${numero(item.cantidad_capturada ?? item.cantidad)} ${item.tipo_captura === "PRESENTACION" ? escapar(item.presentacion || "presentación") : escapar(item.unidad_base || "")}</td>
                    <td><strong>${numero(item.cantidad)} ${escapar(item.unidad_base || "")}</strong><small class="inventory-table__secondary">${escapar(equivalenciaMovimiento(item))}</small></td>
                    <td>${escapar(item.observaciones || "")}</td>
                </tr>
            `).join("")}</tbody>
        </table>
    `;
}

function abrirModal(contenido) {
    const raiz = document.getElementById("inventory-modal-root");
    raiz.innerHTML = `<div class="inventory-modal-overlay"><section class="inventory-modal inventory-modal--wide">${contenido}</section></div>`;
    raiz.querySelectorAll("[data-close-modal]").forEach(boton => boton.onclick = cerrarModal);
    raiz.querySelector(".inventory-modal-overlay")?.addEventListener("click", evento => {
        if (evento.target.classList.contains("inventory-modal-overlay")) cerrarModal();
    });
}

function cerrarModal() {
    const raiz = document.getElementById("inventory-modal-root");
    if (raiz) raiz.innerHTML = "";
}

function encabezadoModal(eyebrow, titulo) {
    return `<header class="modal-header"><div><p class="modal-header__eyebrow">${escapar(eyebrow)}</p><h2>${escapar(titulo)}</h2></div><button class="modal-close" type="button" data-close-modal>×</button></header>`;
}

function opcionesProductos() {
    return ESTADO.catalogos.productos.map(item => `<option value="${escapar(item.id)}">${escapar(item.nombre)}</option>`).join("");
}

function opcionesJurisdicciones(excluir = null) {
    return ESTADO.catalogos.jurisdicciones
        .filter(item => item.clave !== excluir)
        .map(item => `<option value="${escapar(item.clave)}">${escapar(`${item.clave} - ${item.nombre}`)}</option>`)
        .join("");
}

function opcionesLotes(filtro = () => true) {
    return ESTADO.catalogos.lotes.filter(filtro).map(item => `<option value="${escapar(item.id)}">${escapar(`${item.producto} · ${item.lote} · ${item.presentacion || "Sin presentación"}`)}</option>`).join("");
}

function mostrarFormularioProducto() {
    if (!ESTADO.catalogos.puede_administrar) {
        window.alert("Su perfil no tiene permisos para administrar el catálogo de inventario.");
        return;
    }

    abrirModal(`
        ${encabezadoModal("Catálogo de insumos", "Registrar insumo")}
        <form id="form-producto" class="modal-body modal-body--full">
            <div class="form-grid form-grid--two">
                <div class="form-group form-group--full"><label for="product-name">Nombre del insumo</label><input id="product-name" required maxlength="200" autocomplete="off"></div>
                <div class="form-group form-group--full"><label for="product-category">Categoría</label><select id="product-category" required><option value="">Seleccione</option>${CATEGORIAS.map(item => `<option value="${item.id}">${escapar(item.nombre)}</option>`).join("")}</select></div>
                <div class="form-group form-group--full"><label for="product-observations">Observaciones</label><textarea id="product-observations" rows="4" maxlength="1000" placeholder="Opcional"></textarea></div>
            </div>
            <div id="product-message" class="form-message"></div>
            <div class="modal-actions"><button type="button" class="button button--secondary" data-close-modal>Cancelar</button><button id="save-product" class="button button--primary" type="submit">Registrar insumo</button></div>
        </form>
    `);

    document.getElementById("form-producto").onsubmit = async evento => {
        evento.preventDefault();
        const categoria = CATEGORIAS.find(item => item.id === valor("product-category"));
        if (!categoria) return mostrarMensaje("product-message", "Seleccione una categoría válida.");

        try {
            bloquear("save-product", true, "Registrando...");
            await registrarProductoInventario(obtenerToken(), {
                nombre: valor("product-name"),
                categoria_id: categoria.id,
                categoria_codigo: categoria.codigo,
                categoria: categoria.nombre,
                observaciones: valor("product-observations")
            });
            cerrarModal();
            await recargarCatalogosYDatos();
        } catch (error) {
            mostrarMensaje("product-message", error.message);
            bloquear("save-product", false, "Registrar insumo");
        }
    };
}

function mostrarFormularioPresentacion() {
    if (!ESTADO.catalogos.puede_administrar) {
        window.alert("Su perfil no tiene permisos para administrar el catálogo de inventario.");
        return;
    }

    abrirModal(`
        ${encabezadoModal("Catálogo de presentaciones", "Registrar presentación")}
        <form id="form-presentation" class="modal-body modal-body--full">
            <div class="form-grid form-grid--two">
                <div class="form-group form-group--full"><label for="presentation-product">Insumo</label><select id="presentation-product" required><option value="">Seleccione</option>${opcionesProductos()}</select></div>
                <div class="form-group"><label for="presentation-name">Nombre de la presentación</label><input id="presentation-name" required maxlength="150" placeholder="Ej. Caja 1 tableta"></div>
                <div class="form-group"><label for="presentation-content">Contenido en unidad base</label><input id="presentation-content" type="number" min="0.000001" step="0.000001" required placeholder="0.112"></div>
                <div class="form-group form-group--full"><label for="presentation-unit">Unidad base</label><select id="presentation-unit" required><option value="">Seleccione</option>${UNIDADES.map(item => `<option value="${item}">${item}</option>`).join("")}</select></div>
                <div class="form-group form-group--full"><div class="inventory-help">La misma presentación puede gastarse por pieza/presentación o directamente por unidad base. Ejemplo: 1 caja = 0.112 G.</div></div>
            </div>
            <div id="presentation-message" class="form-message"></div>
            <div class="modal-actions"><button type="button" class="button button--secondary" data-close-modal>Cancelar</button><button id="save-presentation" class="button button--primary" type="submit">Registrar presentación</button></div>
        </form>
    `);

    document.getElementById("form-presentation").onsubmit = async evento => {
        evento.preventDefault();
        try {
            bloquear("save-presentation", true, "Registrando...");
            await registrarPresentacionProducto(obtenerToken(), {
                producto_id: valor("presentation-product"),
                nombre: valor("presentation-name"),
                contenido: valorNumero("presentation-content"),
                unidad_medida: valor("presentation-unit")
            });
            cerrarModal();
            await recargarCatalogosYDatos();
        } catch (error) {
            mostrarMensaje("presentation-message", error.message);
            bloquear("save-presentation", false, "Registrar presentación");
        }
    };
}

function mostrarFormularioMovimiento() {
    if (
    !ESTADO.catalogos.puede_administrar &&
    !puedeRegistrarMovimientoInventario(ESTADO.usuario)
) {
        window.alert("Su perfil tiene permisos únicamente de consulta.");
        return;
    }

    const operacionesSupervisor = `
        <option value="RECEPCION">Recepción al almacén estatal</option>
        <option value="RECEPCION_DISTRIBUCION">Recepción y distribución directa</option>
        <option value="DISTRIBUCION">Distribuir del almacén estatal</option>
        <option value="TRANSFERENCIA_JUR">Transferir entre jurisdicciones</option>
        <option value="DEVOLUCION">Devolver al almacén estatal</option>
        <option value="AJUSTE_ESTATAL_POS">Ajuste positivo estatal</option>
        <option value="AJUSTE_ESTATAL_NEG">Ajuste negativo estatal</option>
        <option value="AJUSTE_JUR_POS">Ajuste positivo jurisdiccional</option>
        <option value="AJUSTE_JUR_NEG">Ajuste negativo jurisdiccional</option>
    `;
    const operacionesJur = `<option value="TRANSFERENCIA_JUR">Transferir entre jurisdicciones</option><option value="DEVOLUCION">Devolver al almacén estatal</option>`;

    abrirModal(`
        ${encabezadoModal("Control de existencias", "Registrar movimiento")}
        <form id="form-movement" class="modal-body modal-body--full">
            <div class="form-grid form-grid--two">
                <div class="form-group form-group--full"><label for="movement-operation">Operación</label><select id="movement-operation" required><option value="">Seleccione</option>${ESTADO.catalogos.puede_administrar ? operacionesSupervisor : operacionesJur}</select></div>
            </div>
            <div id="movement-dynamic"></div>
            <div id="movement-message" class="form-message"></div>
            <div class="modal-actions"><button type="button" class="button button--secondary" data-close-modal>Cancelar</button><button id="save-movement" class="button button--primary" type="submit">Registrar movimiento</button></div>
        </form>
    `);

    document.getElementById("movement-operation").onchange = renderizarCamposMovimiento;
    document.getElementById("form-movement").onsubmit = procesarMovimiento;
}

function renderizarCamposMovimiento() {
    const operacion = valor("movement-operation");
    const contenedor = document.getElementById("movement-dynamic");

    if (["RECEPCION", "RECEPCION_DISTRIBUCION"].includes(operacion)) {
        contenedor.innerHTML = crearCamposRecepcion(operacion === "RECEPCION_DISTRIBUCION");
        registrarEventosRecepcion();
        return;
    }

    contenedor.innerHTML = crearCamposMovimientoExistente(operacion);
    registrarEventosMovimientoExistente();
}

function crearCamposRecepcion(distribucionDirecta) {
    return `
        <div class="form-grid form-grid--two inventory-dynamic-section">
            <div class="inventory-lot-mode inventory-subgrid--full">
                <span class="inventory-lot-mode__label">Lote</span>
                <div class="inventory-segmented" role="radiogroup" aria-label="Tipo de lote">
                    <label>
                        <input type="radio" name="lot-mode" value="NUEVO" checked>
                        <span>Nuevo</span>
                    </label>
                    <label>
                        <input type="radio" name="lot-mode" value="EXISTENTE">
                        <span>Existente</span>
                    </label>
                </div>
            </div>
            <div id="new-lot-fields" class="inventory-subgrid inventory-subgrid--full">
                <div class="form-group"><label for="movement-product">Insumo</label><select id="movement-product" required><option value="">Seleccione</option>${opcionesProductos()}</select></div>
                <div class="form-group"><label for="movement-presentation">Presentación</label><select id="movement-presentation" required disabled><option value="">Seleccione primero un insumo</option></select></div>
                <div class="form-group"><label for="movement-lot-number">Número de lote</label><input id="movement-lot-number" maxlength="100" required></div>
                <div class="form-group"><label for="movement-manufacture">Fabricación</label><input id="movement-manufacture" type="date"></div>
                <div class="form-group"><label for="movement-expiration">Caducidad</label><input id="movement-expiration" type="date"></div>
            </div>
            <div id="existing-lot-fields" class="form-group form-group--full" hidden><label for="movement-existing-lot">Lote existente</label><select id="movement-existing-lot"><option value="">Seleccione</option>${opcionesLotes()}</select></div>
            ${crearCamposCantidad("Cantidad recibida")}
            <div class="form-group form-group--full"><div id="movement-equivalence" class="inventory-help"></div></div>
            ${distribucionDirecta ? `
                <div class="form-group form-group--full"><div class="inventory-section-heading"><div><h3>Distribución directa</h3><p>La parte no distribuida permanecerá en el almacén estatal.</p></div><button id="add-distribution" class="button button--secondary" type="button">Agregar jurisdicción</button></div><div id="distribution-list" class="distribution-list"></div><div id="distribution-summary" class="inventory-help"></div></div>
            ` : ""}
            <div class="form-group form-group--full"><label for="movement-observations">Observaciones</label><textarea id="movement-observations" rows="3" maxlength="1000"></textarea></div>
        </div>
    `;
}

function crearCamposCantidad(etiqueta) {
    return `
        <div class="form-group"><label for="movement-capture-type">Capturar como</label><select id="movement-capture-type" required><option value="PRESENTACION">Presentaciones completas</option><option value="UNIDAD_BASE">Unidad base</option></select></div>
        <div class="form-group"><label id="movement-quantity-label" for="movement-quantity">${escapar(etiqueta)}</label><input id="movement-quantity" type="number" min="0.000001" step="0.000001" required></div>
    `;
}

function crearCamposMovimientoExistente(operacion) {
    const requiereOrigen = ["TRANSFERENCIA_JUR", "DEVOLUCION", "AJUSTE_JUR_NEG"].includes(operacion);
    const requiereDestino = ["TRANSFERENCIA_JUR", "DISTRIBUCION", "AJUSTE_JUR_POS"].includes(operacion);

    return `
        <div class="form-grid form-grid--two inventory-dynamic-section">
            ${requiereOrigen ? `<div class="form-group"><label for="movement-origin-jur">Jurisdicción origen</label><select id="movement-origin-jur" required><option value="">Seleccione</option>${opcionesJurisdicciones()}</select></div>` : ""}
            ${requiereDestino ? `<div class="form-group"><label for="movement-destination-jur">Jurisdicción destino</label><select id="movement-destination-jur" required><option value="">Seleccione</option>${opcionesJurisdicciones()}</select></div>` : ""}
            <div class="form-group form-group--full"><label for="movement-lot">Insumo y lote</label><select id="movement-lot" required ${requiereOrigen ? "disabled" : ""}><option value="">${requiereOrigen ? "Seleccione primero la jurisdicción origen" : "Seleccione"}</option>${requiereOrigen ? "" : opcionesLotes()}</select></div>
            ${crearCamposCantidad("Cantidad")}
            <div class="form-group form-group--full"><div id="movement-equivalence" class="inventory-help"></div></div>
            <div class="form-group form-group--full"><label for="movement-reason">Motivo</label><input id="movement-reason" maxlength="250" ${operacion.startsWith("AJUSTE") ? "required" : ""}></div>
            <div class="form-group form-group--full"><label for="movement-observations">Observaciones</label><textarea id="movement-observations" rows="3" maxlength="1000"></textarea></div>
        </div>
    `;
}

function registrarEventosRecepcion() {
    document.querySelectorAll('input[name="lot-mode"]').forEach(input => input.onchange = actualizarModoLote);
    document.getElementById("movement-product")?.addEventListener("change", actualizarPresentacionesMovimiento);
    document.getElementById("movement-presentation")?.addEventListener("change", actualizarEquivalenciaMovimiento);
    document.getElementById("movement-existing-lot")?.addEventListener("change", actualizarEquivalenciaMovimiento);
    document.getElementById("movement-capture-type")?.addEventListener("change", actualizarEquivalenciaMovimiento);
    document.getElementById("movement-quantity")?.addEventListener("input", actualizarEquivalenciaMovimiento);
    document.getElementById("add-distribution")?.addEventListener("click", agregarDistribucion);
}

function registrarEventosMovimientoExistente() {
    document.getElementById("movement-origin-jur")?.addEventListener("change", actualizarLotesPorOrigen);
    document.getElementById("movement-lot")?.addEventListener("change", actualizarEquivalenciaMovimiento);
    document.getElementById("movement-capture-type")?.addEventListener("change", actualizarEquivalenciaMovimiento);
    document.getElementById("movement-quantity")?.addEventListener("input", actualizarEquivalenciaMovimiento);
}

function actualizarModoLote() {
    const modo = document.querySelector('input[name="lot-mode"]:checked')?.value || "NUEVO";
    const nuevo = document.getElementById("new-lot-fields");
    const existente = document.getElementById("existing-lot-fields");
    nuevo.hidden = modo !== "NUEVO";
    existente.hidden = modo !== "EXISTENTE";
    nuevo.querySelectorAll("input,select").forEach(campo => campo.required = modo === "NUEVO" && ["movement-product", "movement-presentation", "movement-lot-number"].includes(campo.id));
    document.getElementById("movement-existing-lot").required = modo === "EXISTENTE";
    actualizarEquivalenciaMovimiento();
}

function actualizarPresentacionesMovimiento() {
    const productoId = valor("movement-product");
    const selector = document.getElementById("movement-presentation");
    const presentaciones = ESTADO.catalogos.presentaciones.filter(item => item.producto_id === productoId && item.activo !== false);
    selector.disabled = presentaciones.length === 0;
    selector.innerHTML = presentaciones.length
        ? `<option value="">Seleccione</option>${presentaciones.map(item => `<option value="${escapar(item.id || item.presentacion_id)}">${escapar(`${item.nombre} · ${numero(item.contenido ?? item.contenido_presentacion)} ${String(item.unidad_medida || item.unidad_base || "").toUpperCase()}`)}</option>`).join("")}`
        : `<option value="">El insumo no tiene presentaciones</option>`;
    actualizarEquivalenciaMovimiento();
}

function obtenerDetalleMovimiento() {
    const modo = document.querySelector('input[name="lot-mode"]:checked')?.value;
    let lote = null;
    let presentacion = null;

    if (modo === "EXISTENTE" || document.getElementById("movement-lot")) {
        const loteId = valor(document.getElementById("movement-lot") ? "movement-lot" : "movement-existing-lot");
        lote = ESTADO.catalogos.lotes.find(item => item.id === loteId) || null;
        presentacion = ESTADO.catalogos.presentaciones.find(item => (item.id || item.presentacion_id) === lote?.presentacion_id) || null;
    } else {
        presentacion = ESTADO.catalogos.presentaciones.find(item => (item.id || item.presentacion_id) === valor("movement-presentation")) || null;
    }

    return {
        lote,
        presentacion,
        contenido: Number(presentacion?.contenido ?? presentacion?.contenido_presentacion ?? lote?.contenido_presentacion ?? 1) || 1,
        unidad: String(presentacion?.unidad_medida || presentacion?.unidad_base || lote?.unidad_base || lote?.unidad_medida || "").toUpperCase(),
        nombre: presentacion?.nombre || lote?.presentacion || "presentación"
    };
}

function actualizarEquivalenciaMovimiento() {
    const contenedor = document.getElementById("movement-equivalence");
    if (!contenedor) return;
    const detalle = obtenerDetalleMovimiento();
    const cantidad = valorNumero("movement-quantity");
    const tipo = valor("movement-capture-type") || "PRESENTACION";

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
        contenedor.textContent = detalle.presentacion ? `1 ${detalle.nombre} = ${numero(detalle.contenido)} ${detalle.unidad}` : "";
        actualizarResumenDistribucion();
        return;
    }

    const base = tipo === "PRESENTACION" ? cantidad * detalle.contenido : cantidad;
    contenedor.innerHTML = tipo === "PRESENTACION"
        ? `<strong>${numero(cantidad)} ${escapar(detalle.nombre)}(s)</strong> equivalen a <strong>${numero(base)} ${escapar(detalle.unidad)}</strong>.`
        : `<strong>${numero(cantidad)} ${escapar(detalle.unidad)}</strong> se registrarán directamente en unidad base.`;
    actualizarResumenDistribucion();
}

function agregarDistribucion() {
    const lista = document.getElementById("distribution-list");
    const indice = lista.children.length;
    const fila = document.createElement("div");
    fila.className = "distribution-row";
    fila.innerHTML = `<div class="form-group"><label>Jurisdicción</label><select class="distribution-jur" required><option value="">Seleccione</option>${opcionesJurisdicciones()}</select></div><div class="form-group"><label>Cantidad</label><input class="distribution-quantity" type="number" min="0.000001" step="0.000001" required></div><button class="button button--danger distribution-remove" type="button" aria-label="Eliminar distribución">Eliminar</button>`;
    fila.dataset.index = String(indice);
    lista.appendChild(fila);
    fila.querySelector(".distribution-remove").onclick = () => { fila.remove(); actualizarResumenDistribucion(); };
    fila.querySelector(".distribution-quantity").oninput = actualizarResumenDistribucion;
    fila.querySelector(".distribution-jur").onchange = actualizarResumenDistribucion;
    actualizarResumenDistribucion();
}

function obtenerDistribuciones() {
    return [...document.querySelectorAll(".distribution-row")].map(fila => ({
        cve_jur_res: fila.querySelector(".distribution-jur")?.value || "",
        cantidad_capturada: Number(fila.querySelector(".distribution-quantity")?.value || 0),
        tipo_captura: valor("movement-capture-type") || "PRESENTACION"
    })).filter(item => item.cve_jur_res && item.cantidad_capturada > 0);
}

function actualizarResumenDistribucion() {
    const contenedor = document.getElementById("distribution-summary");
    if (!contenedor) return;
    const recibido = valorNumero("movement-quantity") || 0;
    const distribuido = obtenerDistribuciones().reduce((total, item) => total + item.cantidad_capturada, 0);
    const restante = recibido - distribuido;
    contenedor.innerHTML = `<strong>Recibido:</strong> ${numero(recibido)} · <strong>Distribuido:</strong> ${numero(distribuido)} · <strong>Permanece estatal:</strong> ${numero(restante)}`;
    contenedor.classList.toggle("inventory-help--error", restante < 0);
}

async function actualizarLotesPorOrigen() {
    const origen = valor("movement-origin-jur");
    const selector = document.getElementById("movement-lot");
    if (!selector) return;

    if (!origen) {
        selector.innerHTML = `<option value="">Seleccione primero la jurisdicción origen</option>`;
        selector.disabled = true;
        actualizarEquivalenciaMovimiento();
        return;
    }

    selector.disabled = true;
    selector.innerHTML = `<option value="">Cargando insumos...</option>`;

    try {
        const respuesta = await consultarInventario(obtenerToken(), {
            jurisdiccion: origen,
            busqueda: "",
            solo_disponible: true,
            limite: 5000,
            offset: 0
        });

        const inventarioOrigen = arreglo(respuesta.inventario)
            .filter(item => Number(item.existencia ?? 0) > 0);

        selector.innerHTML = inventarioOrigen.length
            ? `<option value="">Seleccione</option>${inventarioOrigen.map(item => {
                const loteId = item.lote_id || item.id;
                const loteCatalogo = ESTADO.catalogos.lotes.find(lote => lote.id === loteId);
                const producto = item.producto || loteCatalogo?.producto || "Insumo";
                const lote = item.lote || loteCatalogo?.lote || "Sin lote";
                const presentacion = item.presentacion || loteCatalogo?.presentacion || "Sin presentación";
                const unidadBase = item.unidad_base || item.unidad_medida || loteCatalogo?.unidad_base || loteCatalogo?.unidad_medida || "";
                const existencia = Number(item.existencia ?? 0);

                return `<option value="${escapar(loteId)}">${escapar(`${producto} · ${lote} · ${presentacion} · Disponible: ${numero(existencia)} ${unidadBase}`)}</option>`;
            }).join("")}`
            : `<option value="">La jurisdicción no tiene insumos disponibles</option>`;

        selector.disabled = inventarioOrigen.length === 0;
    } catch (error) {
        selector.innerHTML = `<option value="">No fue posible cargar los insumos</option>`;
        selector.disabled = true;
        mostrarMensaje("movement-message", error.message);
    }

    actualizarEquivalenciaMovimiento();
}

async function procesarMovimiento(evento) {
    evento.preventDefault();

    if (
    !ESTADO.catalogos.puede_administrar &&
    !puedeRegistrarMovimientoInventario(ESTADO.usuario)
) {
        window.alert("Su perfil tiene permisos únicamente de consulta.");
        cerrarModal();
        return;
    }

    const operacion = valor("movement-operation");

    try {
        bloquear("save-movement", true, "Registrando...");

        if (["RECEPCION", "RECEPCION_DISTRIBUCION"].includes(operacion)) {
            const modoLote = document.querySelector('input[name="lot-mode"]:checked')?.value || "NUEVO";
            const distribuciones = operacion === "RECEPCION_DISTRIBUCION" ? obtenerDistribuciones() : [];
            const recibido = valorNumero("movement-quantity");
            const distribuido = distribuciones.reduce((total, item) => total + item.cantidad_capturada, 0);
            if (distribuido > recibido) throw new Error("La cantidad distribuida no puede superar la cantidad recibida.");

            await registrarRecepcionInventario(obtenerToken(), {
                modo_lote: modoLote,
                lote_id: modoLote === "EXISTENTE" ? valor("movement-existing-lot") : null,
                producto_id: modoLote === "NUEVO" ? valor("movement-product") : null,
                presentacion_id: modoLote === "NUEVO" ? valor("movement-presentation") : null,
                lote: modoLote === "NUEVO" ? valor("movement-lot-number") : null,
                cantidad_capturada: recibido,
                tipo_captura: valor("movement-capture-type"),
                fecha_fabricacion: valor("movement-manufacture"),
                fecha_caducidad: valor("movement-expiration"),
                observaciones: valor("movement-observations"),
                distribuciones
            });
        } else {
            const ruta = construirRuta(operacion);
            await registrarMovimientoInventario(obtenerToken(), {
                lote_id: valor("movement-lot"),
                cantidad_capturada: valorNumero("movement-quantity"),
                tipo_captura: valor("movement-capture-type"),
                motivo: valor("movement-reason"),
                observaciones: valor("movement-observations"),
                ...ruta
            });
        }

        cerrarModal();
        await recargarCatalogosYDatos();
    } catch (error) {
        mostrarMensaje("movement-message", error.message);
        bloquear("save-movement", false, "Registrar movimiento");
    }
}

function construirRuta(operacion) {
    const origen = valor("movement-origin-jur");
    const destino = valor("movement-destination-jur");

    const rutas = {
        DISTRIBUCION: { tipo_movimiento: "TRANSFERENCIA_JURISDICCION", cve_jur_res: destino, origen_tipo: "ESTATAL", origen_id: "ESTATAL", destino_tipo: "JURISDICCION", destino_id: destino },
        TRANSFERENCIA_JUR: { tipo_movimiento: "TRANSFERENCIA_ENTRE_JURISDICCIONES", cve_jur_res: origen, origen_tipo: "JURISDICCION", origen_id: origen, destino_tipo: "JURISDICCION", destino_id: destino },
        DEVOLUCION: { tipo_movimiento: "DEVOLUCION_ESTATAL", cve_jur_res: origen, origen_tipo: "JURISDICCION", origen_id: origen, destino_tipo: "ESTATAL", destino_id: "ESTATAL" },
        AJUSTE_ESTATAL_POS: { tipo_movimiento: "AJUSTE_POSITIVO_ESTATAL", origen_tipo: "AJUSTE", origen_id: "ADMINISTRATIVO", destino_tipo: "ESTATAL", destino_id: "ESTATAL" },
        AJUSTE_ESTATAL_NEG: { tipo_movimiento: "AJUSTE_NEGATIVO_ESTATAL", origen_tipo: "ESTATAL", origen_id: "ESTATAL", destino_tipo: "AJUSTE", destino_id: "ADMINISTRATIVO" },
        AJUSTE_JUR_POS: { tipo_movimiento: "AJUSTE_POSITIVO_JURISDICCION", cve_jur_res: destino, origen_tipo: "AJUSTE", origen_id: "ADMINISTRATIVO", destino_tipo: "JURISDICCION", destino_id: destino },
        AJUSTE_JUR_NEG: { tipo_movimiento: "AJUSTE_NEGATIVO_JURISDICCION", cve_jur_res: origen, origen_tipo: "JURISDICCION", origen_id: origen, destino_tipo: "AJUSTE", destino_id: "ADMINISTRATIVO" }
    };

    const ruta = rutas[operacion];
    if (!ruta) throw new Error("La operación seleccionada no es válida.");
    if (operacion === "TRANSFERENCIA_JUR" && origen === destino) throw new Error("La jurisdicción origen y destino deben ser diferentes.");
    return ruta;
}

function mostrarMensaje(id, mensaje) {
    const elemento = document.getElementById(id);
    if (!elemento) return;
    elemento.className = "form-message form-message--error";
    elemento.textContent = mensaje;
}

function bloquear(id, bloqueado, texto) {
    const boton = document.getElementById(id);
    if (!boton) return;
    boton.disabled = bloqueado;
    boton.textContent = texto;
}

async function recargarCatalogosYDatos() {
    await cargarCatalogos();
    await cargarTodo();
}
