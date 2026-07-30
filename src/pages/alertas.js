import { CONFIG } from "../../config.js";

import {
    obtenerAlertas,
    atenderAlerta,
    obtenerResumenAlertas,
    obtenerListaAlertas,
    obtenerTiposAlertas,
    puedeConsultarAlertasEstatales,
    obtenerJurisdiccionAlertas,
    calcularPaginacionAlertas,
    obtenerClasePrioridad,
    obtenerClaseOrigenAlerta,
    puedeAtenderAlerta,
    tieneOperativoRelacionado,
    tieneVerificacionRelacionada,
    tieneLoteRelacionado,
    tieneCasoRelacionado
} from "../services/alertas.service.js";

import {
    obtenerCatalogosOperativo
} from "../services/operativos.service.js";

import {
    obtenerCookie
} from "../utils/cookies.js";

import {
    navegar
} from "../utils/router.js";


const ESTADO = {
    cargando: false,

    respuesta: null,

    jurisdicciones: [],

    tipos: [],

    alertas: [],

    resumen: {},

    total: 0,

    limite: 20,

    offset: 0,

    filtros: crearFiltrosIniciales()
};


/*
==========================================================
INICIO
==========================================================
*/

export async function mostrarAlertas() {
    document.title =
        `Alertas | ${CONFIG.APP_NAME}`;

    reiniciarEstado();

    renderizarCargaInicial();

    try {
        await cargarCatalogos();

        await cargarAlertas();
    } catch (error) {
        renderizarErrorGeneral(error);
    }
}


function reiniciarEstado() {
    ESTADO.cargando = false;
    ESTADO.respuesta = null;
    ESTADO.tipos = [];
    ESTADO.alertas = [];
    ESTADO.resumen = {};
    ESTADO.total = 0;
    ESTADO.limite = 20;
    ESTADO.offset = 0;
    ESTADO.filtros =
        crearFiltrosIniciales();
}


/*
==========================================================
CATÁLOGOS
==========================================================
*/

async function cargarCatalogos() {
    const respuesta =
        await obtenerCatalogosOperativo(
            obtenerToken()
        );

    ESTADO.jurisdicciones =
        obtenerArreglo(
            respuesta.jurisdicciones
        );
}


/*
==========================================================
CONSULTA
==========================================================
*/

async function cargarAlertas() {
    if (ESTADO.cargando) {
        return;
    }

    ESTADO.cargando = true;

    try {
        const respuesta =
            await obtenerAlertas(
                obtenerToken(),
                {
                    ...ESTADO.filtros,

                    limite:
                        ESTADO.limite,

                    offset:
                        ESTADO.offset
                }
            );

        ESTADO.respuesta =
            respuesta;

        ESTADO.alertas =
            obtenerListaAlertas(
                respuesta
            );

        ESTADO.tipos =
            obtenerTiposAlertas(
                respuesta
            );

        ESTADO.resumen =
            obtenerResumenAlertas(
                respuesta
            );

        ESTADO.total =
            Number(
                respuesta.total
            ) || 0;

        ESTADO.limite =
            Number(
                respuesta.limite
            ) || ESTADO.limite;

        ESTADO.offset =
            Number(
                respuesta.offset
            ) || 0;

        ajustarJurisdiccionUsuario();

        renderizarPagina();
    } finally {
        ESTADO.cargando = false;
    }
}


function ajustarJurisdiccionUsuario() {
    if (
        puedeConsultarAlertasEstatales(
            ESTADO.respuesta
        )
    ) {
        return;
    }

    ESTADO.filtros.jurisdiccion =
        obtenerJurisdiccionAlertas(
            ESTADO.respuesta
        );
}


/*
==========================================================
PÁGINA PRINCIPAL
==========================================================
*/

