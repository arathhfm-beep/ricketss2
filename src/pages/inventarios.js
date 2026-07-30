import { CONFIG } from "../../config.js";

import {
    obtenerCatalogosInventario,
    registrarPresentacionProducto,
    registrarLote,
    registrarMovimientoInventario,
    consultarInventario,
    consultarMovimientosInventario,
    obtenerResumenInventario
} from "../services/inventarios.service.js";

import {
    obtenerCookie
} from "../utils/cookies.js";

import {
    navegar
} from "../utils/router.js";


const ESTADO = {
    pestaña: "existencias",

    cargando: false,

    catalogos: {
        puede_administrar: false,
        jurisdiccion_usuario: null,
        productos: [],
        presentaciones: [],
        lotes: [],
        jurisdicciones: [],
        tipos_movimiento: []
    },

    jurisdiccionSeleccionada: null,

    resumen: {},

    inventario: {
        registros: [],
        total: 0,
        limite: 50,
        offset: 0,
        filtros: crearFiltrosInventario()
    },

    movimientos: {
        registros: [],
        total: 0,
        limite: 50,
        offset: 0,
        filtros: crearFiltrosMovimientos()
    }
};


/*
==========================================================
INICIO
==========================================================
*/

export async function mostrarInventarios(
    opciones = {}
) {
    document.title =
        `Inventarios | ${CONFIG.APP_NAME}`;

    reiniciarEstado();

    if (
        opciones.pestañaInicial ===
        "movimientos"
    ) {
        ESTADO.pestaña =
            "movimientos";
    }

    renderizarCargaInicial();

    try {
        await cargarCatalogos();

        prepararJurisdiccionInicial();

        renderizarPagina();

        await cargarInformacionCompleta();
    } catch (error) {
        renderizarErrorGeneral(error);
    }
}


function reiniciarEstado() {
    ESTADO.pestaña = "existencias";
    ESTADO.cargando = false;
    ESTADO.jurisdiccionSeleccionada = null;
    ESTADO.resumen = {};

    ESTADO.inventario = {
        registros: [],
        total: 0,
        limite: 50,
        offset: 0,
        filtros: crearFiltrosInventario()
    };

    ESTADO.movimientos = {
        registros: [],
        total: 0,
        limite: 50,
        offset: 0,
        filtros: crearFiltrosMovimientos()
    };
}


async function cargarCatalogos() {
    const respuesta =
        await obtenerCatalogosInventario(
            obtenerToken()
        );

    ESTADO.catalogos = {
        puede_administrar:
            Boolean(
                respuesta.puede_administrar
            ),

        jurisdiccion_usuario:
            respuesta.jurisdiccion_usuario ||
            null,

        productos:
            obtenerArreglo(
                respuesta.productos
            ),

        presentaciones:
            obtenerArreglo(
                respuesta.presentaciones
            ),

        lotes:
            obtenerArreglo(
                respuesta.lotes
            ),

        jurisdicciones:
            obtenerArreglo(
                respuesta.jurisdicciones
            ),

        tipos_movimiento:
            obtenerArreglo(
                respuesta.tipos_movimiento
            )
    };
}


function prepararJurisdiccionInicial() {
    if (!ESTADO.catalogos.puede_administrar) {
        ESTADO.jurisdiccionSeleccionada =
            ESTADO.catalogos
                .jurisdiccion_usuario;

        ESTADO.inventario.filtros.jurisdiccion =
            ESTADO.jurisdiccionSeleccionada;

        ESTADO.movimientos.filtros.jurisdiccion =
            ESTADO.jurisdiccionSeleccionada;

        return;
    }

    ESTADO.jurisdiccionSeleccionada = "TODO_ESTADO";
}


/*
==========================================================
RENDERIZADO GENERAL
==========================================================
*/

function renderizarPagina() {
    const app = obtenerApp();

    app.innerHTML = `
        <div class="inventory-page">

            <header class="inventory-header">

                <div>
                    <p class="inventory-header__eyebrow">
                        Control de existencias
                    </p>

                    <h1>Inventarios</h1>

                    <p>
                        Consulte lotes, existencias y
                        movimientos de almacén.
                    </p>
                </div>

                <div class="inventory-header__actions">

                    ${
                        ESTADO.catalogos
                            .puede_administrar
                            ? `
                                <button
                                    id="btn-nuevo-lote"
                                    class="button button--primary"
                                    type="button"
                                >
                                    Registrar lote
                                </button>
                            `
                            : ""
                    }

                    <button
                        id="btn-nuevo-movimiento"
                        class="button button--primary"
                        type="button"
                    >
                        Registrar movimiento
                    </button>

                    <button
                        id="btn-inventario-inicio"
                        class="button button--secondary"
                        type="button"
                    >
                        Volver al inicio
                    </button>

                </div>

            </header>

            <main class="inventory-main">

                ${crearSelectorAmbito()}

                <section
                    id="inventory-summary"
                    class="inventory-summary"
                >
                    ${crearCargaResumen()}
                </section>

                ${crearPestañas()}

                <section
                    id="inventory-content"
                    class="inventory-content"
                >
                    ${crearCargaContenido()}
                </section>

            </main>

            <div
                id="inventory-modal-root"
                class="modal-root"
            ></div>

        </div>
    `;

    registrarEventosGenerales();
}


function crearSelectorAmbito() {
    if (!ESTADO.catalogos.puede_administrar) {
        const jurisdiccion =
            ESTADO.catalogos.jurisdicciones
                .find(
                    item =>
                        item.clave ===
                        ESTADO.catalogos
                            .jurisdiccion_usuario
                );

        return `
            <section class="inventory-scope">

                <div>
                    <span>Ámbito</span>

                    <strong>
                        ${escaparHTML(
                            jurisdiccion
                                ? `${jurisdiccion.clave} - ${jurisdiccion.nombre}`
                                : ESTADO.catalogos
                                    .jurisdiccion_usuario ||
                                    "Jurisdiccional"
                        )}
                    </strong>
                </div>

            </section>
        `;
    }

    return `
        <section class="inventory-scope">

            <div class="form-group">
                <label for="inventory-scope-select">
                    Ámbito del inventario
                </label>

                <select id="inventory-scope-select">

                    <option
                        value="TODO_ESTADO"
                        ${
                            ESTADO.jurisdiccionSeleccionada === "TODO_ESTADO"
                                ? "selected"
                                : ""
                        }
                    >
                        Todo el estado
                    </option>

                    <option
                        value="ESTATAL"
                        ${
                            ESTADO.jurisdiccionSeleccionada === "ESTATAL"
                                ? "selected"
                                : ""
                        }
                    >
                        Almacén estatal
                    </option>

                    ${ESTADO.catalogos
                        .jurisdicciones
                        .map(jurisdiccion => `
                            <option
                                value="${escaparHTML(
                                    jurisdiccion.clave
                                )}"
                                ${
                                    ESTADO
                                        .jurisdiccionSeleccionada ===
                                    jurisdiccion.clave
                                        ? "selected"
                                        : ""
                                }
                            >
                                ${escaparHTML(
                                    `${jurisdiccion.clave} - ${jurisdiccion.nombre}`
                                )}
                            </option>
                        `)
                        .join("")}

                </select>
            </div>

            <p>
                Seleccione el total consolidado del estado,
                únicamente el almacén estatal o una jurisdicción.
            </p>

        </section>
    `;
}


function crearPestañas() {
    return `
        <nav
            class="inventory-tabs"
            aria-label="Secciones de inventario"
        >

            <button
                class="inventory-tab ${
                    ESTADO.pestaña ===
                    "existencias"
                        ? "is-active"
                        : ""
                }"
                type="button"
                data-inventory-tab="existencias"
            >
                Existencias
            </button>

            <button
                class="inventory-tab ${
                    ESTADO.pestaña ===
                    "movimientos"
                        ? "is-active"
                        : ""
                }"
                type="button"
                data-inventory-tab="movimientos"
            >
                Movimientos
            </button>

        </nav>
    `;
}


