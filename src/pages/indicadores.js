import { CONFIG } from "../../config.js";

import {
    obtenerIndicadores,
    obtenerCasos,
    obtenerOperacion,
    obtenerViviendas,
    obtenerAnimales,
    obtenerVacunacion,
    obtenerEntomologia,
    obtenerVerificaciones,
    obtenerConsumos,
    obtenerActividadesTipo,
    obtenerConsumosProducto,
    obtenerJurisdicciones,
    obtenerTendencia,
    puedeConsultarTodo,
    obtenerJurisdiccionUsuario,
    obtenerFiltros
} from "../services/indicadores.service.js";

import {
    obtenerCatalogosOperativo
} from "../services/operativos.service.js";

import {
    obtenerCookie
} from "../utils/cookies.js";

import {
    navegar
} from "../utils/router.js";

import {
    puedeConsultarEstado
} from "../utils/permisos.js";


const ESTADO = {
    cargando: false,

    respuesta: null,

    usuario: {},

    jurisdicciones: [],

    filtros: {
        fecha_inicio: fechaInicioAnual(),
        fecha_fin: fechaActualISO(),
        jurisdiccion: null
    }
};


/*
==========================================================
INICIO
==========================================================
*/

export async function mostrarIndicadores() {
    document.title =
        `Indicadores | ${CONFIG.APP_NAME}`;

    reiniciarEstado();

    renderizarCargaInicial();

    try {
        await cargarCatalogos();

        await cargarIndicadores();
    } catch (error) {
        renderizarErrorGeneral(error);
    }
}


function reiniciarEstado() {
    ESTADO.cargando = false;
    ESTADO.respuesta = null;
    ESTADO.usuario = {};
    ESTADO.jurisdicciones = [];

    ESTADO.filtros = {
        fecha_inicio:
            fechaInicioAnual(),

        fecha_fin:
            fechaActualISO(),

        jurisdiccion:
            null
    };
}


/*
==========================================================
CATÁLOGOS
==========================================================
*/

async function cargarCatalogos() {
    const token =
        obtenerToken();

    const respuesta =
        await obtenerCatalogosOperativo(
            token
        );

    ESTADO.usuario =
        respuesta?.usuario ||
        respuesta?.contexto ||
        {};

    ESTADO.jurisdicciones =
        obtenerArreglo(
            respuesta.jurisdicciones
        );
}


/*
==========================================================
CARGA DE INDICADORES
==========================================================
*/

async function cargarIndicadores() {
    if (ESTADO.cargando) {
        return;
    }

    ESTADO.cargando = true;

    try {
        ESTADO.respuesta =
            await obtenerIndicadores(
                obtenerToken(),
                ESTADO.filtros
            );

        ajustarJurisdiccionUsuario();

        renderizarPagina();
    } finally {
        ESTADO.cargando = false;
    }
}