function renderizarPagina() {
    const app =
        obtenerApp();

    app.innerHTML = `
        <div class="alerts-page">

            <header class="alerts-header">

                <div>
                    <p class="alerts-header__eyebrow">
                        Seguimiento operativo
                    </p>

                    <h1>Alertas</h1>

                    <p>
                        Verificaciones, casos e inventarios
                        que requieren revisión o seguimiento.
                    </p>
                </div>

                <div class="alerts-header__actions">

                    <button
                        id="btn-alerts-refresh"
                        class="button button--primary"
                        type="button"
                    >
                        Actualizar
                    </button>

                    <button
                        id="btn-alerts-home"
                        class="button button--secondary"
                        type="button"
                    >
                        Volver al inicio
                    </button>

                </div>

            </header>

            <main class="alerts-main">

                ${crearResumen()}

                ${crearFiltros()}

                <section class="alerts-results">

                    <header class="alerts-results__header">

                        <div>
                            <h2>
                                Alertas encontradas
                            </h2>

                            <p>
                                ${formatearEntero(
                                    ESTADO.total
                                )}
                                registro(s).
                            </p>
                        </div>

                        <div class="alerts-results__view">
                            ${
                                ESTADO.filtros
                                    .solo_pendientes
                                    ? "Mostrando pendientes"
                                    : "Mostrando todas"
                            }
                        </div>

                    </header>

                    <div class="alerts-grid">

                        ${
                            ESTADO.alertas.length === 0
                                ? crearEstadoVacio(
                                    "No se encontraron alertas con los filtros seleccionados."
                                )
                                : ESTADO.alertas
                                    .map(
                                        crearTarjetaAlerta
                                    )
                                    .join("")
                        }

                    </div>

                    ${crearPaginacion()}

                </section>

            </main>

            <div
                id="alerts-modal-root"
                class="modal-root"
            ></div>

        </div>
    `;

    registrarEventos();
}


/*
==========================================================
RESUMEN
==========================================================
*/

function crearResumen() {
    const resumen =
        ESTADO.resumen || {};

    const tarjetas = [
        {
            etiqueta: "Total",
            valor: resumen.total,
            clase: "blue"
        },
        {
            etiqueta: "Pendientes",
            valor: resumen.pendientes,
            clase: "orange"
        },
        {
            etiqueta: "Atendidas",
            valor: resumen.atendidas,
            clase: "green"
        },
        {
            etiqueta: "Prioridad alta",
            valor: resumen.alta,
            clase: "red"
        },
        {
            etiqueta: "Prioridad media",
            valor: resumen.media,
            clase: "yellow"
        },
        {
            etiqueta: "Verificaciones",
            valor: resumen.verificaciones,
            clase: "purple"
        },
        {
            etiqueta: "Inventario",
            valor: resumen.inventario,
            clase: "blue"
        },
        {
            etiqueta: "Casos",
            valor: resumen.casos,
            clase: "orange"
        }
    ];

    return `
        <section
            class="alerts-summary"
            aria-label="Resumen de alertas"
        >
            ${tarjetas.map(
                tarjeta => `
                    <article
                        class="
                            alerts-summary-card
                            alerts-summary-card--${tarjeta.clase}
                        "
                    >
                        <span>
                            ${escaparHTML(
                                tarjeta.etiqueta
                            )}
                        </span>

                        <strong>
                            ${formatearEntero(
                                tarjeta.valor
                            )}
                        </strong>
                    </article>
                `
            ).join("")}
        </section>
    `;
}


/*
==========================================================
FILTROS
==========================================================
*/

