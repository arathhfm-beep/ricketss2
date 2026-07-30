import { CONFIG } from "../../config.js";

import {
    obtenerCatalogosReportes,
    generarReporte,
    generarReporteCompleto,
    convertirReporteCSV,
    descargarCSV,
    crearNombreArchivoReporte,
    obtenerJurisdiccionesReportes,
    obtenerProgramasReportes,
    obtenerTiposOperativoReportes,
    obtenerTiposActividadReportes,
    obtenerTiposReporte,
    puedeConsultarReportesEstatales,
    obtenerJurisdiccionReporteUsuario,
    filtrarTiposOperativo,
    filtrarTiposActividad,
    calcularPaginacionReportes
} from "../services/reportes.service.js";

import {
    obtenerCookie
} from "../utils/cookies.js";

import {
    navegar
} from "../utils/router.js";


const ESTADO = {
    cargando: false,
    exportando: false,

    catalogos: {
        usuario: {},
        jurisdicciones: [],
        programas: [],
        tipos_operativo: [],
        tipos_actividad: [],
        tipos_reporte: []
    },

    reporte: {
        tipo_reporte: null,
        generado_en: null,
        columnas: [],
        registros: [],
        total: 0,
        limite: 50,
        offset: 0
    },

    filtros: crearFiltrosIniciales()
};


/*
==========================================================
INICIO
==========================================================
*/

export async function mostrarReportes() {
    document.title =
        `Reportes | ${CONFIG.APP_NAME}`;

    reiniciarEstado();

    renderizarCargaInicial();

    try {
        await cargarCatalogos();

        prepararFiltrosUsuario();

        renderizarPagina();
    } catch (error) {
        renderizarErrorGeneral(error);
    }
}


function reiniciarEstado() {
    ESTADO.cargando = false;
    ESTADO.exportando = false;

    ESTADO.catalogos = {
        usuario: {},
        jurisdicciones: [],
        programas: [],
        tipos_operativo: [],
        tipos_actividad: [],
        tipos_reporte: []
    };

    ESTADO.reporte = {
        tipo_reporte: null,
        generado_en: null,
        columnas: [],
        registros: [],
        total: 0,
        limite: 50,
        offset: 0
    };

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
        await obtenerCatalogosReportes(
            obtenerToken()
        );

    ESTADO.catalogos = {
        usuario:
            respuesta.usuario || {},

        jurisdicciones:
            obtenerJurisdiccionesReportes(
                respuesta
            ),

        programas:
            obtenerProgramasReportes(
                respuesta
            ),

        tipos_operativo:
            obtenerTiposOperativoReportes(
                respuesta
            ),

        tipos_actividad:
            obtenerTiposActividadReportes(
                respuesta
            ),

        tipos_reporte:
            obtenerTiposReporte(
                respuesta
            )
    };
}


function prepararFiltrosUsuario() {
    if (
        puedeConsultarReportesEstatales(
            ESTADO.catalogos
        )
    ) {
        return;
    }

    ESTADO.filtros.jurisdiccion =
        obtenerJurisdiccionReporteUsuario(
            ESTADO.catalogos
        );
}


/*
==========================================================
RENDERIZADO PRINCIPAL
==========================================================
*/

function renderizarPagina() {
    const app =
        obtenerApp();

    app.innerHTML = `
        <div class="reports-page">

            <header class="reports-header">

                <div>
                    <p class="reports-header__eyebrow">
                        Consulta y exportación
                    </p>

                    <h1>Reportes</h1>

                    <p>
                        Genere reportes de casos,
                        operativos, viviendas,
                        actividades, verificaciones,
                        consumos e inventario.
                    </p>
                </div>

                <div class="reports-header__actions">

                    <button
                        id="btn-reports-export"
                        class="button button--primary"
                        type="button"
                        disabled
                    >
                        Exportar CSV
                    </button>

                    <button
                        id="btn-reports-home"
                        class="button button--secondary"
                        type="button"
                    >
                        Volver al inicio
                    </button>

                </div>

            </header>

            <main class="reports-main">

                ${crearFormularioFiltros()}

                <section
                    id="reports-results"
                    class="reports-results"
                >
                    ${crearEstadoInicial()}
                </section>

            </main>

        </div>
    `;

    registrarEventosGenerales();
}


/*
==========================================================
FORMULARIO DE FILTROS
==========================================================
*/