function ajustarJurisdiccionUsuario() {
    if (
        puedeConsultarEstado(ESTADO.usuario) &&
        puedeConsultarTodo(
            ESTADO.respuesta
        )
    ) {
        return;
    }

    ESTADO.filtros.jurisdiccion =
        obtenerJurisdiccionUsuario(
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

    const filtrosAplicados =
        obtenerFiltros(
            ESTADO.respuesta
        );

    app.innerHTML = `
        <div class="indicators-page">

            <header class="indicators-header">

                <div>
                    <p class="indicators-header__eyebrow">
                        Análisis operativo
                    </p>

                    <h1>Indicadores</h1>

                    <p>
                        Seguimiento de casos, operativos,
                        viviendas, animales, verificaciones
                        e insumos.
                    </p>
                </div>

                <div class="indicators-header__actions">

                    <button
                        id="btn-indicators-refresh"
                        class="button button--primary"
                        type="button"
                    >
                        Actualizar
                    </button>

                    <button
                        id="btn-indicators-home"
                        class="button button--secondary"
                        type="button"
                    >
                        Volver al inicio
                    </button>

                </div>

            </header>

            <main class="indicators-main">

                ${crearFiltros()}

                <section class="indicators-period">

                    <span>
                        Periodo consultado
                    </span>

                    <strong>
                        ${formatearFecha(
                            filtrosAplicados
                                .fecha_inicio
                        )}
                        al
                        ${formatearFecha(
                            filtrosAplicados
                                .fecha_fin
                        )}
                    </strong>

                </section>

                ${crearResumenGeneral()}

                ${crearSeccionCasos()}

                ${crearSeccionOperacion()}

                ${crearSeccionViviendas()}

                ${crearSeccionEntomologia()}

                ${crearSeccionAnimales()}

                ${crearSeccionVacunacion()}

                ${crearSeccionVerificaciones()}

                ${crearSeccionConsumos()}

                ${crearSeccionActividadesTipo()}

                ${crearSeccionConsumosProducto()}

                ${crearSeccionJurisdicciones()}

                ${crearSeccionTendencia()}

            </main>

        </div>
    `;

    registrarEventos();
}


/*
==========================================================
FILTROS
==========================================================
*/

function crearFiltros() {
    const supervisor =
        puedeConsultarEstado(ESTADO.usuario) &&
        puedeConsultarTodo(
            ESTADO.respuesta
        );

    return `
        <section class="indicators-filters">

            <form id="form-indicators-filters">

                <div class="form-group">

                    <label for="indicator-date-start">
                        Desde
                    </label>

                    <input
                        id="indicator-date-start"
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

                    <label for="indicator-date-end">
                        Hasta
                    </label>

                    <input
                        id="indicator-date-end"
                        type="date"
                        value="${escaparHTML(
                            ESTADO.filtros
                                .fecha_fin ||
                            ""
                        )}"
                        required
                    >

                </div>

                ${
                    supervisor
                        ? crearFiltroJurisdiccion()
                        : crearJurisdiccionFija()
                }

                <div class="indicators-filters__actions">

                    <button
                        class="button button--primary"
                        type="submit"
                    >
                        Consultar
                    </button>

                    <button
                        id="btn-indicators-clear"
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

            <label for="indicator-jurisdiction">
                Jurisdicción
            </label>

            <select id="indicator-jurisdiction">

                <option value="">
                    Todas
                </option>

                ${ESTADO.jurisdicciones
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
        obtenerJurisdiccionUsuario(
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

            <div class="indicators-static-field">

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
RESUMEN GENERAL
==========================================================
*/

function crearResumenGeneral() {
    const casos =
        obtenerCasos(
            ESTADO.respuesta
        );

    const operacion =
        obtenerOperacion(
            ESTADO.respuesta
        );

    const verificaciones =
        obtenerVerificaciones(
            ESTADO.respuesta
        );

    const consumos =
        obtenerConsumos(
            ESTADO.respuesta
        );

    const elementos = [
        {
            etiqueta:
                "Casos",

            valor:
                casos.total,

            clase:
                "blue"
        },
        {
            etiqueta:
                "Confirmados",

            valor:
                casos.confirmados,

            clase:
                "red"
        },
        {
            etiqueta:
                "Operativos",

            valor:
                operacion.operativos,

            clase:
                "green"
        },
        {
            etiqueta:
                "Manzanas",

            valor:
                operacion.manzanas,

            clase:
                "purple"
        },
        {
            etiqueta:
                "Viviendas",

            valor:
                operacion.viviendas,

            clase:
                "orange"
        },
        {
            etiqueta:
                "Verificaciones",

            valor:
                verificaciones.total,

            clase:
                "yellow"
        },
        {
            etiqueta:
                "Actividades",

            valor:
                operacion
                    .actividades_ordinarias,

            clase:
                "blue"
        },
        {
            etiqueta:
                "Consumo total",

            valor:
                formatearDecimal(
                    consumos.cantidad_total
                ),

            clase:
                "green"
        }
    ];

    return `
        <section
            class="indicators-summary"
            aria-label="Resumen general"
        >
            ${elementos.map(
                elemento =>
                    crearTarjetaIndicador(
                        elemento
                    )
            ).join("")}
        </section>
    `;
}


function crearTarjetaIndicador(
    elemento
) {
    return `
        <article
            class="
                indicator-card
                indicator-card--${elemento.clase}
            "
        >

            <span>
                ${escaparHTML(
                    elemento.etiqueta
                )}
            </span>

            <strong>
                ${
                    typeof elemento.valor ===
                    "string"
                        ? escaparHTML(
                            elemento.valor
                        )
                        : formatearEntero(
                            elemento.valor
                        )
                }
            </strong>

        </article>
    `;
}


/*
==========================================================
CASOS
==========================================================
*/

function crearSeccionCasos() {
    const datos =
        obtenerCasos(
            ESTADO.respuesta
        );

    const total =
        numeroSeguro(
            datos.total
        );

    return crearSeccionIndicadores(
        "Casos",
        "Situación epidemiológica del periodo.",
        [
            [
                "Total",
                datos.total
            ],
            [
                "Probables",
                datos.probables
            ],
            [
                "Confirmados",
                datos.confirmados
            ],
            [
                "Descartados",
                datos.descartados
            ],
            [
                "Con operativo",
                datos.con_operativo
            ],
            [
                "Sin operativo",
                datos.sin_operativo
            ]
        ],
        crearBarrasDistribucion([
            {
                etiqueta:
                    "Probables",

                valor:
                    datos.probables,

                total
            },
            {
                etiqueta:
                    "Confirmados",

                valor:
                    datos.confirmados,

                total
            },
            {
                etiqueta:
                    "Descartados",

                valor:
                    datos.descartados,

                total
            }
        ])
    );
}


/*
==========================================================
OPERACIÓN
==========================================================
*/

function crearSeccionOperacion() {
    const datos =
        obtenerOperacion(
            ESTADO.respuesta
        );

    return crearSeccionIndicadores(
        "Operación de campo",
        "Operativos, manzanas, viviendas y actividades.",
        [
            [
                "Operativos",
                datos.operativos
            ],
            [
                "Con caso",
                datos.operativos_con_caso
            ],
            [
                "Sin caso",
                datos.operativos_sin_caso
            ],
            [
                "Activos",
                datos.activos
            ],
            [
                "Finalizados",
                datos.finalizados
            ],
            [
                "Cancelados",
                datos.cancelados
            ],
            [
                "Manzanas",
                datos.manzanas
            ],
            [
                "Viviendas",
                datos.viviendas
            ],
            [
                "Actividades ordinarias",
                datos.actividades_ordinarias
            ],
            [
                "Actividades de verificación",
                datos.actividades_verificacion
            ]
        ],
        crearComparacionDosValores(
            "Actividades ordinarias",
            datos.actividades_ordinarias,
            "Verificaciones",
            datos.actividades_verificacion
        )
    );
}


/*
==========================================================
VIVIENDAS
==========================================================
*/

function crearSeccionViviendas() {
    const datos =
        obtenerViviendas(
            ESTADO.respuesta
        );

    return crearSeccionIndicadores(
        "Viviendas y visitas",
        "Seguimiento de viviendas, primeras visitas y reaperturas.",
        [
            [
                "Viviendas registradas",
                datos.viviendas_registradas
            ],
            [
                "Habitantes",
                datos.habitantes
            ],
            [
                "Perros censados",
                datos.perros_censados
            ],
            [
                "Gatos censados",
                datos.gatos_censados
            ],
            [
                "Visitas",
                datos.visitas
            ],
            [
                "Primeras visitas",
                datos.primeras_visitas
            ],
            [
                "Visitas sucesivas",
                datos.visitas_sucesivas
            ],
            [
                "Reaperturas",
                datos.reaperturas
            ],
            [
                "Visitas de verificación",
                datos.visitas_verificacion
            ],
            [
                "Cerradas",
                datos.cerradas
            ],
            [
                "Deshabitadas",
                datos.deshabitadas
            ],
            [
                "Renuentes",
                datos.renuentes
            ],
            [
                "Habitantes beneficiados",
                datos.habitantes_beneficiados
            ]
        ],
        crearBarrasDistribucion([
            {
                etiqueta:
                    "Primeras visitas",

                valor:
                    datos.primeras_visitas,

                total:
                    datos.visitas
            },
            {
                etiqueta:
                    "Visitas sucesivas",

                valor:
                    datos.visitas_sucesivas,

                total:
                    datos.visitas
            },
            {
                etiqueta:
                    "Verificaciones",

                valor:
                    datos.visitas_verificacion,

                total:
                    datos.visitas
            }
        ])
    );
}


/*
==========================================================
ENTOMOLOGÍA
==========================================================
*/

function crearSeccionEntomologia() {
    const datos =
        obtenerEntomologia(
            ESTADO.respuesta
        );

    const porcentajeViviendas =
        calcularPorcentaje(
            datos.viviendas_con_garrapata,
            datos.viviendas_inspeccionadas
        );

    const porcentajePerros =
        calcularPorcentaje(
            datos.perros_con_garrapata,
            datos.perros_inspeccionados
        );

    const porcentajeGatos =
        calcularPorcentaje(
            datos.gatos_con_garrapata,
            datos.gatos_inspeccionados
        );

    return crearSeccionIndicadores(
        "Encuesta entomológica",
        "Resultados de actividades ordinarias y verificaciones.",
        [
            [
                "Viviendas inspeccionadas",
                datos.viviendas_inspeccionadas
            ],
            [
                "Viviendas con garrapata",
                datos.viviendas_con_garrapata
            ],
            [
                "% viviendas positivas",
                formatearPorcentaje(
                    porcentajeViviendas
                )
            ],
            [
                "Perros inspeccionados",
                datos.perros_inspeccionados
            ],
            [
                "Perros con garrapata",
                datos.perros_con_garrapata
            ],
            [
                "% perros positivos",
                formatearPorcentaje(
                    porcentajePerros
                )
            ],
            [
                "Gatos inspeccionados",
                datos.gatos_inspeccionados
            ],
            [
                "Gatos con garrapata",
                datos.gatos_con_garrapata
            ],
            [
                "% gatos positivos",
                formatearPorcentaje(
                    porcentajeGatos
                )
            ],
            [
                "Garrapatas en vivienda",
                datos.garrapatas_vivienda
            ],
            [
                "Garrapatas en perros",
                datos.garrapatas_perros
            ],
            [
                "Garrapatas en gatos",
                datos.garrapatas_gatos
            ],
            [
                "Verificación: viviendas inspeccionadas",
                datos
                    .verificacion_viviendas_inspeccionadas
            ],
            [
                "Verificación: viviendas positivas",
                datos
                    .verificacion_viviendas_con_garrapata
            ],
            [
                "Verificación: perros inspeccionados",
                datos
                    .verificacion_perros_inspeccionados
            ],
            [
                "Verificación: perros positivos",
                datos
                    .verificacion_perros_con_garrapata
            ],
            [
                "Verificación: gatos inspeccionados",
                datos
                    .verificacion_gatos_inspeccionados
            ],
            [
                "Verificación: gatos positivos",
                datos
                    .verificacion_gatos_con_garrapata
            ]
        ],
        crearComparacionEntomologica(
            datos
        )
    );
}


/*
==========================================================
ANIMALES
==========================================================
*/

function crearSeccionAnimales() {
    const datos =
        obtenerAnimales(
            ESTADO.respuesta
        );

    return crearSeccionIndicadores(
        "Animales intervenidos",
        "Animales tratados en actividad ordinaria y verificación.",
        [
            [
                "Total",
                datos.total
            ],
            [
                "Perros",
                datos.perros
            ],
            [
                "Gatos",
                datos.gatos
            ],
            [
                "Actividad ordinaria",
                datos.actividad_ordinaria
            ],
            [
                "Verificación",
                datos.verificacion
            ]
        ],
        crearComparacionDosValores(
            "Perros",
            datos.perros,
            "Gatos",
            datos.gatos
        )
    );
}



/*
==========================================================
VACUNACIÓN
==========================================================
*/

function crearSeccionVacunacion() {
    const datos =
        obtenerVacunacion(
            ESTADO.respuesta
        );

    return crearSeccionIndicadores(
        "Vacunación",
        "Folios aplicados y lotes de vacuna utilizados.",
        [
            ["Actividades", datos.actividades],
            ["Folios aplicados", datos.folios],
            ["Rangos registrados", datos.rangos],
            ["Lotes utilizados", datos.lotes_utilizados],
            ["Perros vacunados", datos.perros_vacunados],
            ["Gatos vacunados", datos.gatos_vacunados]
        ],
        crearComparacionDosValores(
            "Perros vacunados",
            datos.perros_vacunados,
            "Gatos vacunados",
            datos.gatos_vacunados
        )
    );
}


/*
==========================================================
VERIFICACIONES
==========================================================
*/

function crearSeccionVerificaciones() {
    const datos =
        obtenerVerificaciones(
            ESTADO.respuesta
        );

    return crearSeccionIndicadores(
        "Verificaciones",
        "Primera verificación y verificaciones adicionales.",
        [
            [
                "Total",
                datos.total
            ],
            [
                "Programadas",
                datos.programadas
            ],
            [
                "En proceso",
                datos.en_proceso
            ],
            [
                "Completadas",
                datos.completadas
            ],
            [
                "Canceladas",
                datos.canceladas
            ],
            [
                "Vencidas",
                datos.vencidas
            ],
            [
                "Primera verificación",
                datos.primera_verificacion
            ],
            [
                "Verificaciones adicionales",
                datos.verificaciones_adicionales
            ]
        ],
        crearBarrasDistribucion([
            {
                etiqueta:
                    "Programadas",

                valor:
                    datos.programadas,

                total:
                    datos.total
            },
            {
                etiqueta:
                    "En proceso",

                valor:
                    datos.en_proceso,

                total:
                    datos.total
            },
            {
                etiqueta:
                    "Completadas",

                valor:
                    datos.completadas,

                total:
                    datos.total
            },
            {
                etiqueta:
                    "Vencidas",

                valor:
                    datos.vencidas,

                total:
                    datos.total
            }
        ])
    );
}


/*
==========================================================
CONSUMOS
==========================================================
*/

function crearSeccionConsumos() {
    const datos =
        obtenerConsumos(
            ESTADO.respuesta
        );

    return crearSeccionIndicadores(
        "Consumo de insumos",
        "Consumo en actividades ordinarias y verificaciones.",
        [
            [
                "Registros de consumo",
                datos.registros
            ],
            [
                "Cantidad total",
                formatearDecimal(
                    datos.cantidad_total
                )
            ],
            [
                "Actividad ordinaria",
                formatearDecimal(
                    datos.actividad_ordinaria
                )
            ],
            [
                "Verificación",
                formatearDecimal(
                    datos.verificacion
                )
            ],
            [
                "Lotes utilizados",
                datos.lotes_utilizados
            ],
            [
                "Productos utilizados",
                datos.productos_utilizados
            ]
        ],
        crearComparacionDosValores(
            "Actividad ordinaria",
            datos.actividad_ordinaria,
            "Verificación",
            datos.verificacion,
            true
        )
    );
}


/*
==========================================================
SECCIÓN GENÉRICA
==========================================================
*/

function crearSeccionIndicadores(
    titulo,
    descripcion,
    elementos,
    visualizacion = ""
) {
    return `
        <section class="indicator-section">

            <header class="indicator-section__header">

                <div>
                    <h2>
                        ${escaparHTML(titulo)}
                    </h2>

                    <p>
                        ${escaparHTML(descripcion)}
                    </p>
                </div>

            </header>

            <div class="indicator-section__content">

                <div class="indicator-metric-grid">

                    ${elementos.map(
                        ([etiqueta, valor]) =>
                            crearMetrica(
                                etiqueta,
                                valor
                            )
                    ).join("")}

                </div>

                ${
                    visualizacion
                        ? `
                            <div class="indicator-visual">
                                ${visualizacion}
                            </div>
                        `
                        : ""
                }

            </div>

        </section>
    `;
}


function crearMetrica(
    etiqueta,
    valor
) {
    const valorFinal =
        typeof valor === "string"
            ? valor
            : formatearEntero(
                valor
            );

    return `
        <article class="indicator-metric">

            <span>
                ${escaparHTML(etiqueta)}
            </span>

            <strong>
                ${escaparHTML(
                    valorFinal
                )}
            </strong>

        </article>
    `;
}


/*
==========================================================
ACTIVIDADES POR TIPO
==========================================================
*/

function crearSeccionActividadesTipo() {
    const registros =
        obtenerActividadesTipo(
            ESTADO.respuesta
        );

    return `
        <section class="indicator-section">

            <header class="indicator-section__header">

                <div>
                    <h2>
                        Actividades por tipo
                    </h2>

                    <p>
                        Actividades ordinarias y verificaciones
                        separadas por tipo.
                    </p>
                </div>

            </header>

            <div class="indicator-table-wrapper">

                ${
                    registros.length === 0
                        ? crearEstadoVacio(
                            "No hay actividades en el periodo."
                        )
                        : `
                            <table class="indicator-table">

                                <thead>
                                    <tr>
                                        <th>Actividad</th>
                                        <th>Ordinarias</th>
                                        <th>Verificaciones</th>
                                        <th>Total</th>
                                        <th>Distribución</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    ${registros.map(
                                        actividad => `
                                            <tr>

                                                <td>
                                                    <strong>
                                                        ${escaparHTML(
                                                            actividad.actividad
                                                        )}
                                                    </strong>

                                                    <small>
                                                        ${escaparHTML(
                                                            actividad.codigo ||
                                                            ""
                                                        )}
                                                    </small>
                                                </td>

                                                <td>
                                                    ${formatearEntero(
                                                        actividad.ordinarias
                                                    )}
                                                </td>

                                                <td>
                                                    ${formatearEntero(
                                                        actividad.verificaciones
                                                    )}
                                                </td>

                                                <td>
                                                    ${formatearEntero(
                                                        actividad.total
                                                    )}
                                                </td>

                                                <td>
                                                    ${crearBarraTabla(
                                                        actividad.ordinarias,
                                                        actividad.total
                                                    )}
                                                </td>

                                            </tr>
                                        `
                                    ).join("")}

                                </tbody>

                            </table>
                        `
                }

            </div>

        </section>
    `;
}


/*
==========================================================
CONSUMO POR PRODUCTO
==========================================================
*/

function crearSeccionConsumosProducto() {
    const registros =
        obtenerConsumosProducto(
            ESTADO.respuesta
        );

    const maximo =
        Math.max(
            ...registros.map(
                item =>
                    numeroSeguro(
                        item.cantidad
                    )
            ),
            0
        );

    return `
        <section class="indicator-section">

            <header class="indicator-section__header">

                <div>
                    <h2>
                        Consumo por producto
                    </h2>

                    <p>
                        Productos utilizados en el periodo.
                    </p>
                </div>

            </header>

            <div class="indicator-ranking">

                ${
                    registros.length === 0
                        ? crearEstadoVacio(
                            "No hay consumos registrados."
                        )
                        : registros.map(
                            (
                                item,
                                indice
                            ) => `
                                <article class="indicator-ranking__item">

                                    <span class="indicator-ranking__position">
                                        ${indice + 1}
                                    </span>

                                    <div class="indicator-ranking__content">

                                        <div class="indicator-ranking__header">

                                            <div>
                                                <strong>
                                                    ${escaparHTML(
                                                        item.producto
                                                    )}
                                                </strong>

                                                <small>
                                                    ${escaparHTML(
                                                        item.codigo_producto ||
                                                        ""
                                                    )}
                                                </small>
                                            </div>

                                            <span>
                                                ${formatearDecimal(
                                                    item.cantidad
                                                )}
                                                ${escaparHTML(
                                                    item.unidad ||
                                                    ""
                                                )}
                                            </span>

                                        </div>

                                        <div class="indicator-progress">

                                            <span
                                                style="
                                                    width:
                                                    ${calcularPorcentaje(
                                                        item.cantidad,
                                                        maximo
                                                    )}%;
                                                "
                                            ></span>

                                        </div>

                                    </div>

                                </article>
                            `
                        ).join("")
                }

            </div>

        </section>
    `;
}


/*
==========================================================
JURISDICCIONES
==========================================================
*/

function crearSeccionJurisdicciones() {
    const registros =
        obtenerJurisdicciones(
            ESTADO.respuesta
        );

    return `
        <section class="indicator-section">

            <header class="indicator-section__header">

                <div>
                    <h2>
                        Resultados por jurisdicción
                    </h2>

                    <p>
                        Comparativo operativo del periodo consultado.
                    </p>
                </div>

            </header>

            <div class="indicator-table-wrapper">

                ${
                    registros.length === 0
                        ? crearEstadoVacio(
                            "No hay información por jurisdicción."
                        )
                        : `
                            <table class="indicator-table indicator-table--wide">

                                <thead>
                                    <tr>
                                        <th>Jurisdicción</th>
                                        <th>Casos</th>
                                        <th>Confirmados</th>
                                        <th>Operativos</th>
                                        <th>Manzanas</th>
                                        <th>Viviendas</th>
                                        <th>Actividades</th>
                                        <th>Verificaciones</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    ${registros.map(
                                        item => `
                                            <tr>

                                                <td>
                                                    <strong>
                                                        ${escaparHTML(
                                                            item.cve_jur_res
                                                        )}
                                                        -
                                                        ${escaparHTML(
                                                            item.nombre_jurisdiccion
                                                        )}
                                                    </strong>
                                                </td>

                                                <td>
                                                    ${formatearEntero(
                                                        item.casos
                                                    )}
                                                </td>

                                                <td>
                                                    ${formatearEntero(
                                                        item.confirmados
                                                    )}
                                                </td>

                                                <td>
                                                    ${formatearEntero(
                                                        item.operativos
                                                    )}
                                                </td>

                                                <td>
                                                    ${formatearEntero(
                                                        item.manzanas
                                                    )}
                                                </td>

                                                <td>
                                                    ${formatearEntero(
                                                        item.viviendas
                                                    )}
                                                </td>

                                                <td>
                                                    ${formatearEntero(
                                                        item.actividades
                                                    )}
                                                </td>

                                                <td>
                                                    ${formatearEntero(
                                                        item.verificaciones
                                                    )}
                                                </td>

                                            </tr>
                                        `
                                    ).join("")}

                                </tbody>

                            </table>
                        `
                }

            </div>

        </section>
    `;
}


/*
==========================================================
TENDENCIA MENSUAL
==========================================================
*/

function crearSeccionTendencia() {
    const registros =
        obtenerTendencia(
            ESTADO.respuesta
        );

    const maximo =
        Math.max(
            ...registros.flatMap(
                item => [
                    numeroSeguro(
                        item.casos
                    ),
                    numeroSeguro(
                        item.operativos
                    ),
                    numeroSeguro(
                        item.actividades
                    ),
                    numeroSeguro(
                        item.verificaciones
                    )
                ]
            ),
            0
        );

    return `
        <section class="indicator-section">

            <header class="indicator-section__header">

                <div>
                    <h2>
                        Tendencia mensual
                    </h2>

                    <p>
                        Casos, operativos, actividades y
                        verificaciones por mes.
                    </p>
                </div>

            </header>

            <div class="monthly-chart">

                ${
                    registros.length === 0
                        ? crearEstadoVacio(
                            "No hay información mensual."
                        )
                        : registros.map(
                            item =>
                                crearGrupoMensual(
                                    item,
                                    maximo
                                )
                        ).join("")
                }

            </div>

            <div class="indicator-legend">

                <span>
                    <i class="legend-color legend-color--cases"></i>
                    Casos
                </span>

                <span>
                    <i class="legend-color legend-color--operations"></i>
                    Operativos
                </span>

                <span>
                    <i class="legend-color legend-color--activities"></i>
                    Actividades
                </span>

                <span>
                    <i class="legend-color legend-color--checks"></i>
                    Verificaciones
                </span>

            </div>

        </section>
    `;
}


function crearGrupoMensual(
    item,
    maximo
) {
    return `
        <article class="monthly-chart__group">

            <div class="monthly-chart__bars">

                ${crearBarraMensual(
                    item.casos,
                    maximo,
                    "cases",
                    "Casos"
                )}

                ${crearBarraMensual(
                    item.operativos,
                    maximo,
                    "operations",
                    "Operativos"
                )}

                ${crearBarraMensual(
                    item.actividades,
                    maximo,
                    "activities",
                    "Actividades"
                )}

                ${crearBarraMensual(
                    item.verificaciones,
                    maximo,
                    "checks",
                    "Verificaciones"
                )}

            </div>

            <span class="monthly-chart__label">
                ${escaparHTML(
                    formatearMes(
                        item.mes
                    )
                )}
            </span>

        </article>
    `;
}


function crearBarraMensual(
    valor,
    maximo,
    clase,
    etiqueta
) {
    const porcentaje =
        calcularPorcentaje(
            valor,
            maximo
        );

    return `
        <div
            class="
                monthly-chart__bar
                monthly-chart__bar--${clase}
            "
            style="
                height:
                ${Math.max(
                    porcentaje,
                    numeroSeguro(valor) > 0
                        ? 4
                        : 0
                )}%;
            "
            title="${escaparHTML(
                `${etiqueta}: ${formatearEntero(valor)}`
            )}"
        >
            <span>
                ${formatearEntero(valor)}
            </span>
        </div>
    `;
}


/*
==========================================================
VISUALIZACIONES
==========================================================
*/

function crearBarrasDistribucion(
    elementos
) {
    return `
        <div class="indicator-bars">

            ${elementos.map(item => {

                const porcentaje =
                    calcularPorcentaje(
                        item.valor,
                        item.total
                    );

                return `
                    <div class="indicator-bars__item">

                        <div class="indicator-bars__header">

                            <span>
                                ${escaparHTML(
                                    item.etiqueta
                                )}
                            </span>

                            <strong>
                                ${formatearEntero(
                                    item.valor
                                )}
                                ·
                                ${formatearPorcentaje(
                                    porcentaje
                                )}
                            </strong>

                        </div>

                        <div class="indicator-progress">

                            <span
                                style="
                                    width:
                                    ${porcentaje}%;
                                "
                            ></span>

                        </div>

                    </div>
                `;
            }).join("")}

        </div>
    `;
}


function crearComparacionDosValores(
    etiquetaA,
    valorA,
    etiquetaB,
    valorB,
    decimal = false
) {
    const total =
        numeroSeguro(valorA) +
        numeroSeguro(valorB);

    const formato =
        decimal
            ? formatearDecimal
            : formatearEntero;

    return `
        <div class="indicator-comparison">

            <article>
                <span>
                    ${escaparHTML(
                        etiquetaA
                    )}
                </span>

                <strong>
                    ${formato(valorA)}
                </strong>

                <small>
                    ${formatearPorcentaje(
                        calcularPorcentaje(
                            valorA,
                            total
                        )
                    )}
                </small>
            </article>

            <article>
                <span>
                    ${escaparHTML(
                        etiquetaB
                    )}
                </span>

                <strong>
                    ${formato(valorB)}
                </strong>

                <small>
                    ${formatearPorcentaje(
                        calcularPorcentaje(
                            valorB,
                            total
                        )
                    )}
                </small>
            </article>

        </div>
    `;
}


function crearComparacionEntomologica(
    datos
) {
    return `
        <div class="indicator-comparison indicator-comparison--three">

            <article>

                <span>
                    Viviendas positivas
                </span>

                <strong>
                    ${formatearPorcentaje(
                        calcularPorcentaje(
                            datos.viviendas_con_garrapata,
                            datos.viviendas_inspeccionadas
                        )
                    )}
                </strong>

            </article>

            <article>

                <span>
                    Perros positivos
                </span>

                <strong>
                    ${formatearPorcentaje(
                        calcularPorcentaje(
                            datos.perros_con_garrapata,
                            datos.perros_inspeccionados
                        )
                    )}
                </strong>

            </article>

            <article>

                <span>
                    Gatos positivos
                </span>

                <strong>
                    ${formatearPorcentaje(
                        calcularPorcentaje(
                            datos.gatos_con_garrapata,
                            datos.gatos_inspeccionados
                        )
                    )}
                </strong>

            </article>

        </div>
    `;
}


function crearBarraTabla(
    valor,
    total
) {
    const porcentaje =
        calcularPorcentaje(
            valor,
            total
        );

    return `
        <div
            class="table-progress"
            title="${formatearPorcentaje(
                porcentaje
            )}"
        >
            <span
                style="
                    width:
                    ${porcentaje}%;
                "
            ></span>
        </div>
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
            "btn-indicators-home"
        )
        .addEventListener(
            "click",
            () => navegar("/inicio")
        );

    document
        .getElementById(
            "btn-indicators-refresh"
        )
        .addEventListener(
            "click",
            procesarActualizacion
        );

    document
        .getElementById(
            "form-indicators-filters"
        )
        .addEventListener(
            "submit",
            procesarFiltros
        );

    document
        .getElementById(
            "btn-indicators-clear"
        )
        .addEventListener(
            "click",
            restablecerFiltros
        );
}