function registrarEventosGenerales() {
    document
        .getElementById(
            "btn-inventario-inicio"
        )
        .addEventListener(
            "click",
            () => navegar("/inicio")
        );

    document
        .getElementById(
            "btn-nuevo-lote"
        )
        ?.addEventListener(
            "click",
            mostrarFormularioLote
        );

    document
        .getElementById(
            "btn-nuevo-movimiento"
        )
        .addEventListener(
            "click",
            mostrarFormularioMovimiento
        );

    document
        .getElementById(
            "inventory-scope-select"
        )
        ?.addEventListener(
            "change",
            cambiarAmbito
        );

    document
        .querySelectorAll(
            "[data-inventory-tab]"
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                async () => {
                    const pestaña =
                        boton.dataset
                            .inventoryTab;

                    if (
                        pestaña ===
                            ESTADO.pestaña ||
                        ESTADO.cargando
                    ) {
                        return;
                    }

                    ESTADO.pestaña =
                        pestaña;

                    actualizarPestañas();

                    await cargarPestañaActual();
                }
            );
        });
}


async function cambiarAmbito(evento) {
    ESTADO.jurisdiccionSeleccionada =
        normalizarTexto(
            evento.target.value
        );

    ESTADO.inventario.filtros.jurisdiccion =
        ESTADO.jurisdiccionSeleccionada;

    ESTADO.movimientos.filtros.jurisdiccion =
        ESTADO.jurisdiccionSeleccionada;

    ESTADO.inventario.offset = 0;
    ESTADO.movimientos.offset = 0;

    await cargarInformacionCompleta();
}


function actualizarPestañas() {
    document
        .querySelectorAll(
            "[data-inventory-tab]"
        )
        .forEach(boton => {
            boton.classList.toggle(
                "is-active",
                boton.dataset
                    .inventoryTab ===
                    ESTADO.pestaña
            );
        });
}


/*
==========================================================
CARGA GENERAL
==========================================================
*/

async function cargarInformacionCompleta() {
    if (ESTADO.cargando) {
        return;
    }

    ESTADO.cargando = true;

    mostrarCargaResumen();
    mostrarCargaContenido();

    try {
        await cargarResumen();
        await cargarPestañaActualInterna();
    } catch (error) {
        mostrarErrorContenido(error);
    } finally {
        ESTADO.cargando = false;
    }
}


async function cargarPestañaActual() {
    if (ESTADO.cargando) {
        return;
    }

    ESTADO.cargando = true;

    mostrarCargaContenido();

    try {
        await cargarPestañaActualInterna();
    } catch (error) {
        mostrarErrorContenido(error);
    } finally {
        ESTADO.cargando = false;
    }
}


async function cargarPestañaActualInterna() {
    if (ESTADO.pestaña === "movimientos") {
        await cargarMovimientos();
        return;
    }

    await cargarInventario();
}


/*
==========================================================
RESUMEN
==========================================================
*/

async function cargarResumen() {
    const respuesta =
        await obtenerResumenInventario(
            obtenerToken(),
            ESTADO.jurisdiccionSeleccionada
        );

    ESTADO.resumen =
        respuesta.resumen || {};

    renderizarResumen();
}


function renderizarResumen() {
    const resumen =
        ESTADO.resumen || {};

    const contenedor =
        document.getElementById(
            "inventory-summary"
        );

    contenedor.innerHTML = `
        ${crearTarjetaResumen(
            "Ámbito",
            resumen.etiqueta_ambito ||
                (
                    resumen.ambito === "TODO_ESTADO"
                        ? "Todo el estado"
                        : resumen.ambito === "ESTATAL"
                            ? "Almacén estatal"
                            : resumen.jurisdiccion || "Jurisdiccional"
                ),
            "blue"
        )}

        ${crearTarjetaResumen(
            "Productos",
            formatearEntero(
                resumen.productos
            ),
            "green"
        )}

        ${crearTarjetaResumen(
            "Lotes",
            formatearEntero(
                resumen.lotes
            ),
            "purple"
        )}

        ${crearTarjetaResumen(
            "Existencia por unidad",
            resumen.existencia_desglosada ||
                "Sin existencia",
            "orange"
        )}

        ${crearTarjetaResumen(
            "Agotados",
            formatearEntero(
                resumen.agotados
            ),
            "red"
        )}

        ${crearTarjetaResumen(
            "Próximos a caducar",
            formatearEntero(
                resumen.proximos_caducar
            ),
            "yellow"
        )}
    `;
}


function crearTarjetaResumen(
    etiqueta,
    valor,
    clase
) {
    return `
        <article
            class="
                inventory-summary-card
                inventory-summary-card--${clase}
            "
        >
            <span>
                ${escaparHTML(etiqueta)}
            </span>

            <strong>
                ${escaparHTML(valor)}
            </strong>
        </article>
    `;
}


/*
==========================================================
EXISTENCIAS
==========================================================
*/

async function cargarInventario() {
    const estado =
        ESTADO.inventario;

    const respuesta =
        await consultarInventario(
            obtenerToken(),
            {
                ...estado.filtros,

                jurisdiccion:
                    ESTADO
                        .jurisdiccionSeleccionada,

                limite:
                    estado.limite,

                offset:
                    estado.offset
            }
        );

    estado.registros =
        obtenerArreglo(
            respuesta.inventario
        );

    estado.total =
        Number(respuesta.total) || 0;

    estado.limite =
        Number(respuesta.limite) ||
        estado.limite;

    estado.offset =
        Number(respuesta.offset) || 0;

    renderizarInventario();
}


function renderizarInventario() {
    const estado =
        ESTADO.inventario;

    const contenido =
        obtenerContenido();

    contenido.innerHTML = `
        <section class="inventory-panel">

            <header class="inventory-panel__header">

                <div>
                    <h2>Existencias</h2>

                    <p>
                        ${formatearEntero(
                            estado.total
                        )}
                        lote(s) encontrado(s).
                    </p>
                </div>

            </header>

            ${crearFiltrosInventarioHTML()}

            <div class="inventory-table-wrapper">
                ${crearTablaInventario()}
            </div>

            ${crearPaginacion(
                estado.total,
                estado.limite,
                estado.offset,
                "inventario"
            )}

        </section>
    `;

    registrarEventosInventario();
}


function crearFiltrosInventarioHTML() {
    const filtros =
        ESTADO.inventario.filtros;

    return `
        <form
            id="form-inventory-filters"
            class="inventory-filters"
        >

            <div class="form-group">
                <label for="inventory-search">
                    Buscar
                </label>

                <input
                    id="inventory-search"
                    type="search"
                    value="${escaparHTML(
                        filtros.busqueda || ""
                    )}"
                    placeholder="Producto, código o lote"
                >
            </div>

            <div class="form-group">
                <label for="inventory-category">
                    Categoría
                </label>

                <input
                    id="inventory-category"
                    type="text"
                    value="${escaparHTML(
                        filtros.categoria || ""
                    )}"
                    placeholder="Categoría o tipo"
                >
            </div>

            <div class="form-checkbox-group">
                <label class="checkbox-control">

                    <input
                        id="inventory-only-stock"
                        type="checkbox"
                        ${
                            filtros.solo_disponible
                                ? "checked"
                                : ""
                        }
                    >

                    <span>
                        Solo con existencia
                    </span>

                </label>
            </div>

            <div class="inventory-filters__actions">

                <button
                    class="button button--primary"
                    type="submit"
                >
                    Consultar
                </button>

                <button
                    id="btn-clear-inventory"
                    class="button button--secondary"
                    type="button"
                >
                    Limpiar
                </button>

            </div>

        </form>
    `;
}