function crearFormularioFiltros() {
    const supervisor =
        puedeConsultarReportesEstatales(
            ESTADO.catalogos
        );

    return `
        <section class="reports-filters">

            <form id="form-reports">

                <div class="form-group">

                    <label for="report-type">
                        Tipo de reporte
                    </label>

                    <select
                        id="report-type"
                        required
                    >
                        <option value="">
                            Seleccione
                        </option>

                        ${ESTADO.catalogos
                            .tipos_reporte
                            .map(tipo => `
                                <option
                                    value="${escaparHTML(
                                        tipo.codigo
                                    )}"
                                    ${
                                        ESTADO.filtros
                                            .tipo_reporte ===
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

                    </select>

                </div>

                ${
                    supervisor
                        ? crearSelectorJurisdiccion()
                        : crearJurisdiccionFija()
                }

                <div class="form-group">

                    <label for="report-date-start">
                        Desde
                    </label>

                    <input
                        id="report-date-start"
                        type="date"
                        value="${escaparHTML(
                            ESTADO.filtros
                                .fecha_inicio ||
                            ""
                        )}"
                        required
                    >

                </div>

                <div class="form-group">

                    <label for="report-date-end">
                        Hasta
                    </label>

                    <input
                        id="report-date-end"
                        type="date"
                        value="${escaparHTML(
                            ESTADO.filtros
                                .fecha_fin ||
                            ""
                        )}"
                        required
                    >

                </div>

                <div class="form-group">

                    <label for="report-program">
                        Programa
                    </label>

                    <select id="report-program">

                        <option value="">
                            Todos
                        </option>

                        ${ESTADO.catalogos
                            .programas
                            .map(programa => `
                                <option
                                    value="${escaparHTML(
                                        programa.id
                                    )}"
                                    ${
                                        ESTADO.filtros
                                            .programa_id ===
                                        programa.id
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    ${escaparHTML(
                                        programa.nombre
                                    )}
                                </option>
                            `)
                            .join("")}

                    </select>

                </div>

                <div class="form-group">

                    <label for="report-operation-type">
                        Tipo de operativo
                    </label>

                    <select id="report-operation-type">
                        ${crearOpcionesTiposOperativo()}
                    </select>

                </div>

                <div class="form-group">

                    <label for="report-activity-type">
                        Tipo de actividad
                    </label>

                    <select id="report-activity-type">
                        ${crearOpcionesTiposActividad()}
                    </select>

                </div>

                <div class="form-group">

                    <label for="report-search">
                        Buscar
                    </label>

                    <input
                        id="report-search"
                        type="search"
                        value="${escaparHTML(
                            ESTADO.filtros
                                .busqueda ||
                            ""
                        )}"
                        placeholder="Folio, producto, vivienda..."
                    >

                </div>

                <div class="form-checkbox-group">

                    <label class="checkbox-control">

                        <input
                            id="report-include-checks"
                            type="checkbox"
                            ${
                                ESTADO.filtros
                                    .incluir_verificaciones
                                    ? "checked"
                                    : ""
                            }
                        >

                        <span>
                            Incluir verificaciones
                        </span>

                    </label>

                </div>

                <div class="reports-filters__actions">

                    <button
                        id="btn-generate-report"
                        class="button button--primary"
                        type="submit"
                    >
                        Generar reporte
                    </button>

                    <button
                        id="btn-clear-report"
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


function crearSelectorJurisdiccion() {
    return `
        <div class="form-group">

            <label for="report-jurisdiction">
                Jurisdicción
            </label>

            <select id="report-jurisdiction">

                <option value="">
                    Todas
                </option>

                ${ESTADO.catalogos
                    .jurisdicciones
                    .map(jurisdiccion => `
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
                    `)
                    .join("")}

            </select>

        </div>
    `;
}


function crearJurisdiccionFija() {
    const clave =
        obtenerJurisdiccionReporteUsuario(
            ESTADO.catalogos
        );

    const jurisdiccion =
        ESTADO.catalogos
            .jurisdicciones
            .find(
                item =>
                    item.clave === clave
            );

    return `
        <div class="form-group">

            <label>
                Jurisdicción
            </label>

            <div class="reports-static-field">
                ${escaparHTML(
                    jurisdiccion
                        ? `${jurisdiccion.clave} - ${jurisdiccion.nombre}`
                        : clave || "Jurisdiccional"
                )}
            </div>

        </div>
    `;
}