async function procesarActualizacion() {
    const boton =
        document.getElementById(
            "btn-indicators-refresh"
        );

    bloquearBoton(
        boton,
        true,
        "Actualizando..."
    );

    try {
        await cargarIndicadores();
    } catch (error) {
        mostrarErrorTemporal(
            error.message
        );

        bloquearBoton(
            boton,
            false,
            "Actualizar"
        );
    }
}


async function procesarFiltros(
    evento
) {
    evento.preventDefault();

    const fechaInicio =
        obtenerValor(
            "indicator-date-start"
        );

    const fechaFin =
        obtenerValor(
            "indicator-date-end"
        );

    if (!fechaInicio || !fechaFin) {
        mostrarErrorTemporal(
            "Seleccione ambas fechas."
        );

        return;
    }

    if (fechaFin < fechaInicio) {
        mostrarErrorTemporal(
            "La fecha final no puede ser anterior a la fecha inicial."
        );

        return;
    }

    ESTADO.filtros = {
        fecha_inicio:
            fechaInicio,

        fecha_fin:
            fechaFin,

        jurisdiccion:
            puedeConsultarTodo(
                ESTADO.respuesta
            )
                ? obtenerValor(
                    "indicator-jurisdiction"
                )
                : obtenerJurisdiccionUsuario(
                    ESTADO.respuesta
                )
    };

    renderizarCargaInicial();

    try {
        await cargarIndicadores();
    } catch (error) {
        renderizarErrorGeneral(
            error
        );
    }
}