function crearTablaInventario() {
    const registros =
        ESTADO.inventario.registros;

    if (registros.length === 0) {
        return crearEstadoVacio(
            "No se encontraron existencias."
        );
    }

    return `
        <table class="inventory-table">

            <thead>
                <tr>
                    <th>Ámbito</th>
                    <th>Producto</th>
                    <th>Lote</th>
                    <th>Presentación</th>
                    <th>Caducidad</th>
                    <th>Existencia</th>
                    <th>Unidad</th>
                    <th>Estado</th>
                </tr>
            </thead>

            <tbody>

                ${registros.map(item => `
                    <tr>

                        <td>
                            ${escaparHTML(
                                item.ambito_mostrado ||
                                item.cve_jur_res ||
                                "ESTATAL"
                            )}
                        </td>

                        <td>
                            <strong>
                                ${escaparHTML(
                                    item.producto
                                )}
                            </strong>

                            <small
                                class="inventory-table__secondary"
                            >
                                ${escaparHTML(
                                    item.codigo_producto ||
                                    ""
                                )}
                            </small>
                        </td>

                        <td>
                            ${escaparHTML(
                                item.lote
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                item.presentacion ||
                                ""
                            )}
                        </td>

                        <td>
                            ${formatearFecha(
                                item.fecha_caducidad
                            )}
                        </td>

                        <td>
                            <strong>
                                ${formatearDecimal(
                                    item.existencia
                                )}
                                ${escaparHTML(
                                    item.unidad_medida || ""
                                )}
                            </strong>

                            ${
                                item.presentaciones_completas !== null &&
                                item.presentaciones_completas !== undefined
                                    ? `
                                        <small class="inventory-table__secondary">
                                            ${formatearEntero(
                                                item.presentaciones_completas
                                            )}
                                            presentación(es)
                                            ${
                                                Number(
                                                    item.residuo_unidad_base
                                                ) > 0
                                                    ? ` + ${formatearDecimal(
                                                        item.residuo_unidad_base
                                                    )} ${escaparHTML(
                                                        item.unidad_medida || ""
                                                    )}`
                                                    : ""
                                            }
                                        </small>
                                    `
                                    : ""
                            }
                        </td>

                        <td>
                            ${escaparHTML(
                                item.unidad_medida ||
                                ""
                            )}
                        </td>

                        <td>
                            ${crearEtiquetaEstado(
                                item.estado
                            )}
                        </td>

                    </tr>
                `).join("")}

            </tbody>

        </table>
    `;
}


function registrarEventosInventario() {
    document
        .getElementById(
            "form-inventory-filters"
        )
        .addEventListener(
            "submit",
            async evento => {
                evento.preventDefault();

                guardarFiltrosInventario();

                ESTADO.inventario.offset =
                    0;

                await cargarPestañaActual();
            }
        );

    document
        .getElementById(
            "btn-clear-inventory"
        )
        .addEventListener(
            "click",
            async () => {
                ESTADO.inventario.filtros =
                    crearFiltrosInventario();

                ESTADO.inventario.offset =
                    0;

                await cargarPestañaActual();
            }
        );

    registrarEventosPaginacion(
        "inventario"
    );
}


function guardarFiltrosInventario() {
    ESTADO.inventario.filtros = {
        jurisdiccion:
            ESTADO
                .jurisdiccionSeleccionada,

        busqueda:
            obtenerValor(
                "inventory-search"
            ),

        categoria:
            obtenerValor(
                "inventory-category"
            ),

        solo_disponible:
            Boolean(
                document
                    .getElementById(
                        "inventory-only-stock"
                    )
                    ?.checked
            )
    };
}


/*
==========================================================
MOVIMIENTOS
==========================================================
*/


function obtenerJurisdiccionParaMovimientos() {
    if (
        ESTADO.jurisdiccionSeleccionada === "TODO_ESTADO" ||
        ESTADO.jurisdiccionSeleccionada === "ESTATAL"
    ) {
        return null;
    }

    return ESTADO.jurisdiccionSeleccionada;
}


async function cargarMovimientos() {
    const estado =
        ESTADO.movimientos;

    const respuesta =
        await consultarMovimientosInventario(
            obtenerToken(),
            {
                ...estado.filtros,

                jurisdiccion:
                    obtenerJurisdiccionParaMovimientos(),

                limite:
                    estado.limite,

                offset:
                    estado.offset
            }
        );

    estado.registros =
        obtenerArreglo(
            respuesta.movimientos
        );

    estado.total =
        Number(respuesta.total) || 0;

    estado.limite =
        Number(respuesta.limite) ||
        estado.limite;

    estado.offset =
        Number(respuesta.offset) || 0;

    renderizarMovimientos();
}


function renderizarMovimientos() {
    const estado =
        ESTADO.movimientos;

    const contenido =
        obtenerContenido();

    contenido.innerHTML = `
        <section class="inventory-panel">

            <header class="inventory-panel__header">

                <div>
                    <h2>Movimientos</h2>

                    <p>
                        ${formatearEntero(
                            estado.total
                        )}
                        movimiento(s) encontrado(s).
                    </p>
                </div>

                <button
                    id="btn-movement-from-tab"
                    class="button button--primary"
                    type="button"
                >
                    Registrar movimiento
                </button>

            </header>

            ${crearFiltrosMovimientosHTML()}

            <div class="inventory-table-wrapper">
                ${crearTablaMovimientos()}
            </div>

            ${crearPaginacion(
                estado.total,
                estado.limite,
                estado.offset,
                "movimientos"
            )}

        </section>
    `;

    registrarEventosMovimientos();
}


function crearFiltrosMovimientosHTML() {
    const filtros =
        ESTADO.movimientos.filtros;

    return `
        <form
            id="form-movement-filters"
            class="inventory-filters"
        >

            <div class="form-group">
                <label for="movement-search">
                    Buscar
                </label>

                <input
                    id="movement-search"
                    type="search"
                    value="${escaparHTML(
                        filtros.busqueda || ""
                    )}"
                    placeholder="Producto, lote u observación"
                >
            </div>

            <div class="form-group">
                <label for="movement-type-filter">
                    Tipo de movimiento
                </label>

                <select id="movement-type-filter">

                    <option value="">
                        Todos
                    </option>

                    ${ESTADO.catalogos
                        .tipos_movimiento
                        .map(tipo => `
                            <option
                                value="${escaparHTML(
                                    tipo.codigo
                                )}"
                                ${
                                    filtros
                                        .tipo_movimiento ===
                                    tipo.codigo
                                        ? "selected"
                                        : ""
                                }
                            >
                                ${escaparHTML(
                                    tipo.nombre
                                )}
                            </option>
                        `)
                        .join("")}

                    <option
                        value="CONSUMO"
                        ${
                            filtros
                                .tipo_movimiento ===
                            "CONSUMO"
                                ? "selected"
                                : ""
                        }
                    >
                        Consumo
                    </option>

                </select>
            </div>

            <div class="form-group">
                <label for="movement-date-start">
                    Desde
                </label>

                <input
                    id="movement-date-start"
                    type="date"
                    value="${escaparHTML(
                        filtros.fecha_inicio ||
                        ""
                    )}"
                >
            </div>

            <div class="form-group">
                <label for="movement-date-end">
                    Hasta
                </label>

                <input
                    id="movement-date-end"
                    type="date"
                    value="${escaparHTML(
                        filtros.fecha_fin ||
                        ""
                    )}"
                >
            </div>

            <div class="inventory-filters__actions">

                <button
                    class="button button--primary"
                    type="submit"
                >
                    Consultar
                </button>

                <button
                    id="btn-clear-movements"
                    class="button button--secondary"
                    type="button"
                >
                    Limpiar
                </button>

            </div>

        </form>
    `;
}


function crearTablaMovimientos() {
    const registros =
        ESTADO.movimientos.registros;

    if (registros.length === 0) {
        return crearEstadoVacio(
            "No se encontraron movimientos."
        );
    }

    return `
        <table class="inventory-table inventory-table--movements">

            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Movimiento</th>
                    <th>Producto</th>
                    <th>Lote</th>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>Cantidad</th>
                    <th>Usuario</th>
                    <th>Observaciones</th>
                </tr>
            </thead>

            <tbody>

                ${registros.map(movimiento => `
                    <tr>

                        <td>
                            ${formatearFechaHora(
                                movimiento
                                    .fecha_movimiento
                            )}
                        </td>

                        <td>
                            ${crearEtiquetaMovimiento(
                                movimiento
                                    .tipo_movimiento
                            )}
                        </td>

                        <td>
                            <strong>
                                ${escaparHTML(
                                    movimiento.producto
                                )}
                            </strong>

                            <small
                                class="inventory-table__secondary"
                            >
                                ${escaparHTML(
                                    movimiento
                                        .codigo_producto ||
                                    ""
                                )}
                            </small>
                        </td>

                        <td>
                            ${escaparHTML(
                                movimiento.lote
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                crearTextoUbicacion(
                                    movimiento
                                        .origen_tipo,
                                    movimiento
                                        .origen_id
                                )
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                crearTextoUbicacion(
                                    movimiento
                                        .destino_tipo,
                                    movimiento
                                        .destino_id
                                )
                            )}
                        </td>

                        <td>
                            <strong>
                                ${formatearDecimal(
                                    movimiento.cantidad_capturada ??
                                    movimiento.cantidad
                                )}
                            </strong>

                            ${escaparHTML(
                                movimiento.tipo_captura === "PRESENTACIONES"
                                    ? movimiento.presentacion || "presentación(es)"
                                    : movimiento.unidad_base ||
                                      movimiento.unidad_medida ||
                                      ""
                            )}

                            ${
                                movimiento.tipo_captura === "PRESENTACIONES"
                                    ? `<small class="inventory-table__secondary">
                                        Equivale a ${formatearDecimal(movimiento.cantidad)}
                                        ${escaparHTML(
                                            movimiento.unidad_base ||
                                            movimiento.unidad_medida ||
                                            ""
                                        )}
                                       </small>`
                                    : ""
                            }
                        </td>

                        <td>
                            ${escaparHTML(
                                movimiento.usuario ||
                                ""
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                movimiento
                                    .observaciones ||
                                ""
                            )}
                        </td>

                    </tr>
                `).join("")}

            </tbody>

        </table>
    `;
}