function crearOpcionesTiposOperativo() {
    const registros =
        filtrarTiposOperativo(
            ESTADO.catalogos
                .tipos_operativo,

            ESTADO.filtros
                .programa_id
        );

    return `
        <option value="">
            Todos
        </option>

        ${registros.map(tipo => `
            <option
                value="${escaparHTML(
                    tipo.id
                )}"
                ${
                    ESTADO.filtros
                        .tipo_operativo_id ===
                    tipo.id
                        ? "selected"
                        : ""
                }
            >
                ${escaparHTML(
                    tipo.nombre
                )}
            </option>
        `).join("")}
    `;
}


function crearOpcionesTiposActividad() {
    const registros =
        filtrarTiposActividad(
            ESTADO.catalogos
                .tipos_actividad,

            ESTADO.filtros
                .programa_id
        );

    return `
        <option value="">
            Todas
        </option>

        ${registros.map(tipo => `
            <option
                value="${escaparHTML(
                    tipo.id
                )}"
                ${
                    ESTADO.filtros
                        .tipo_actividad_id ===
                    tipo.id
                        ? "selected"
                        : ""
                }
            >
                ${escaparHTML(
                    tipo.nombre
                )}
            </option>
        `).join("")}
    `;
}


/*
==========================================================
GENERAR REPORTE
==========================================================
*/

async function procesarGeneracion(
    evento
) {
    evento.preventDefault();

    if (ESTADO.cargando) {
        return;
    }

    guardarFiltros();

    validarFiltros();

    ESTADO.reporte.offset = 0;

    await cargarReporte();
}


async function cargarReporte() {
    ESTADO.cargando = true;

    mostrarCargaResultados();

    bloquearBoton(
        document.getElementById(
            "btn-generate-report"
        ),
        true,
        "Generando..."
    );

    deshabilitarExportacion();

    try {
        const respuesta =
            await generarReporte(
                obtenerToken(),
                {
                    ...ESTADO.filtros,

                    limite:
                        ESTADO.reporte.limite,

                    offset:
                        ESTADO.reporte.offset
                }
            );

        ESTADO.reporte = {
            tipo_reporte:
                respuesta.tipo_reporte,

            generado_en:
                respuesta.generado_en,

            columnas:
                obtenerArreglo(
                    respuesta.columnas
                ),

            registros:
                obtenerArreglo(
                    respuesta.registros
                ),

            total:
                Number(
                    respuesta.total
                ) || 0,

            limite:
                Number(
                    respuesta.limite
                ) || 50,

            offset:
                Number(
                    respuesta.offset
                ) || 0
        };

        renderizarResultados();

        actualizarBotonExportacion();
    } catch (error) {
        mostrarErrorResultados(error);
    } finally {
        ESTADO.cargando = false;

        bloquearBoton(
            document.getElementById(
                "btn-generate-report"
            ),
            false,
            "Generar reporte"
        );
    }
}


/*
==========================================================
RESULTADOS
==========================================================
*/

function renderizarResultados() {
    const contenedor =
        obtenerResultados();

    contenedor.innerHTML = `
        <header class="reports-results__header">

            <div>
                <p class="reports-results__eyebrow">
                    Resultado
                </p>

                <h2>
                    ${escaparHTML(
                        obtenerNombreTipoReporte(
                            ESTADO.reporte
                                .tipo_reporte
                        )
                    )}
                </h2>

                <p>
                    ${formatearEntero(
                        ESTADO.reporte.total
                    )}
                    registro(s) encontrado(s).
                </p>
            </div>

            <div class="reports-results__metadata">

                <span>
                    Generado:
                </span>

                <strong>
                    ${formatearFechaHora(
                        ESTADO.reporte
                            .generado_en
                    )}
                </strong>

            </div>

        </header>

        <div class="reports-table-wrapper">

            ${crearTablaReporte()}

        </div>

        ${crearPaginacion()}
    `;

    registrarEventosPaginacion();
}