function crearFiltros() {
    const supervisor =
        puedeConsultarAlertasEstatales(
            ESTADO.respuesta
        );

    return `
        <section class="alerts-filters">

            <form id="form-alerts-filters">

                ${
                    supervisor
                        ? crearFiltroJurisdiccion()
                        : crearJurisdiccionFija()
                }

                <div class="form-group">

                    <label for="alerts-type">
                        Tipo
                    </label>

                    <select id="alerts-type">

                        <option value="">
                            Todos
                        </option>

                        ${ESTADO.tipos.map(
                            tipo => `
                                <option
                                    value="${escaparHTML(
                                        tipo.codigo
                                    )}"
                                    ${
                                        ESTADO.filtros
                                            .tipo ===
                                        tipo.codigo
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    ${escaparHTML(
                                        tipo.nombre
                                    )}
                                </option>
                            `
                        ).join("")}

                    </select>

                </div>

                <div class="form-group">

                    <label for="alerts-priority">
                        Prioridad
                    </label>

                    <select id="alerts-priority">

                        <option value="">
                            Todas
                        </option>

                        <option
                            value="ALTA"
                            ${
                                ESTADO.filtros
                                    .prioridad ===
                                "ALTA"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Alta
                        </option>

                        <option
                            value="MEDIA"
                            ${
                                ESTADO.filtros
                                    .prioridad ===
                                "MEDIA"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Media
                        </option>

                        <option
                            value="BAJA"
                            ${
                                ESTADO.filtros
                                    .prioridad ===
                                "BAJA"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Baja
                        </option>

                    </select>

                </div>

                <div class="form-group">

                    <label for="alerts-date-start">
                        Desde
                    </label>

                    <input
                        id="alerts-date-start"
                        type="date"
                        value="${escaparHTML(
                            ESTADO.filtros
                                .fecha_inicio ||
                            ""
                        )}"
                    >

                </div>

                <div class="form-group">

                    <label for="alerts-date-end">
                        Hasta
                    </label>

                    <input
                        id="alerts-date-end"
                        type="date"
                        value="${escaparHTML(
                            ESTADO.filtros
                                .fecha_fin ||
                            ""
                        )}"
                    >

                </div>

                <div class="form-checkbox-group">

                    <label class="checkbox-control">

                        <input
                            id="alerts-only-pending"
                            type="checkbox"
                            ${
                                ESTADO.filtros
                                    .solo_pendientes
                                    ? "checked"
                                    : ""
                            }
                        >

                        <span>
                            Solo pendientes
                        </span>

                    </label>

                </div>

                <div class="alerts-filters__actions">

                    <button
                        class="button button--primary"
                        type="submit"
                    >
                        Consultar
                    </button>

                    <button
                        id="btn-alerts-clear"
                        class="button button--secondary"
                        type="button"
                    >
                        Restablecer
                    </button>

                </div>

            </form>

        </section>
    `;
}


function crearFiltroJurisdiccion() {
    return `
        <div class="form-group">

            <label for="alerts-jurisdiction">
                Jurisdicción
            </label>

            <select id="alerts-jurisdiction">

                <option value="">
                    Todas
                </option>

                ${ESTADO.jurisdicciones.map(
                    jurisdiccion => `
                        <option
                            value="${escaparHTML(
                                jurisdiccion.clave
                            )}"
                            ${
                                ESTADO.filtros
                                    .jurisdiccion ===
                                jurisdiccion.clave
                                    ? "selected"
                                    : ""
                            }
                        >
                            ${escaparHTML(
                                `${jurisdiccion.clave} - ${jurisdiccion.nombre}`
                            )}
                        </option>
                    `
                ).join("")}

            </select>

        </div>
    `;
}


function crearJurisdiccionFija() {
    const clave =
        obtenerJurisdiccionAlertas(
            ESTADO.respuesta
        );

    const jurisdiccion =
        ESTADO.jurisdicciones.find(
            item =>
                item.clave === clave
        );

    return `
        <div class="form-group">

            <label>
                Jurisdicción
            </label>

            <div class="alerts-static-field">
                ${escaparHTML(
                    jurisdiccion
                        ? `${jurisdiccion.clave} - ${jurisdiccion.nombre}`
                        : clave || "Jurisdiccional"
                )}
            </div>

        </div>
    `;
}


/*
==========================================================
TARJETAS DE ALERTAS
==========================================================
*/