function registrarEventosMovimientos() {
    document
        .getElementById(
            "btn-movement-from-tab"
        )
        .addEventListener(
            "click",
            mostrarFormularioMovimiento
        );

    document
        .getElementById(
            "form-movement-filters"
        )
        .addEventListener(
            "submit",
            async evento => {
                evento.preventDefault();

                guardarFiltrosMovimientos();

                ESTADO.movimientos.offset =
                    0;

                await cargarPestañaActual();
            }
        );

    document
        .getElementById(
            "btn-clear-movements"
        )
        .addEventListener(
            "click",
            async () => {
                ESTADO.movimientos.filtros =
                    crearFiltrosMovimientos();

                ESTADO.movimientos.offset =
                    0;

                await cargarPestañaActual();
            }
        );

    registrarEventosPaginacion(
        "movimientos"
    );
}


function guardarFiltrosMovimientos() {
    ESTADO.movimientos.filtros = {
        jurisdiccion:
            ESTADO
                .jurisdiccionSeleccionada,

        tipo_movimiento:
            obtenerValor(
                "movement-type-filter"
            ),

        busqueda:
            obtenerValor(
                "movement-search"
            ),

        fecha_inicio:
            obtenerValor(
                "movement-date-start"
            ),

        fecha_fin:
            obtenerValor(
                "movement-date-end"
            )
    };
}


/*
==========================================================
FORMULARIO DE LOTE
==========================================================
*/

function mostrarFormularioLote() {
    if (
        !ESTADO.catalogos
            .puede_administrar
    ) {
        return;
    }

    abrirModal(`
        <div class="inventory-modal">

            <header class="modal-header">

                <div>
                    <p class="modal-header__eyebrow">
                        Almacén estatal
                    </p>

                    <h2>Registrar lote</h2>
                </div>

                <button
                    class="modal-close"
                    type="button"
                    data-close-inventory-modal
                >
                    ×
                </button>

            </header>

            <form
                id="form-register-lot"
                class="modal-body"
            >

                <div class="form-grid">

                    <div class="form-group form-group--full">

                        <label for="lot-product">
                            Producto
                        </label>

                        <select
                            id="lot-product"
                            required
                        >
                            <option value="">
                                Seleccione
                            </option>

                            ${ESTADO.catalogos
                                .productos
                                .map(producto => `
                                    <option
                                        value="${escaparHTML(
                                            producto.id
                                        )}"
                                    >
                                        ${escaparHTML(
                                            `${producto.codigo || ""} - ${producto.nombre}`
                                        )}
                                    </option>
                                `)
                                .join("")}

                        </select>

                    </div>

                    <div class="form-group">

                        <label for="lot-number">
                            Número de lote
                        </label>

                        <input
                            id="lot-number"
                            type="text"
                            maxlength="100"
                            required
                        >

                    </div>

                    <div class="form-group">

                        <label for="lot-presentation">
                            Presentación
                        </label>

                        <select
                            id="lot-presentation"
                            required
                            disabled
                        >
                            <option value="">
                                Primero seleccione un producto
                            </option>
                        </select>

                        <small class="form-help">
                            La unidad y el contenido se toman del catálogo de presentaciones.
                        </small>

                        <button
                            id="btn-new-presentation"
                            class="button button--secondary"
                            type="button"
                            hidden
                        >
                            Registrar nueva presentación
                        </button>

                    </div>

                    <section
                        id="new-presentation-panel"
                        class="form-group form-group--full"
                        hidden
                    >
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="new-presentation-name">Nombre de la presentación</label>
                                <input
                                    id="new-presentation-name"
                                    type="text"
                                    maxlength="150"
                                    placeholder="Ej. Frasco 1 litro"
                                >
                            </div>

                            <div class="form-group">
                                <label for="new-presentation-content">Contenido por envase</label>
                                <input
                                    id="new-presentation-content"
                                    type="number"
                                    min="0.0001"
                                    step="0.0001"
                                    placeholder="Ej. 1"
                                >
                            </div>

                            <div class="form-group">
                                <label for="new-presentation-unit">Unidad base</label>
                                <select id="new-presentation-unit">
                                    <option value="">Seleccione</option>
                                    <option value="ML">ML</option>
                                    <option value="L">L</option>
                                    <option value="MG">MG</option>
                                    <option value="G">G</option>
                                    <option value="KG">KG</option>
                                    <option value="PIEZA">PIEZA</option>
                                    <option value="DOSIS">DOSIS</option>
                                </select>
                            </div>
                        </div>

                        <small class="form-help">
                            La presentación se guardará en el catálogo y quedará seleccionada para este lote.
                        </small>
                    </section>

                    <div class="form-group">

                        <label for="lot-unit">
                            Unidad de medida
                        </label>

                        <input
                            id="lot-unit"
                            type="text"
                            readonly
                            required
                            placeholder="Se asignará automáticamente"
                        >

                    </div>

                    <div class="form-group">

                        <label for="lot-presentation-content">
                            Contenido por presentación
                        </label>

                        <input
                            id="lot-presentation-content"
                            type="text"
                            readonly
                            placeholder="Se asignará automáticamente"
                        >

                    </div>

                    <div class="form-group">

                        <label for="lot-quantity">
                            Cantidad inicial
                        </label>

                        <input
                            id="lot-quantity"
                            type="number"
                            min="0"
                            step="0.01"
                            value="0"
                            required
                        >

                    </div>

                    <div class="form-group">

                        <label for="lot-manufacture">
                            Fecha de fabricación
                        </label>

                        <input
                            id="lot-manufacture"
                            type="date"
                        >

                    </div>

                    <div class="form-group">

                        <label for="lot-expiration">
                            Fecha de caducidad
                        </label>

                        <input
                            id="lot-expiration"
                            type="date"
                        >

                    </div>

                </div>

                <div
                    id="lot-form-message"
                    class="form-message"
                ></div>

                <div class="modal-actions">

                    <button
                        class="button button--secondary"
                        type="button"
                        data-close-inventory-modal
                    >
                        Cancelar
                    </button>

                    <button
                        id="btn-save-lot"
                        class="button button--primary"
                        type="submit"
                    >
                        Registrar lote
                    </button>

                </div>

            </form>

        </div>
    `);

    document
        .getElementById(
            "form-register-lot"
        )
        .addEventListener(
            "submit",
            procesarRegistroLote
        );

    document
        .getElementById("lot-product")
        ?.addEventListener("change", actualizarPresentacionesLote);

    document
        .getElementById("lot-presentation")
        ?.addEventListener("change", actualizarDetallePresentacionLote);

    document
        .getElementById("btn-new-presentation")
        ?.addEventListener("click", alternarNuevaPresentacion);
}


function actualizarPresentacionesLote() {
    const productoId = obtenerValor("lot-product");
    const selector = document.getElementById("lot-presentation");
    const unidad = document.getElementById("lot-unit");
    const contenido = document.getElementById("lot-presentation-content");
    const botonNueva = document.getElementById("btn-new-presentation");
    const panelNueva = document.getElementById("new-presentation-panel");

    if (!selector) {
        return;
    }

    const presentaciones = ESTADO.catalogos.presentaciones.filter(
        item => item.producto_id === productoId && item.activo !== false
    );

    selector.innerHTML = productoId
        ? `<option value="">Seleccione una presentación</option>${presentaciones.map(item => `
            <option value="${escaparHTML(item.id)}">
                ${escaparHTML(
                    `${item.nombre} · ${formatearDecimal(item.contenido)} ${item.unidad_medida || ""}`
                )}
            </option>
        `).join("")}`
        : `<option value="">Primero seleccione un producto</option>`;

    selector.disabled = !productoId;

    if (unidad) unidad.value = "";
    if (contenido) contenido.value = "";

    if (botonNueva) {
        botonNueva.hidden = !productoId || !ESTADO.catalogos.puede_administrar;
        botonNueva.textContent = presentaciones.length === 0
            ? "Registrar primera presentación"
            : "Agregar otra presentación";
    }

    if (panelNueva) {
        panelNueva.hidden = true;
    }

    if (productoId && presentaciones.length === 0) {
        mostrarMensajeModal(
            "lot-form-message",
            ESTADO.catalogos.puede_administrar
                ? "Este producto aún no tiene presentación. Registre la primera para continuar."
                : "Este producto no tiene presentaciones activas configuradas.",
            !ESTADO.catalogos.puede_administrar
        );

        if (ESTADO.catalogos.puede_administrar) {
            alternarNuevaPresentacion(true);
        }
    } else {
        limpiarMensajeModal("lot-form-message");
    }
}