function crearTablaReporte() {
    const registros =
        ESTADO.reporte.registros;

    const columnas =
        ESTADO.reporte.columnas;

    if (registros.length === 0) {
        return crearEstadoVacio(
            "No se encontraron registros con los filtros seleccionados."
        );
    }

    if (columnas.length === 0) {
        return crearEstadoVacio(
            "El reporte no contiene columnas para mostrar."
        );
    }

    return `
        <table class="reports-table">

            <thead>
                <tr>
                    ${columnas.map(
                        columna => `
                            <th>
                                ${escaparHTML(
                                    formatearNombreColumna(
                                        columna
                                    )
                                )}
                            </th>
                        `
                    ).join("")}
                </tr>
            </thead>

            <tbody>

                ${registros.map(
                    registro => `
                        <tr>
                            ${columnas.map(
                                columna => `
                                    <td>
                                        ${crearValorCelda(
                                            registro[
                                                columna
                                            ],
                                            columna
                                        )}
                                    </td>
                                `
                            ).join("")}
                        </tr>
                    `
                ).join("")}

            </tbody>

        </table>
    `;
}


/*
==========================================================
CELDAS
==========================================================
*/

function crearValorCelda(
    valor,
    columna
) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return `
            <span class="reports-empty-value">
                —
            </span>
        `;
    }

    if (
        typeof valor === "boolean"
    ) {
        return crearEtiquetaBooleana(
            valor
        );
    }

    if (
        typeof valor === "object"
    ) {
        return `
            <code class="reports-json-value">
                ${escaparHTML(
                    JSON.stringify(valor)
                )}
            </code>
        `;
    }

    if (
        esColumnaFecha(columna)
    ) {
        return escaparHTML(
            columnaIncluyeHora(columna)
                ? formatearFechaHora(valor)
                : formatearFecha(valor)
        );
    }

    if (
        esColumnaEstado(columna)
    ) {
        return crearEtiquetaEstado(
            valor
        );
    }

    if (
        esColumnaNumerica(
            columna,
            valor
        )
    ) {
        return `
            <span class="reports-number">
                ${formatearDecimal(
                    valor
                )}
            </span>
        `;
    }

    const texto =
        String(valor);

    return `
        <span
            class="reports-text-value"
            title="${escaparHTML(texto)}"
        >
            ${escaparHTML(texto)}
        </span>
    `;
}


function crearEtiquetaBooleana(valor) {
    return `
        <span
            class="
                reports-boolean
                ${
                    valor
                        ? "reports-boolean--yes"
                        : "reports-boolean--no"
                }
            "
        >
            ${valor ? "Sí" : "No"}
        </span>
    `;
}


function crearEtiquetaEstado(valor) {
    const texto =
        String(valor || "")
            .toUpperCase();

    let clase =
        "reports-status--neutral";

    if (
        [
            "ACTIVO",
            "FINALIZADO",
            "COMPLETADA",
            "DISPONIBLE",
            "CONFIRMADO"
        ].includes(texto)
    ) {
        clase =
            "reports-status--success";
    }

    if (
        [
            "PROGRAMADA",
            "EN_PROCESO",
            "PROBABLE",
            "PROXIMO_A_CADUCAR"
        ].includes(texto)
    ) {
        clase =
            "reports-status--warning";
    }

    if (
        [
            "CANCELADO",
            "CANCELADA",
            "AGOTADO",
            "CADUCADO",
            "DESCARTADO"
        ].includes(texto)
    ) {
        clase =
            "reports-status--danger";
    }

    return `
        <span
            class="
                reports-status
                ${clase}
            "
        >
            ${escaparHTML(
                formatearTextoEstado(
                    texto
                )
            )}
        </span>
    `;
}


/*
==========================================================
PAGINACIÓN
==========================================================
*/