async function restablecerFiltros() {
    ESTADO.filtros = {
        fecha_inicio:
            fechaInicioAnual(),

        fecha_fin:
            fechaActualISO(),

        jurisdiccion:
            puedeConsultarTodo(
                ESTADO.respuesta
            )
                ? null
                : obtenerJurisdiccionUsuario(
                    ESTADO.respuesta
                )
    };

    renderizarCargaInicial();

    try {
        await cargarIndicadores();
    } catch (error) {
        renderizarErrorGeneral(
            error
        );
    }
}


/*
==========================================================
CARGA Y ERRORES
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
                    Cargando indicadores...
                </p>

            </div>

        </main>
    `;
}


function renderizarErrorGeneral(
    error
) {
    obtenerApp().innerHTML = `
        <main class="system-error">

            <section class="system-error__card">

                <h1>
                    No fue posible cargar los indicadores
                </h1>

                <p>
                    ${escaparHTML(
                        error?.message ||
                        "Ocurrió un error inesperado."
                    )}
                </p>

                <div class="system-error__actions">

                    <button
                        id="btn-indicators-retry"
                        class="button button--primary"
                        type="button"
                    >
                        Reintentar
                    </button>

                    <button
                        id="btn-indicators-error-home"
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
            "btn-indicators-retry"
        )
        .addEventListener(
            "click",
            mostrarIndicadores
        );

    document
        .getElementById(
            "btn-indicators-error-home"
        )
        .addEventListener(
            "click",
            () => navegar("/inicio")
        );
}


function mostrarErrorTemporal(
    mensaje
) {
    window.alert(
        mensaje ||
        "Ocurrió un error inesperado."
    );
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


function numeroSeguro(valor) {
    const numero =
        Number(valor);

    return Number.isFinite(numero)
        ? numero
        : 0;
}


function calcularPorcentaje(
    valor,
    total
) {
    const valorNumerico =
        numeroSeguro(valor);

    const totalNumerico =
        numeroSeguro(total);

    if (totalNumerico <= 0) {
        return 0;
    }

    return Math.min(
        Math.max(
            (
                valorNumerico /
                totalNumerico
            ) * 100,
            0
        ),
        100
    );
}


function formatearEntero(valor) {
    return new Intl.NumberFormat(
        "es-MX",
        {
            maximumFractionDigits: 0
        }
    ).format(
        numeroSeguro(valor)
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
        numeroSeguro(valor)
    );
}


function formatearPorcentaje(valor) {
    return `${new Intl.NumberFormat(
        "es-MX",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1
        }
    ).format(
        numeroSeguro(valor)
    )}%`;
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


function formatearMes(valor) {
    if (!valor) {
        return "";
    }

    const fecha =
        new Date(
            `${valor}-01T12:00:00`
        );

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return valor;
    }

    return new Intl.DateTimeFormat(
        "es-MX",
        {
            month: "short",
            year: "2-digit"
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


function crearEstadoVacio(
    mensaje
) {
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