function alternarNuevaPresentacion(forzarAbrir = null) {
    const panel = document.getElementById("new-presentation-panel");
    const boton = document.getElementById("btn-new-presentation");

    if (!panel || !ESTADO.catalogos.puede_administrar) {
        return;
    }

    const abrir = typeof forzarAbrir === "boolean"
        ? forzarAbrir
        : panel.hidden;

    panel.hidden = !abrir;

    if (boton) {
        boton.textContent = abrir
            ? "Cancelar nueva presentación"
            : "Agregar otra presentación";
    }

    if (abrir) {
        document.getElementById("new-presentation-name")?.focus();
    }
}

async function obtenerOCrearPresentacionLote() {
    const seleccionadaId = obtenerValor("lot-presentation");

    if (seleccionadaId) {
        return ESTADO.catalogos.presentaciones.find(
            item => item.id === seleccionadaId
        ) || null;
    }

    const panel = document.getElementById("new-presentation-panel");

    if (!ESTADO.catalogos.puede_administrar || panel?.hidden) {
        throw new Error("Seleccione una presentación.");
    }

    const productoId = obtenerValor("lot-product");
    const nombre = obtenerValor("new-presentation-name");
    const contenido = obtenerNumero("new-presentation-content");
    const unidadMedida = obtenerValor("new-presentation-unit");

    if (!productoId) {
        throw new Error("Seleccione el producto.");
    }

    if (!nombre) {
        throw new Error("Ingrese el nombre de la presentación.");
    }

    if (!Number.isFinite(contenido) || contenido <= 0) {
        throw new Error("El contenido por presentación debe ser mayor que cero.");
    }

    if (!unidadMedida) {
        throw new Error("Seleccione la unidad base de la presentación.");
    }

    const respuesta = await registrarPresentacionProducto(
        obtenerToken(),
        {
            producto_id: productoId,
            nombre,
            contenido,
            unidad_medida: unidadMedida
        }
    );

    const presentacion = respuesta.presentacion || respuesta;

    if (!presentacion?.id) {
        throw new Error("La presentación fue registrada, pero la RPC no devolvió su identificador.");
    }

    ESTADO.catalogos.presentaciones.push(presentacion);

    return presentacion;
}

function actualizarDetallePresentacionLote() {
    const presentacionId = obtenerValor("lot-presentation");
    const presentacion = ESTADO.catalogos.presentaciones.find(
        item => item.id === presentacionId
    );

    const unidad = document.getElementById("lot-unit");
    const contenido = document.getElementById("lot-presentation-content");

    if (unidad) {
        unidad.value = presentacion?.unidad_medida || "";
    }

    if (contenido) {
        contenido.value = presentacion
            ? `${formatearDecimal(presentacion.contenido)} ${presentacion.unidad_medida || ""}`
            : "";
    }
}

async function procesarRegistroLote(
    evento
) {
    evento.preventDefault();

    const boton =
        document.getElementById(
            "btn-save-lot"
        );

    bloquearBoton(
        boton,
        true,
        "Registrando..."
    );

    limpiarMensajeModal(
        "lot-form-message"
    );

    try {
        validarFechasLote();

        const presentacion = await obtenerOCrearPresentacionLote();

        await registrarLote(
            obtenerToken(),
            {
                producto_id:
                    obtenerValor(
                        "lot-product"
                    ),

                lote:
                    obtenerValor(
                        "lot-number"
                    ),

                presentacion_id:
                    presentacion.id,

                presentacion:
                    presentacion.nombre,

                unidad_medida:
                    presentacion.unidad_medida,

                cantidad_inicial:
                    obtenerNumero(
                        "lot-quantity"
                    ),

                fecha_fabricacion:
                    obtenerValor(
                        "lot-manufacture"
                    ),

                fecha_caducidad:
                    obtenerValor(
                        "lot-expiration"
                    )
            }
        );

        cerrarModal();

        await recargarCatalogosEInventario();
    } catch (error) {
        mostrarMensajeModal(
            "lot-form-message",
            error.message,
            true
        );

        bloquearBoton(
            boton,
            false,
            "Registrar lote"
        );
    }
}


function validarFechasLote() {
    const fabricacion =
        obtenerValor(
            "lot-manufacture"
        );

    const caducidad =
        obtenerValor(
            "lot-expiration"
        );

    if (
        fabricacion &&
        caducidad &&
        caducidad < fabricacion
    ) {
        throw new Error(
            "La caducidad no puede ser anterior a la fabricación."
        );
    }
}


/*
==========================================================
FORMULARIO DE MOVIMIENTO
==========================================================
*/

function mostrarFormularioMovimiento() {
    const tiposPermitidos =
        obtenerTiposMovimientoPermitidos();

    abrirModal(`
        <div class="inventory-modal">

            <header class="modal-header">

                <div>
                    <p class="modal-header__eyebrow">
                        Control de existencias
                    </p>

                    <h2>Registrar movimiento</h2>
                </div>

                <button
                    class="modal-close"
                    type="button"
                    data-close-inventory-modal
                >
                    ×
                </button>

            </header>

            <form
                id="form-register-movement"
                class="modal-body"
            >

                <div class="form-grid">

                    <div class="form-group">

                        <label for="movement-type">
                            Tipo de movimiento
                        </label>

                        <select
                            id="movement-type"
                            required
                        >
                            <option value="">
                                Seleccione
                            </option>

                            ${tiposPermitidos.map(tipo => `
                                <option
                                    value="${escaparHTML(
                                        tipo.codigo
                                    )}"
                                >
                                    ${escaparHTML(
                                        tipo.nombre
                                    )}
                                </option>
                            `).join("")}

                        </select>

                    </div>

                    <div class="form-group">

                        <label for="movement-jurisdiction">
                            Jurisdicción
                        </label>

                        <select
                            id="movement-jurisdiction"
                            ${
                                !ESTADO.catalogos
                                    .puede_administrar
                                    ? "disabled"
                                    : ""
                            }
                        >
                            <option value="">
                                Seleccione
                            </option>

                            ${ESTADO.catalogos
                                .jurisdicciones
                                .map(jurisdiccion => `
                                    <option
                                        value="${escaparHTML(
                                            jurisdiccion.clave
                                        )}"
                                        ${
                                            jurisdiccion.clave ===
                                            (
                                                ESTADO
                                                    .jurisdiccionSeleccionada ||
                                                ESTADO.catalogos
                                                    .jurisdiccion_usuario
                                            )
                                                ? "selected"
                                                : ""
                                        }
                                    >
                                        ${escaparHTML(
                                            `${jurisdiccion.clave} - ${jurisdiccion.nombre}`
                                        )}
                                    </option>
                                `)
                                .join("")}

                        </select>

                    </div>

                    <div class="form-group form-group--full">

                        <label for="movement-lot">
                            Producto y lote
                        </label>

                        <select
                            id="movement-lot"
                            required
                        >
                            <option value="">
                                Seleccione
                            </option>

                            ${crearOpcionesLotes()}

                        </select>

                    </div>

                    <div class="form-group">

                        <label for="movement-capture-type">
                            Registrar cantidad como
                        </label>

                        <select id="movement-capture-type" required>
                            <option value="UNIDAD_BASE">
                                Unidad base
                            </option>
                            <option value="PRESENTACIONES">
                                Piezas / presentaciones completas
                            </option>
                        </select>

                    </div>

                    <div class="form-group">

                        <label id="movement-quantity-label" for="movement-quantity">
                            Cantidad en unidad base
                        </label>

                        <input
                            id="movement-quantity"
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                        >

                    </div>

                    <div class="form-group">

                        <label for="movement-date">
                            Fecha del movimiento
                        </label>

                        <input
                            id="movement-date"
                            type="datetime-local"
                            value="${fechaHoraActualLocal()}"
                        >

                    </div>

                    <div class="form-group form-group--full">

                        <label for="movement-observations">
                            Observaciones
                        </label>

                        <textarea
                            id="movement-observations"
                            rows="4"
                            maxlength="1000"
                            placeholder="Motivo, referencia o justificación"
                        ></textarea>

                    </div>

                </div>

                <div
                    id="movement-conversion-info"
                    class="movement-stock-info"
                ></div>

                <div
                    id="movement-stock-info"
                    class="movement-stock-info"
                ></div>

                <div
                    id="movement-form-message"
                    class="form-message"
                ></div>

                <div class="modal-actions">

                    <button
                        class="button button--secondary"
                        type="button"
                        data-close-inventory-modal
                    >
                        Cancelar
                    </button>

                    <button
                        id="btn-save-movement"
                        class="button button--primary"
                        type="submit"
                    >
                        Registrar movimiento
                    </button>

                </div>

            </form>

        </div>
    `);

    const formulario =
        document.getElementById(
            "form-register-movement"
        );

    formulario.addEventListener(
        "submit",
        procesarRegistroMovimiento
    );

    document
        .getElementById(
            "movement-type"
        )
        .addEventListener(
            "change",
            actualizarFormularioMovimiento
        );

    document
        .getElementById(
            "movement-jurisdiction"
        )
        .addEventListener(
            "change",
            actualizarInformacionStock
        );

    document
        .getElementById(
            "movement-lot"
        )
        .addEventListener(
            "change",
            actualizarCapturaMovimiento
        );

    document
        .getElementById(
            "movement-capture-type"
        )
        .addEventListener(
            "change",
            actualizarCapturaMovimiento
        );

    document
        .getElementById(
            "movement-quantity"
        )
        .addEventListener(
            "input",
            actualizarVistaConversionMovimiento
        );

    actualizarCapturaMovimiento();
}