function crearPaginacion() {
    const paginacion =
        calcularPaginacionReportes(
            ESTADO.reporte.total,
            ESTADO.reporte.limite,
            ESTADO.reporte.offset
        );

    return `
        <footer class="reports-pagination">

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
                    data-report-offset="${
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
                    data-report-offset="${
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


function registrarEventosPaginacion() {
    document
        .querySelectorAll(
            "[data-report-offset]"
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                async () => {
                    if (
                        boton.disabled ||
                        ESTADO.cargando
                    ) {
                        return;
                    }

                    ESTADO.reporte.offset =
                        Number(
                            boton.dataset
                                .reportOffset
                        ) || 0;

                    await cargarReporte();
                }
            );
        });
}


/*
==========================================================
EXPORTACIÓN CSV
==========================================================
*/

async function procesarExportacion() {
    if (
        ESTADO.exportando ||
        !ESTADO.reporte.tipo_reporte
    ) {
        return;
    }

    ESTADO.exportando = true;

    const boton =
        document.getElementById(
            "btn-reports-export"
        );

    bloquearBoton(
        boton,
        true,
        "Preparando CSV..."
    );

    try {
        const reporte =
            await generarReporteCompleto(
                obtenerToken(),
                ESTADO.filtros,
                5000
            );

        if (
            reporte.registros.length === 0
        ) {
            throw new Error(
                "El reporte no contiene registros para exportar."
            );
        }

        const csv =
            convertirReporteCSV(
                reporte.registros,
                reporte.columnas
            );

        const nombre =
            crearNombreArchivoReporte(
                reporte.tipo_reporte,
                reporte.filtros
            );

        descargarCSV(
            csv,
            nombre
        );
    } catch (error) {
        window.alert(
            error.message ||
            "No fue posible exportar el reporte."
        );
    } finally {
        ESTADO.exportando = false;

        bloquearBoton(
            boton,
            false,
            "Exportar CSV"
        );

        actualizarBotonExportacion();
    }
}


function actualizarBotonExportacion() {
    const boton =
        document.getElementById(
            "btn-reports-export"
        );

    if (!boton) {
        return;
    }

    boton.disabled =
        ESTADO.reporte.total <= 0 ||
        !ESTADO.reporte.tipo_reporte ||
        ESTADO.exportando;
}


function deshabilitarExportacion() {
    const boton =
        document.getElementById(
            "btn-reports-export"
        );

    if (boton) {
        boton.disabled = true;
    }
}


/*
==========================================================
EVENTOS GENERALES
==========================================================
*/

function registrarEventosGenerales() {
    document
        .getElementById(
            "btn-reports-home"
        )
        .addEventListener(
            "click",
            () => navegar("/inicio")
        );

    document
        .getElementById(
            "btn-reports-export"
        )
        .addEventListener(
            "click",
            procesarExportacion
        );

    document
        .getElementById(
            "form-reports"
        )
        .addEventListener(
            "submit",
            procesarGeneracion
        );

    document
        .getElementById(
            "btn-clear-report"
        )
        .addEventListener(
            "click",
            restablecerFormulario
        );

    document
        .getElementById(
            "report-program"
        )
        .addEventListener(
            "change",
            actualizarFiltrosPrograma
        );

    document
        .getElementById(
            "report-type"
        )
        .addEventListener(
            "change",
            actualizarCamposPorTipoReporte
        );

    actualizarCamposPorTipoReporte();
}


/*
==========================================================
FILTROS DINÁMICOS
==========================================================
*/

function actualizarFiltrosPrograma() {
    const programaId =
        obtenerValor(
            "report-program"
        );

    const tiposOperativo =
        filtrarTiposOperativo(
            ESTADO.catalogos
                .tipos_operativo,

            programaId
        );

    const tiposActividad =
        filtrarTiposActividad(
            ESTADO.catalogos
                .tipos_actividad,

            programaId
        );

    const selectOperativo =
        document.getElementById(
            "report-operation-type"
        );

    const selectActividad =
        document.getElementById(
            "report-activity-type"
        );

    selectOperativo.innerHTML = `
        <option value="">
            Todos
        </option>

        ${tiposOperativo.map(tipo => `
            <option
                value="${escaparHTML(
                    tipo.id
                )}"
            >
                ${escaparHTML(
                    tipo.nombre
                )}
            </option>
        `).join("")}
    `;

    selectActividad.innerHTML = `
        <option value="">
            Todas
        </option>

        ${tiposActividad.map(tipo => `
            <option
                value="${escaparHTML(
                    tipo.id
                )}"
            >
                ${escaparHTML(
                    tipo.nombre
                )}
            </option>
        `).join("")}
    `;
}


function actualizarCamposPorTipoReporte() {
    const tipo =
        obtenerValor(
            "report-type"
        );

    const usaPrograma =
        [
            "OPERATIVOS",
            "MANZANAS",
            "VIVIENDAS",
            "ACTIVIDADES",
            "VERIFICACIONES",
            "CONSUMOS"
        ].includes(tipo);

    const usaTipoOperativo =
        [
            "OPERATIVOS",
            "MANZANAS",
            "ACTIVIDADES",
            "VERIFICACIONES",
            "CONSUMOS"
        ].includes(tipo);

    const usaTipoActividad =
        [
            "ACTIVIDADES",
            "CONSUMOS"
        ].includes(tipo);

    const usaVerificaciones =
        [
            "VIVIENDAS",
            "ACTIVIDADES",
            "CONSUMOS"
        ].includes(tipo);

    habilitarCampo(
        "report-program",
        usaPrograma
    );

    habilitarCampo(
        "report-operation-type",
        usaTipoOperativo
    );

    habilitarCampo(
        "report-activity-type",
        usaTipoActividad
    );

    habilitarCampo(
        "report-include-checks",
        usaVerificaciones
    );
}


function habilitarCampo(
    id,
    habilitado
) {
    const elemento =
        document.getElementById(id);

    if (!elemento) {
        return;
    }

    elemento.disabled =
        !habilitado;

    const grupo =
        elemento.closest(
            ".form-group, .form-checkbox-group"
        );

    grupo?.classList.toggle(
        "is-disabled",
        !habilitado
    );

    if (!habilitado) {
        if (
            elemento.type ===
            "checkbox"
        ) {
            elemento.checked = true;
        } else {
            elemento.value = "";
        }
    }
}


/*
==========================================================
GUARDAR Y VALIDAR FILTROS
==========================================================
*/

function guardarFiltros() {
    const supervisor =
        puedeConsultarReportesEstatales(
            ESTADO.catalogos
        );

    ESTADO.filtros = {
        tipo_reporte:
            obtenerValor(
                "report-type"
            ),

        fecha_inicio:
            obtenerValor(
                "report-date-start"
            ),

        fecha_fin:
            obtenerValor(
                "report-date-end"
            ),

        jurisdiccion:
            supervisor
                ? obtenerValor(
                    "report-jurisdiction"
                )
                : obtenerJurisdiccionReporteUsuario(
                    ESTADO.catalogos
                ),

        programa_id:
            obtenerValor(
                "report-program"
            ),

        tipo_operativo_id:
            obtenerValor(
                "report-operation-type"
            ),

        tipo_actividad_id:
            obtenerValor(
                "report-activity-type"
            ),

        busqueda:
            obtenerValor(
                "report-search"
            ),

        incluir_verificaciones:
            Boolean(
                document
                    .getElementById(
                        "report-include-checks"
                    )
                    ?.checked
            )
    };
}


function validarFiltros() {
    if (
        !ESTADO.filtros
            .tipo_reporte
    ) {
        throw new Error(
            "Seleccione un tipo de reporte."
        );
    }

    if (
        !ESTADO.filtros
            .fecha_inicio ||
        !ESTADO.filtros
            .fecha_fin
    ) {
        throw new Error(
            "Seleccione el periodo del reporte."
        );
    }

    if (
        ESTADO.filtros.fecha_fin <
        ESTADO.filtros.fecha_inicio
    ) {
        throw new Error(
            "La fecha final no puede ser anterior a la fecha inicial."
        );
    }
}


/*
==========================================================
RESTABLECER
==========================================================
*/

function restablecerFormulario() {
    ESTADO.filtros =
        crearFiltrosIniciales();

    prepararFiltrosUsuario();

    ESTADO.reporte = {
        tipo_reporte: null,
        generado_en: null,
        columnas: [],
        registros: [],
        total: 0,
        limite: 50,
        offset: 0
    };

    renderizarPagina();
}


/*
==========================================================
ESTADOS DE RESULTADO
==========================================================
*/

function crearEstadoInicial() {
    return `
        <div class="reports-initial-state">

            <div class="reports-initial-state__icon">
                ⇩
            </div>

            <h2>
                Genere un reporte
            </h2>

            <p>
                Seleccione el tipo de reporte,
                el periodo y los filtros para
                consultar la información.
            </p>

        </div>
    `;
}


function mostrarCargaResultados() {
    const contenedor =
        obtenerResultados();

    contenedor.innerHTML = `
        <div class="reports-loading">

            <div
                class="initial-loader__spinner"
                aria-hidden="true"
            ></div>

            <p>
                Generando reporte...
            </p>

        </div>
    `;
}


function mostrarErrorResultados(error) {
    const contenedor =
        obtenerResultados();

    contenedor.innerHTML = `
        <div class="reports-error">

            <h2>
                No fue posible generar el reporte
            </h2>

            <p>
                ${escaparHTML(
                    error?.message ||
                    "Ocurrió un error inesperado."
                )}
            </p>

            <button
                id="btn-retry-report"
                class="button button--primary"
                type="button"
            >
                Reintentar
            </button>

        </div>
    `;

    document
        .getElementById(
            "btn-retry-report"
        )
        .addEventListener(
            "click",
            cargarReporte
        );
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


/*
==========================================================
CARGA Y ERROR GENERAL
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
                    Cargando reportes...
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
                    No fue posible abrir reportes
                </h1>

                <p>
                    ${escaparHTML(
                        error?.message ||
                        "Ocurrió un error inesperado."
                    )}
                </p>

                <div class="system-error__actions">

                    <button
                        id="btn-reports-retry"
                        class="button button--primary"
                        type="button"
                    >
                        Reintentar
                    </button>

                    <button
                        id="btn-reports-error-home"
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
            "btn-reports-retry"
        )
        .addEventListener(
            "click",
            mostrarReportes
        );

    document
        .getElementById(
            "btn-reports-error-home"
        )
        .addEventListener(
            "click",
            () => navegar("/inicio")
        );
}


/*
==========================================================
UTILIDADES DE COLUMNAS
==========================================================
*/

function esColumnaFecha(columna) {
    const nombre =
        String(columna || "")
            .toLowerCase();

    return (
        nombre.includes("fecha") ||
        nombre.endsWith("_at") ||
        nombre === "generado_en"
    );
}


function columnaIncluyeHora(columna) {
    const nombre =
        String(columna || "")
            .toLowerCase();

    return (
        nombre.endsWith("_at") ||
        nombre.includes("hora") ||
        nombre === "generado_en"
    );
}


function esColumnaEstado(columna) {
    const nombre =
        String(columna || "")
            .toLowerCase();

    return [
        "estatus",
        "estatus_caso",
        "estado",
        "clasificacion",
        "resultado_visita"
    ].includes(nombre);
}


function esColumnaNumerica(
    columna,
    valor
) {
    if (
        typeof valor === "number"
    ) {
        return true;
    }

    const nombre =
        String(columna || "")
            .toLowerCase();

    return (
        nombre.startsWith("total_") ||
        nombre.includes("cantidad") ||
        nombre.includes("existencia") ||
        nombre.includes("habitantes") ||
        nombre.includes("perros") ||
        nombre.includes("gatos") ||
        nombre.includes("dias_") ||
        nombre.includes("numero_") ||
        nombre.endsWith("_base")
    );
}


function formatearNombreColumna(
    columna
) {
    return String(columna || "")
        .replaceAll("_", " ")
        .replace(
            /(^|\s)\S/g,
            letra =>
                letra.toUpperCase()
        );
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


function obtenerNombreTipoReporte(
    codigo
) {
    const tipo =
        ESTADO.catalogos
            .tipos_reporte
            .find(
                item =>
                    item.codigo ===
                    codigo
            );

    return tipo?.nombre ||
        formatearTextoEstado(
            codigo
        ) ||
        "Reporte";
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


function obtenerResultados() {
    const contenedor =
        document.getElementById(
            "reports-results"
        );

    if (!contenedor) {
        throw new Error(
            "No se encontró el contenedor de resultados."
        );
    }

    return contenedor;
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

    const valor =
        String(
            elemento.value || ""
        ).trim();

    return valor || null;
}


function obtenerArreglo(valor) {
    return Array.isArray(valor)
        ? valor
        : [];
}


function crearFiltrosIniciales() {
    return {
        tipo_reporte: null,

        fecha_inicio:
            fechaInicioAnual(),

        fecha_fin:
            fechaActualISO(),

        jurisdiccion: null,

        programa_id: null,

        tipo_operativo_id: null,

        tipo_actividad_id: null,

        busqueda: null,

        incluir_verificaciones: true
    };
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


function fechaActualISO() {
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
        .slice(0, 10);
}


function fechaInicioAnual() {
    const fecha =
        new Date();

    return `${fecha.getFullYear()}-01-01`;
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


function escaparHTML(valor) {
    const elemento =
        document.createElement("div");

    elemento.textContent =
        String(valor ?? "");

    return elemento.innerHTML;
}