function crearTarjetaAlerta(alerta) {
    const clasePrioridad =
        obtenerClasePrioridad(
            alerta.prioridad
        );

    const claseOrigen =
        obtenerClaseOrigenAlerta(
            alerta.origen_alerta
        );

    return `
        <article
            class="
                alert-card
                ${alerta.atendida
                    ? "is-attended"
                    : ""
                }
            "
        >

            <header class="alert-card__header">

                <div class="alert-card__badges">

                    <span
                        class="
                            alert-origin
                            ${claseOrigen}
                        "
                    >
                        ${escaparHTML(
                            formatearTextoEstado(
                                alerta.origen_alerta
                            )
                        )}
                    </span>

                    <span
                        class="
                            alert-priority
                            ${clasePrioridad}
                        "
                    >
                        Prioridad
                        ${escaparHTML(
                            formatearTextoEstado(
                                alerta.prioridad
                            )
                        )}
                    </span>

                    ${
                        alerta.atendida
                            ? `
                                <span class="alert-attended">
                                    Atendida
                                </span>
                            `
                            : ""
                    }

                </div>

                <span class="alert-card__date">
                    ${formatearFechaHora(
                        alerta.fecha_alerta
                    )}
                </span>

            </header>

            <div class="alert-card__body">

                <h3>
                    ${escaparHTML(
                        alerta.titulo ||
                        "Alerta"
                    )}
                </h3>

                <p>
                    ${escaparHTML(
                        alerta.descripcion ||
                        "Sin descripción."
                    )}
                </p>

                ${crearDatosRelacionados(alerta)}

                ${crearMetadataAlerta(alerta)}

                ${
                    Number(
                        alerta.dias_vencida
                    ) > 0
                        ? `
                            <div class="alert-overdue">
                                Vencida por
                                ${formatearEntero(
                                    alerta.dias_vencida
                                )}
                                día(s)
                            </div>
                        `
                        : ""
                }

                ${
                    alerta.fecha_programada
                        ? `
                            <p class="alert-scheduled">
                                <strong>
                                    Fecha programada:
                                </strong>

                                ${formatearFecha(
                                    alerta.fecha_programada
                                )}
                            </p>
                        `
                        : ""
                }

                ${
                    alerta.atendida &&
                    alerta.fecha_atencion
                        ? `
                            <p class="alert-attention-date">
                                <strong>
                                    Atendida:
                                </strong>

                                ${formatearFechaHora(
                                    alerta.fecha_atencion
                                )}
                            </p>
                        `
                        : ""
                }

            </div>

            <footer class="alert-card__actions">

                ${crearAccionesAlerta(alerta)}

            </footer>

        </article>
    `;
}


function crearDatosRelacionados(alerta) {
    const datos = [];

    if (
        tieneCasoRelacionado(
            alerta
        )
    ) {
        datos.push(`
            <div>
                <span>Caso</span>

                <strong>
                    ${escaparHTML(
                        alerta.folio_caso
                    )}
                </strong>
            </div>
        `);
    }

    if (alerta.cve_jur_res) {
        datos.push(`
            <div>
                <span>Jurisdicción</span>

                <strong>
                    ${escaparHTML(
                        alerta.cve_jur_res
                    )}
                </strong>
            </div>
        `);
    }

    if (
        tieneVerificacionRelacionada(
            alerta
        ) &&
        alerta.metadata
            ?.numero_verificacion
    ) {
        datos.push(`
            <div>
                <span>Verificación</span>

                <strong>
                    Número
                    ${formatearEntero(
                        alerta.metadata
                            .numero_verificacion
                    )}
                </strong>
            </div>
        `);
    }

    if (
        tieneLoteRelacionado(
            alerta
        ) &&
        alerta.metadata?.lote
    ) {
        datos.push(`
            <div>
                <span>Lote</span>

                <strong>
                    ${escaparHTML(
                        alerta.metadata.lote
                    )}
                </strong>
            </div>
        `);
    }

    if (datos.length === 0) {
        return "";
    }

    return `
        <div class="alert-related-data">
            ${datos.join("")}
        </div>
    `;
}


function crearMetadataAlerta(alerta) {
    const metadata =
        alerta.metadata || {};

    const elementos = [];

    if (metadata.producto) {
        elementos.push(`
            <li>
                <strong>Producto:</strong>
                ${escaparHTML(
                    metadata.producto
                )}
            </li>
        `);
    }

    if (
        metadata.existencia !==
        undefined &&
        metadata.existencia !== null
    ) {
        elementos.push(`
            <li>
                <strong>Existencia:</strong>
                ${formatearDecimal(
                    metadata.existencia
                )}
                ${escaparHTML(
                    metadata.unidad || ""
                )}
            </li>
        `);
    }

    if (metadata.clasificacion) {
        elementos.push(`
            <li>
                <strong>Clasificación:</strong>
                ${escaparHTML(
                    metadata.clasificacion
                )}
            </li>
        `);
    }

    if (metadata.estatus) {
        elementos.push(`
            <li>
                <strong>Estatus:</strong>
                ${escaparHTML(
                    formatearTextoEstado(
                        metadata.estatus
                    )
                )}
            </li>
        `);
    }

    if (elementos.length === 0) {
        return "";
    }

    return `
        <ul class="alert-metadata">
            ${elementos.join("")}
        </ul>
    `;
}