function obtenerTiposMovimientoPermitidos() {
    const tipos =
        ESTADO.catalogos
            .tipos_movimiento;

    if (
        ESTADO.catalogos
            .puede_administrar
    ) {
        return tipos;
    }

    return tipos.filter(
        tipo =>
            tipo.codigo ===
            "DEVOLUCION_ESTATAL"
    );
}


function crearOpcionesLotes() {
    return ESTADO.catalogos
        .lotes
        .map(lote => `
            <option
                value="${escaparHTML(
                    lote.id
                )}"
                data-product="${escaparHTML(
                    lote.producto ||
                    ""
                )}"
                data-lot="${escaparHTML(
                    lote.lote ||
                    ""
                )}"
                data-unit="${escaparHTML(
                    lote.unidad_medida ||
                    ""
                )}"
                data-state-stock="${escaparHTML(
                    lote.existencia_estatal ??
                    0
                )}"
            >
                ${escaparHTML(
                    `${lote.producto} · ${lote.lote} · Estatal: ${formatearDecimal(lote.existencia_estatal)} ${lote.unidad_medida || ""}`
                )}
            </option>
        `)
        .join("");
}


function obtenerDetallePresentacionLoteMovimiento() {
    const loteId = obtenerValor("movement-lot");
    const lote = ESTADO.catalogos.lotes.find(item => item.id === loteId);

    if (!lote) {
        return { lote: null, presentacion: null, contenido: 1, unidad: "" };
    }

    const presentacion = ESTADO.catalogos.presentaciones.find(
        item => item.id === lote.presentacion_id
    );

    return {
        lote,
        presentacion,
        contenido: Number(
            presentacion?.contenido ??
            lote.contenido_presentacion ??
            1
        ) || 1,
        unidad:
            presentacion?.unidad_medida ||
            lote.unidad_medida ||
            lote.unidad_base ||
            "",
        nombre:
            presentacion?.nombre ||
            lote.presentacion ||
            "Presentación"
    };
}


function actualizarCapturaMovimiento() {
    const detalle = obtenerDetallePresentacionLoteMovimiento();
    const selector = document.getElementById("movement-capture-type");
    const cantidad = document.getElementById("movement-quantity");
    const etiqueta = document.getElementById("movement-quantity-label");

    if (!selector || !cantidad || !etiqueta) return;

    const opcionPresentaciones = selector.querySelector(
        'option[value="PRESENTACIONES"]'
    );

    if (opcionPresentaciones) {
        opcionPresentaciones.disabled = !detalle.presentacion;
        opcionPresentaciones.textContent = detalle.presentacion
            ? `${detalle.nombre} completa(s)`
            : "Piezas / presentaciones (sin presentación asociada)";
    }

    if (!detalle.presentacion && selector.value === "PRESENTACIONES") {
        selector.value = "UNIDAD_BASE";
    }

    if (selector.value === "PRESENTACIONES") {
        cantidad.step = "1";
        cantidad.min = "1";
        etiqueta.textContent = `Cantidad de ${detalle.nombre}(s)`;
    } else {
        cantidad.step = "0.001";
        cantidad.min = "0.001";
        etiqueta.textContent = `Cantidad en ${detalle.unidad || "unidad base"}`;
    }

    actualizarVistaConversionMovimiento();
    actualizarInformacionStock();
}


function actualizarVistaConversionMovimiento() {
    const contenedor = document.getElementById("movement-conversion-info");
    if (!contenedor) return;

    const detalle = obtenerDetallePresentacionLoteMovimiento();
    const tipoCaptura = obtenerValor("movement-capture-type") || "UNIDAD_BASE";
    const cantidad = Number(obtenerValor("movement-quantity"));

    if (!detalle.lote || !Number.isFinite(cantidad) || cantidad <= 0) {
        contenedor.innerHTML = "";
        return;
    }

    const cantidadBase = tipoCaptura === "PRESENTACIONES"
        ? cantidad * detalle.contenido
        : cantidad;

    contenedor.innerHTML = tipoCaptura === "PRESENTACIONES"
        ? `<strong>${formatearDecimal(cantidad)} ${escaparHTML(detalle.nombre)}(s)</strong>
           <span>Se descontarán ${formatearDecimal(cantidadBase)} ${escaparHTML(detalle.unidad)}</span>`
        : `<strong>${formatearDecimal(cantidadBase)} ${escaparHTML(detalle.unidad)}</strong>
           <span>Se descontará directamente en la unidad base.</span>`;
}


function actualizarFormularioMovimiento() {
    const tipo =
        obtenerValor(
            "movement-type"
        );

    const campoJurisdiccion =
        document.getElementById(
            "movement-jurisdiction"
        );

    const requiereJurisdiccion =
        [
            "TRANSFERENCIA_JURISDICCION",
            "DEVOLUCION_ESTATAL",
            "AJUSTE_POSITIVO_JURISDICCION",
            "AJUSTE_NEGATIVO_JURISDICCION"
        ].includes(tipo);

    campoJurisdiccion.required =
        requiereJurisdiccion;

    actualizarInformacionStock();
}


function actualizarInformacionStock() {
    const tipo =
        obtenerValor(
            "movement-type"
        );

    const loteId =
        obtenerValor(
            "movement-lot"
        );

    const jurisdiccion =
        obtenerValor(
            "movement-jurisdiction"
        ) ||
        ESTADO.catalogos
            .jurisdiccion_usuario;

    const contenedor =
        document.getElementById(
            "movement-stock-info"
        );

    if (!tipo || !loteId) {
        contenedor.innerHTML = "";
        return;
    }

    const lote =
        ESTADO.catalogos.lotes
            .find(
                item =>
                    item.id === loteId
            );

    const inventarioJurisdiccional =
        ESTADO.inventario.registros
            .find(
                item =>
                    item.lote_id ===
                        loteId &&
                    (
                        !jurisdiccion ||
                        item.cve_jur_res ===
                            jurisdiccion
                    )
            );

    const existenciaEstatal =
        Number(
            lote?.existencia_estatal
        ) || 0;

    const existenciaJurisdiccional =
        Number(
            inventarioJurisdiccional
                ?.existencia
        ) || 0;

    let existenciaAplicable =
        existenciaEstatal;

    let origen = "Almacén estatal";

    if (
        [
            "DEVOLUCION_ESTATAL",
            "AJUSTE_NEGATIVO_JURISDICCION"
        ].includes(tipo)
    ) {
        existenciaAplicable =
            existenciaJurisdiccional;

        origen =
            `Jurisdicción ${jurisdiccion || ""}`;
    }

    contenedor.innerHTML = `
        <strong>
            Existencia disponible:
            ${formatearDecimal(
                existenciaAplicable
            )}
            ${escaparHTML(
                lote?.unidad_medida ||
                ""
            )}
        </strong>

        <span>
            ${escaparHTML(origen)}
        </span>
    `;
}


async function procesarRegistroMovimiento(
    evento
) {
    evento.preventDefault();

    const boton =
        document.getElementById(
            "btn-save-movement"
        );

    bloquearBoton(
        boton,
        true,
        "Registrando..."
    );

    limpiarMensajeModal(
        "movement-form-message"
    );

    try {
        const tipo =
            obtenerValor(
                "movement-type"
            );

        const jurisdiccion =
            obtenerValor(
                "movement-jurisdiction"
            ) ||
            ESTADO.catalogos
                .jurisdiccion_usuario;

        const ubicaciones =
            construirUbicacionesMovimiento(
                tipo,
                jurisdiccion
            );

        await registrarMovimientoInventario(
            obtenerToken(),
            {
                lote_id:
                    obtenerValor(
                        "movement-lot"
                    ),

                tipo_movimiento:
                    tipo,

                cve_jur_res:
                    jurisdiccion,

                cantidad:
                    obtenerNumero(
                        "movement-quantity"
                    ),

                cantidad_capturada:
                    obtenerNumero(
                        "movement-quantity"
                    ),

                tipo_captura:
                    obtenerValor(
                        "movement-capture-type"
                    ) || "UNIDAD_BASE",

                fecha_movimiento:
                    convertirFechaLocalAISO(
                        obtenerValor(
                            "movement-date"
                        )
                    ),

                origen_tipo:
                    ubicaciones.origen_tipo,

                origen_id:
                    ubicaciones.origen_id,

                destino_tipo:
                    ubicaciones.destino_tipo,

                destino_id:
                    ubicaciones.destino_id,

                referencia_id:
                    null,

                observaciones:
                    obtenerValor(
                        "movement-observations"
                    )
            }
        );

        cerrarModal();

        await recargarCatalogosEInventario();
    } catch (error) {
        mostrarMensajeModal(
            "movement-form-message",
            error.message,
            true
        );

        bloquearBoton(
            boton,
            false,
            "Registrar movimiento"
        );
    }
}


function construirUbicacionesMovimiento(
    tipo,
    jurisdiccion
) {
    switch (tipo) {
        case "ENTRADA_ESTATAL":
            return {
                origen_tipo: "EXTERNO",
                origen_id: "PROVEEDOR",
                destino_tipo: "ESTATAL",
                destino_id: "ESTATAL"
            };

        case "TRANSFERENCIA_JURISDICCION":
            return {
                origen_tipo: "ESTATAL",
                origen_id: "ESTATAL",
                destino_tipo: "JURISDICCION",
                destino_id: jurisdiccion
            };

        case "DEVOLUCION_ESTATAL":
            return {
                origen_tipo: "JURISDICCION",
                origen_id: jurisdiccion,
                destino_tipo: "ESTATAL",
                destino_id: "ESTATAL"
            };

        case "AJUSTE_POSITIVO_ESTATAL":
            return {
                origen_tipo: "AJUSTE",
                origen_id: "AJUSTE",
                destino_tipo: "ESTATAL",
                destino_id: "ESTATAL"
            };

        case "AJUSTE_NEGATIVO_ESTATAL":
            return {
                origen_tipo: "ESTATAL",
                origen_id: "ESTATAL",
                destino_tipo: "AJUSTE",
                destino_id: "AJUSTE"
            };

        case "AJUSTE_POSITIVO_JURISDICCION":
            return {
                origen_tipo: "AJUSTE",
                origen_id: "AJUSTE",
                destino_tipo: "JURISDICCION",
                destino_id: jurisdiccion
            };

        case "AJUSTE_NEGATIVO_JURISDICCION":
            return {
                origen_tipo: "JURISDICCION",
                origen_id: jurisdiccion,
                destino_tipo: "AJUSTE",
                destino_id: "AJUSTE"
            };

        default:
            return {
                origen_tipo: null,
                origen_id: null,
                destino_tipo: null,
                destino_id: null
            };
    }
}


/*
==========================================================
RECARGA
==========================================================
*/

async function recargarCatalogosEInventario() {
    await cargarCatalogos();

    if (
        !ESTADO.catalogos
            .puede_administrar
    ) {
        ESTADO.jurisdiccionSeleccionada =
            ESTADO.catalogos
                .jurisdiccion_usuario;
    }

    await cargarInformacionCompleta();
}


/*
==========================================================
PAGINACIÓN
==========================================================
*/

function crearPaginacion(
    total,
    limite,
    offset,
    tipo
) {
    const totalPaginas =
        Math.max(
            Math.ceil(
                Number(total || 0) /
                Number(limite || 1)
            ),
            1
        );

    const paginaActual =
        Math.floor(
            Number(offset || 0) /
            Number(limite || 1)
        ) + 1;

    const tieneAnterior =
        offset > 0;

    const tieneSiguiente =
        offset + limite < total;

    return `
        <footer class="inventory-pagination">

            <span>
                Página
                ${formatearEntero(
                    paginaActual
                )}
                de
                ${formatearEntero(
                    totalPaginas
                )}
            </span>

            <div>

                <button
                    class="button button--secondary"
                    type="button"
                    data-inventory-pagination="${tipo}"
                    data-offset="${Math.max(
                        offset - limite,
                        0
                    )}"
                    ${
                        tieneAnterior
                            ? ""
                            : "disabled"
                    }
                >
                    Anterior
                </button>

                <button
                    class="button button--secondary"
                    type="button"
                    data-inventory-pagination="${tipo}"
                    data-offset="${
                        offset + limite
                    }"
                    ${
                        tieneSiguiente
                            ? ""
                            : "disabled"
                    }
                >
                    Siguiente
                </button>

            </div>

        </footer>
    `;
}


function registrarEventosPaginacion(
    tipo
) {
    document
        .querySelectorAll(
            `[data-inventory-pagination="${tipo}"]`
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                async () => {
                    if (boton.disabled) {
                        return;
                    }

                    const offset =
                        Number(
                            boton.dataset.offset
                        );

                    ESTADO[tipo].offset =
                        Number.isFinite(offset)
                            ? offset
                            : 0;

                    await cargarPestañaActual();
                }
            );
        });
}


/*
==========================================================
MODALES
==========================================================
*/

function abrirModal(contenido) {
    const root =
        document.getElementById(
            "inventory-modal-root"
        );

    root.innerHTML = `
        <div class="modal-overlay">

            <section
                class="modal-dialog"
                role="dialog"
                aria-modal="true"
            >
                ${contenido}
            </section>

        </div>
    `;

    document.body.classList.add(
        "modal-open"
    );

    root
        .querySelectorAll(
            "[data-close-inventory-modal]"
        )
        .forEach(elemento => {
            elemento.addEventListener(
                "click",
                cerrarModal
            );
        });

    root
        .querySelector(
            ".modal-overlay"
        )
        .addEventListener(
            "click",
            evento => {
                if (
                    evento.target.classList
                        .contains(
                            "modal-overlay"
                        )
                ) {
                    cerrarModal();
                }
            }
        );
}


function cerrarModal() {
    const root =
        document.getElementById(
            "inventory-modal-root"
        );

    if (root) {
        root.innerHTML = "";
    }

    document.body.classList.remove(
        "modal-open"
    );
}


/*
==========================================================
CARGAS Y ERRORES
==========================================================
*/

function renderizarCargaInicial() {
    obtenerApp().innerHTML = `
        <main class="initial-loader">

            <div class="initial-loader__content">

                <div
                    class="initial-loader__spinner"
                    aria-hidden="true"
                ></div>

                <p>
                    Cargando inventarios...
                </p>

            </div>

        </main>
    `;
}


function crearCargaResumen() {
    return `
        <div class="inventory-summary-loading">
            Cargando resumen...
        </div>
    `;
}


function mostrarCargaResumen() {
    const contenedor =
        document.getElementById(
            "inventory-summary"
        );

    if (contenedor) {
        contenedor.innerHTML =
            crearCargaResumen();
    }
}