/*
==========================================================
ACCIONES
==========================================================
*/

function crearAccionesAlerta(alerta) {
    const acciones = [];

    if (
        tieneOperativoRelacionado(
            alerta
        )
    ) {
        acciones.push(`
            <button
                class="button button--secondary"
                type="button"
                data-alert-operativo="${escaparHTML(
                    alerta.operativo_id
                )}"
            >
                Ver operativo
            </button>
        `);
    }

    if (
        tieneVerificacionRelacionada(
            alerta
        )
    ) {
        acciones.push(`
            <button
                class="button button--secondary"
                type="button"
                data-alert-verificacion="${escaparHTML(
                    alerta.verificacion_id
                )}"
            >
                Ir a verificaciones
            </button>
        `);
    }

    if (
        tieneLoteRelacionado(
            alerta
        )
    ) {
        acciones.push(`
            <button
                class="button button--secondary"
                type="button"
                data-alert-inventory
            >
                Ver inventario
            </button>
        `);
    }

    if (
        tieneCasoRelacionado(
            alerta
        ) &&
        !tieneOperativoRelacionado(
            alerta
        )
    ) {
        acciones.push(`
            <button
                class="button button--secondary"
                type="button"
                data-alert-cases
            >
                Ver casos
            </button>
        `);
    }

    if (
        puedeAtenderAlerta(
            alerta
        )
    ) {
        acciones.push(`
            <button
                class="button button--primary"
                type="button"
                data-alert-attend="${escaparHTML(
                    alerta.alerta_id
                )}"
            >
                Marcar atendida
            </button>
        `);
    }

    if (acciones.length === 0) {
        return `
            <span class="alert-card__no-action">
                La alerta se resolverá al corregir
                la condición que la genera.
            </span>
        `;
    }

    return acciones.join("");
}


/*
==========================================================
PAGINACIÓN
==========================================================
*/