function crearCargaContenido() {
    return `
        <div class="inventory-loading">

            <div
                class="initial-loader__spinner"
                aria-hidden="true"
            ></div>

            <p>
                Cargando información...
            </p>

        </div>
    `;
}


function mostrarCargaContenido() {
    const contenido =
        obtenerContenido();

    if (contenido) {
        contenido.innerHTML =
            crearCargaContenido();
    }
}


function mostrarErrorContenido(error) {
    const contenido =
        obtenerContenido();

    contenido.innerHTML = `
        <div class="inventory-error">

            <h2>
                No fue posible cargar el inventario
            </h2>

            <p>
                ${escaparHTML(
                    error?.message ||
                    "Ocurrió un error inesperado."
                )}
            </p>

            <button
                id="btn-retry-inventory"
                class="button button--primary"
                type="button"
            >
                Reintentar
            </button>

        </div>
    `;

    document
        .getElementById(
            "btn-retry-inventory"
        )
        .addEventListener(
            "click",
            cargarInformacionCompleta
        );
}


function renderizarErrorGeneral(error) {
    obtenerApp().innerHTML = `
        <main class="system-error">

            <section class="system-error__card">

                <h1>
                    No fue posible abrir inventarios
                </h1>

                <p>
                    ${escaparHTML(
                        error?.message ||
                        "Ocurrió un error inesperado."
                    )}
                </p>

                <button
                    id="btn-inventory-error-home"
                    class="button button--primary"
                    type="button"
                >
                    Volver al inicio
                </button>

            </section>

        </main>
    `;

    document
        .getElementById(
            "btn-inventory-error-home"
        )
        .addEventListener(
            "click",
            () => navegar("/inicio")
        );
}


/*
==========================================================
UTILIDADES VISUALES
==========================================================
*/

function crearEtiquetaEstado(estado) {
    const texto =
        String(
            estado ||
            "SIN ESTATUS"
        ).toUpperCase();

    let clase =
        "status-badge--neutral";

    if (texto === "DISPONIBLE") {
        clase =
            "status-badge--success";
    }

    if (
        texto ===
        "PROXIMO_A_CADUCAR"
    ) {
        clase =
            "status-badge--warning";
    }

    if (
        texto === "AGOTADO" ||
        texto === "CADUCADO"
    ) {
        clase =
            "status-badge--danger";
    }

    return `
        <span
            class="status-badge ${clase}"
        >
            ${escaparHTML(
                formatearTextoEstado(
                    texto
                )
            )}
        </span>
    `;
}


function crearEtiquetaMovimiento(
    tipo
) {
    const texto =
        String(tipo || "");

    let clase =
        "movement-badge--neutral";

    if (
        [
            "ENTRADA_ESTATAL",
            "AJUSTE_POSITIVO_ESTATAL",
            "AJUSTE_POSITIVO_JURISDICCION",
            "DEVOLUCION_ESTATAL"
        ].includes(texto)
    ) {
        clase =
            "movement-badge--positive";
    }

    if (
        [
            "CONSUMO",
            "SALIDA",
            "AJUSTE_NEGATIVO_ESTATAL",
            "AJUSTE_NEGATIVO_JURISDICCION"
        ].includes(texto)
    ) {
        clase =
            "movement-badge--negative";
    }

    if (
        texto ===
        "TRANSFERENCIA_JURISDICCION"
    ) {
        clase =
            "movement-badge--transfer";
    }

    return `
        <span
            class="movement-badge ${clase}"
        >
            ${escaparHTML(
                formatearTextoEstado(
                    texto
                )
            )}
        </span>
    `;
}


function crearTextoUbicacion(
    tipo,
    id
) {
    if (!tipo && !id) {
        return "No especificado";
    }

    if (tipo === "ESTATAL") {
        return "Almacén estatal";
    }

    if (
        tipo === "JURISDICCION"
    ) {
        return `Jurisdicción ${id || ""}`;
    }

    if (tipo === "CONSUMO") {
        return "Consumo operativo";
    }

    if (tipo === "AJUSTE") {
        return "Ajuste de inventario";
    }

    return [
        tipo,
        id
    ]
        .filter(Boolean)
        .join(" · ");
}


function crearEstadoVacio(texto) {
    return `
        <div class="empty-state">
            <p>
                ${escaparHTML(texto)}
            </p>
        </div>
    `;
}


/*
==========================================================
MENSAJES
==========================================================
*/

function mostrarMensajeModal(
    id,
    mensaje,
    esError = false
) {
    const elemento =
        document.getElementById(id);

    if (!elemento) {
        return;
    }

    elemento.textContent =
        mensaje || "";

    elemento.className =
        esError
            ? "form-message form-message--error"
            : "form-message form-message--success";
}


function limpiarMensajeModal(id) {
    const elemento =
        document.getElementById(id);

    if (!elemento) {
        return;
    }

    elemento.textContent = "";
    elemento.className =
        "form-message";
}


function bloquearBoton(
    boton,
    bloqueado,
    texto
) {
    if (!boton) {
        return;
    }

    boton.disabled =
        bloqueado;

    boton.textContent =
        texto;
}


/*
==========================================================
FILTROS
==========================================================
*/

function crearFiltrosInventario() {
    return {
        jurisdiccion: null,
        busqueda: null,
        categoria: null,
        solo_disponible: false
    };
}


function crearFiltrosMovimientos() {
    return {
        jurisdiccion: null,
        tipo_movimiento: null,
        busqueda: null,
        fecha_inicio: null,
        fecha_fin: null
    };
}


/*
==========================================================
UTILIDADES GENERALES
==========================================================
*/

function obtenerApp() {
    const app =
        document.getElementById("app");

    if (!app) {
        throw new Error(
            "No se encontró el contenedor principal."
        );
    }

    return app;
}


function obtenerContenido() {
    return document.getElementById(
        "inventory-content"
    );
}


function obtenerToken() {
    const token =
        obtenerCookie(
            CONFIG.SESSION_COOKIE
        );

    if (!token) {
        throw new Error(
            "La sesión ha expirado."
        );
    }

    return token;
}


function obtenerValor(id) {
    const elemento =
        document.getElementById(id);

    if (!elemento) {
        return null;
    }

    return normalizarTexto(
        elemento.value
    );
}


function obtenerNumero(id) {
    const valor =
        document
            .getElementById(id)
            ?.value;

    const numero =
        Number(valor);

    if (!Number.isFinite(numero)) {
        throw new Error(
            "La cantidad no es válida."
        );
    }

    return numero;
}


function obtenerArreglo(valor) {
    return Array.isArray(valor)
        ? valor
        : [];
}


function normalizarTexto(valor) {
    if (
        valor === undefined ||
        valor === null
    ) {
        return null;
    }

    const texto =
        String(valor).trim();

    return texto || null;
}


function formatearEntero(valor) {
    return new Intl.NumberFormat(
        "es-MX",
        {
            maximumFractionDigits: 0
        }
    ).format(
        Number(valor) || 0
    );
}


function formatearDecimal(valor) {
    return new Intl.NumberFormat(
        "es-MX",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    ).format(
        Number(valor) || 0
    );
}


function formatearFecha(valor) {
    if (!valor) {
        return "No especificada";
    }

    const texto =
        String(valor).slice(0, 10);

    const fecha =
        new Date(
            `${texto}T12:00:00`
        );

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return texto;
    }

    return new Intl.DateTimeFormat(
        "es-MX",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(fecha);
}


function formatearFechaHora(valor) {
    if (!valor) {
        return "No especificada";
    }

    const fecha =
        new Date(valor);

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return String(valor);
    }

    return new Intl.DateTimeFormat(
        "es-MX",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(fecha);
}


function formatearTextoEstado(valor) {
    return String(valor || "")
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(
            /(^|\s)\S/g,
            letra =>
                letra.toUpperCase()
        );
}


function fechaHoraActualLocal() {
    const fecha =
        new Date();

    const diferencia =
        fecha.getTimezoneOffset() *
        60000;

    return new Date(
        fecha.getTime() -
        diferencia
    )
        .toISOString()
        .slice(0, 16);
}


function convertirFechaLocalAISO(valor) {
    if (!valor) {
        return null;
    }

    const fecha =
        new Date(valor);

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return null;
    }

    return fecha.toISOString();
}


function escaparHTML(valor) {
    const elemento =
        document.createElement("div");

    elemento.textContent =
        String(valor ?? "");

    return elemento.innerHTML;
}