function crearPaginacion() {
    const paginacion =
        calcularPaginacionAlertas(
            ESTADO.total,
            ESTADO.limite,
            ESTADO.offset
        );

    return `
        <footer class="alerts-pagination">

            <span>
                Página
                ${formatearEntero(
                    paginacion.paginaActual
                )}
                de
                ${formatearEntero(
                    paginacion.totalPaginas
                )}
            </span>

            <div>

                <button
                    class="button button--secondary"
                    type="button"
                    data-alert-page-offset="${
                        paginacion.offsetAnterior
                    }"
                    ${
                        paginacion.tieneAnterior
                            ? ""
                            : "disabled"
                    }
                >
                    Anterior
                </button>

                <button
                    class="button button--secondary"
                    type="button"
                    data-alert-page-offset="${
                        paginacion.offsetSiguiente
                    }"
                    ${
                        paginacion.tieneSiguiente
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


/*
==========================================================
EVENTOS
==========================================================
*/

function registrarEventos() {
    document
        .getElementById(
            "btn-alerts-home"
        )
        .addEventListener(
            "click",
            () => navegar("/inicio")
        );

    document
        .getElementById(
            "btn-alerts-refresh"
        )
        .addEventListener(
            "click",
            procesarActualizacion
        );

    document
        .getElementById(
            "form-alerts-filters"
        )
        .addEventListener(
            "submit",
            procesarFiltros
        );

    document
        .getElementById(
            "btn-alerts-clear"
        )
        .addEventListener(
            "click",
            restablecerFiltros
        );

    registrarEventosPaginacion();

    registrarEventosAcciones();
}


function registrarEventosPaginacion() {
    document
        .querySelectorAll(
            "[data-alert-page-offset]"
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                async () => {
                    if (boton.disabled) {
                        return;
                    }

                    ESTADO.offset =
                        Number(
                            boton.dataset
                                .alertPageOffset
                        ) || 0;

                    renderizarCargaInicial();

                    try {
                        await cargarAlertas();
                    } catch (error) {
                        renderizarErrorGeneral(
                            error
                        );
                    }
                }
            );
        });
}


function registrarEventosAcciones() {
    document
        .querySelectorAll(
            "[data-alert-operativo]"
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                () => navegar(
                    "/consultas"
                )
            );
        });

    document
        .querySelectorAll(
            "[data-alert-verificacion]"
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                () => navegar(
                    "/consultas"
                )
            );
        });

    document
        .querySelectorAll(
            "[data-alert-inventory]"
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                () => navegar(
                    "/inventarios"
                )
            );
        });

    document
        .querySelectorAll(
            "[data-alert-cases]"
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                () => navegar(
                    "/consultas"
                )
            );
        });

    document
        .querySelectorAll(
            "[data-alert-attend]"
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                () => mostrarFormularioAtencion(
                    boton.dataset.alertAttend
                )
            );
        });
}


/*
==========================================================
PROCESAR FILTROS
==========================================================
*/

async function procesarFiltros(
    evento
) {
    evento.preventDefault();

    const fechaInicio =
        obtenerValor(
            "alerts-date-start"
        );

    const fechaFin =
        obtenerValor(
            "alerts-date-end"
        );

    if (
        fechaInicio &&
        fechaFin &&
        fechaFin < fechaInicio
    ) {
        window.alert(
            "La fecha final no puede ser anterior a la fecha inicial."
        );

        return;
    }

    ESTADO.filtros = {
        jurisdiccion:
            puedeConsultarAlertasEstatales(
                ESTADO.respuesta
            )
                ? obtenerValor(
                    "alerts-jurisdiction"
                )
                : obtenerJurisdiccionAlertas(
                    ESTADO.respuesta
                ),

        tipo:
            obtenerValor(
                "alerts-type"
            ),

        prioridad:
            obtenerValor(
                "alerts-priority"
            ),

        solo_pendientes:
            Boolean(
                document
                    .getElementById(
                        "alerts-only-pending"
                    )
                    ?.checked
            ),

        fecha_inicio:
            fechaInicio,

        fecha_fin:
            fechaFin
    };

    ESTADO.offset = 0;

    renderizarCargaInicial();

    try {
        await cargarAlertas();
    } catch (error) {
        renderizarErrorGeneral(error);
    }
}


async function restablecerFiltros() {
    const jurisdiccion =
        puedeConsultarAlertasEstatales(
            ESTADO.respuesta
        )
            ? null
            : obtenerJurisdiccionAlertas(
                ESTADO.respuesta
            );

    ESTADO.filtros = {
        ...crearFiltrosIniciales(),
        jurisdiccion
    };

    ESTADO.offset = 0;

    renderizarCargaInicial();

    try {
        await cargarAlertas();
    } catch (error) {
        renderizarErrorGeneral(error);
    }
}


async function procesarActualizacion() {
    const boton =
        document.getElementById(
            "btn-alerts-refresh"
        );

    bloquearBoton(
        boton,
        true,
        "Actualizando..."
    );

    try {
        await cargarAlertas();
    } catch (error) {
        window.alert(
            error.message
        );

        bloquearBoton(
            boton,
            false,
            "Actualizar"
        );
    }
}


/*
==========================================================
ATENDER ALERTA
==========================================================
*/

function mostrarFormularioAtencion(
    alertaId
) {
    const alerta =
        ESTADO.alertas.find(
            item =>
                item.alerta_id ===
                alertaId
        );

    abrirModal(`
        <div class="alerts-modal">

            <header class="modal-header">

                <div>
                    <p class="modal-header__eyebrow">
                        Seguimiento
                    </p>

                    <h2>
                        Marcar alerta como atendida
                    </h2>

                    ${
                        alerta
                            ? `
                                <p>
                                    ${escaparHTML(
                                        alerta.titulo
                                    )}
                                </p>
                            `
                            : ""
                    }

                </div>

                <button
                    class="modal-close"
                    type="button"
                    data-close-alert-modal
                >
                    ×
                </button>

            </header>

            <form
                id="form-attend-alert"
                class="modal-body"
            >

                <input
                    id="attend-alert-id"
                    type="hidden"
                    value="${escaparHTML(
                        alertaId
                    )}"
                >

                <div class="form-group">

                    <label for="attend-alert-observations">
                        Observaciones de atención
                    </label>

                    <textarea
                        id="attend-alert-observations"
                        rows="5"
                        maxlength="1000"
                        placeholder="Describa brevemente cómo fue atendida la alerta."
                    ></textarea>

                </div>

                <div
                    id="attend-alert-message"
                    class="form-message"
                ></div>

                <div class="modal-actions">

                    <button
                        class="button button--secondary"
                        type="button"
                        data-close-alert-modal
                    >
                        Cancelar
                    </button>

                    <button
                        id="btn-confirm-attend-alert"
                        class="button button--primary"
                        type="submit"
                    >
                        Confirmar atención
                    </button>

                </div>

            </form>

        </div>
    `);

    document
        .getElementById(
            "form-attend-alert"
        )
        .addEventListener(
            "submit",
            procesarAtencionAlerta
        );
}


async function procesarAtencionAlerta(
    evento
) {
    evento.preventDefault();

    const boton =
        document.getElementById(
            "btn-confirm-attend-alert"
        );

    bloquearBoton(
        boton,
        true,
        "Guardando..."
    );

    limpiarMensajeModal(
        "attend-alert-message"
    );

    try {
        await atenderAlerta(
            obtenerToken(),

            obtenerValor(
                "attend-alert-id"
            ),

            obtenerValor(
                "attend-alert-observations"
            )
        );

        cerrarModal();

        ESTADO.offset = 0;

        renderizarCargaInicial();

        await cargarAlertas();
    } catch (error) {
        mostrarMensajeModal(
            "attend-alert-message",
            error.message,
            true
        );

        bloquearBoton(
            boton,
            false,
            "Confirmar atención"
        );
    }
}


/*
==========================================================
MODALES
==========================================================
*/

function abrirModal(contenido) {
    const root =
        document.getElementById(
            "alerts-modal-root"
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
            "[data-close-alert-modal]"
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
        ?.addEventListener(
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
            "alerts-modal-root"
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
                    Cargando alertas...
                </p>

            </div>

        </main>
    `;
}


function renderizarErrorGeneral(error) {
    obtenerApp().innerHTML = `
        <main class="system-error">

            <section class="system-error__card">

                <h1>
                    No fue posible cargar las alertas
                </h1>

                <p>
                    ${escaparHTML(
                        error?.message ||
                        "Ocurrió un error inesperado."
                    )}
                </p>

                <div class="system-error__actions">

                    <button
                        id="btn-alerts-retry"
                        class="button button--primary"
                        type="button"
                    >
                        Reintentar
                    </button>

                    <button
                        id="btn-alerts-error-home"
                        class="button button--secondary"
                        type="button"
                    >
                        Volver al inicio
                    </button>

                </div>

            </section>

        </main>
    `;

    document
        .getElementById(
            "btn-alerts-retry"
        )
        .addEventListener(
            "click",
            mostrarAlertas
        );

    document
        .getElementById(
            "btn-alerts-error-home"
        )
        .addEventListener(
            "click",
            () => navegar("/inicio")
        );
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


/*
==========================================================
FILTROS INICIALES
==========================================================
*/

function crearFiltrosIniciales() {
    return {
        jurisdiccion: null,
        tipo: null,
        prioridad: null,
        solo_pendientes: true,
        fecha_inicio:
            fechaHaceDiasISO(90),
        fecha_fin:
            fechaDentroDiasISO(90)
    };
}


/*
==========================================================
UTILIDADES
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

    const texto =
        String(
            elemento.value || ""
        ).trim();

    return texto || null;
}


function obtenerArreglo(valor) {
    return Array.isArray(valor)
        ? valor
        : [];
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


function fechaHaceDiasISO(dias) {
    const fecha =
        new Date();

    fecha.setDate(
        fecha.getDate() -
        Number(dias || 0)
    );

    return fechaLocalISO(fecha);
}


function fechaDentroDiasISO(dias) {
    const fecha =
        new Date();

    fecha.setDate(
        fecha.getDate() +
        Number(dias || 0)
    );

    return fechaLocalISO(fecha);
}


function fechaLocalISO(fecha) {
    const diferencia =
        fecha.getTimezoneOffset() *
        60000;

    return new Date(
        fecha.getTime() -
        diferencia
    )
        .toISOString()
        .slice(0, 10);
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


function crearEstadoVacio(mensaje) {
    return `
        <div class="empty-state">

            <p>
                ${escaparHTML(mensaje)}
            </p>

        </div>
    `;
}


function escaparHTML(valor) {
    const elemento =
        document.createElement("div");

    elemento.textContent =
        String(valor ?? "");

    return elemento.innerHTML;
}