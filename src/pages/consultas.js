import { CONFIG } from "../../config.js";

import {
    consultarCasos,
    consultarOperativos,
    consultarDetalleOperativo,
    consultarInventario,
    consultarVerificaciones,
    crearVerificacionAdicional,
    iniciarVerificacion,
    finalizarVerificacion,
    calcularPaginacion
} from "../services/consultas.service.js";

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
    pestaña: "casos",

    cargando: false,

    catalogos: {
        programas: [],
        tipos_operativo: [],
        jurisdicciones: []
    },

    casos: {
        registros: [],
        total: 0,
        limite: 20,
        offset: 0,
        filtros: crearFiltrosCasos()
    },

    operativos: {
        registros: [],
        total: 0,
        limite: 20,
        offset: 0,
        filtros: crearFiltrosOperativos()
    },

    inventario: {
        registros: [],
        total: 0,
        limite: 50,
        offset: 0,
        filtros: crearFiltrosInventario()
    },

    verificaciones: {
        registros: [],
        filtros: crearFiltrosVerificaciones()
    },

    detalleOperativo: null
};


/*
==========================================================
INICIO
==========================================================
*/

/**
 * Abre el módulo principal de consultas.
 *
 * @returns {Promise<void>}
 */
export async function mostrarConsultas() {
    document.title = `Consultas | ${CONFIG.APP_NAME}`;

    reiniciarEstado();

    renderizarCargaInicial();

    try {
        await cargarCatalogos();

        renderizarPagina();

        await cargarPestañaActual();
    } catch (error) {
        renderizarErrorGeneral(error);
    }
}


/**
 * Restablece filtros y resultados.
 */
function reiniciarEstado() {
    ESTADO.pestaña = "casos";
    ESTADO.cargando = false;
    ESTADO.detalleOperativo = null;

    ESTADO.casos = {
        registros: [],
        total: 0,
        limite: 20,
        offset: 0,
        filtros: crearFiltrosCasos()
    };

    ESTADO.operativos = {
        registros: [],
        total: 0,
        limite: 20,
        offset: 0,
        filtros: crearFiltrosOperativos()
    };

    ESTADO.inventario = {
        registros: [],
        total: 0,
        limite: 50,
        offset: 0,
        filtros: crearFiltrosInventario()
    };

    ESTADO.verificaciones = {
        registros: [],
        filtros: crearFiltrosVerificaciones()
    };
}


/**
 * Obtiene catálogos compartidos.
 */
async function cargarCatalogos() {
    const respuesta = await obtenerCatalogosOperativo(
        obtenerToken()
    );

    ESTADO.catalogos = {
        programas: obtenerArreglo(
            respuesta.programas
        ),

        tipos_operativo: obtenerArreglo(
            respuesta.tipos_operativo
        ),

        jurisdicciones: obtenerArreglo(
            respuesta.jurisdicciones
        )
    };
}


/*
==========================================================
ESTRUCTURA PRINCIPAL
==========================================================
*/

function renderizarPagina() {
    const app = obtenerApp();

    app.innerHTML = `
        <div class="query-page">

            <header class="query-header">
                <div>
                    <p class="query-header__eyebrow">
                        Consulta operativa
                    </p>

                    <h1>Consultar información</h1>

                    <p>
                        Casos, operativos, inventarios y
                        verificaciones autorizadas.
                    </p>
                </div>

                <div class="query-header__actions">
                    <button
                        id="btn-nuevo-operativo-consultas"
                        class="button button--primary"
                        type="button"
                    >
                        Registrar operativo
                    </button>

                    <button
                        id="btn-inicio-consultas"
                        class="button button--secondary"
                        type="button"
                    >
                        Volver al inicio
                    </button>
                </div>
            </header>

            <main class="query-main">

                ${crearPestañas()}

                <section
                    id="query-content"
                    class="query-content"
                >
                    ${crearCargaContenido()}
                </section>

            </main>

            <div
                id="query-modal-root"
                class="modal-root"
            ></div>

        </div>
    `;

    registrarEventosPagina();
}


function crearPestañas() {
    const pestañas = [
        {
            id: "casos",
            texto: "Casos"
        },
        {
            id: "operativos",
            texto: "Operativos"
        },
        {
            id: "inventario",
            texto: "Inventario"
        },
        {
            id: "verificaciones",
            texto: "Verificaciones"
        }
    ];

    return `
        <nav
            class="query-tabs"
            aria-label="Tipos de consulta"
        >
            ${pestañas.map(pestaña => `
                <button
                    class="query-tab ${
                        ESTADO.pestaña === pestaña.id
                            ? "is-active"
                            : ""
                    }"
                    type="button"
                    data-query-tab="${pestaña.id}"
                >
                    ${escaparHTML(pestaña.texto)}
                </button>
            `).join("")}
        </nav>
    `;
}


function registrarEventosPagina() {
    document
        .getElementById("btn-inicio-consultas")
        .addEventListener(
            "click",
            () => navegar("/inicio")
        );

    document
        .getElementById(
            "btn-nuevo-operativo-consultas"
        )
        .addEventListener(
            "click",
            () => navegar("/operativos/nuevo")
        );

    document
        .querySelectorAll("[data-query-tab]")
        .forEach(boton => {
            boton.addEventListener(
                "click",
                async () => {
                    const pestaña =
                        boton.dataset.queryTab;

                    if (
                        pestaña === ESTADO.pestaña ||
                        ESTADO.cargando
                    ) {
                        return;
                    }

                    ESTADO.pestaña = pestaña;

                    actualizarPestañas();

                    await cargarPestañaActual();
                }
            );
        });
}


function actualizarPestañas() {
    document
        .querySelectorAll("[data-query-tab]")
        .forEach(boton => {
            boton.classList.toggle(
                "is-active",
                boton.dataset.queryTab ===
                    ESTADO.pestaña
            );
        });
}


/*
==========================================================
CARGA DE PESTAÑAS
==========================================================
*/

async function cargarPestañaActual() {
    if (ESTADO.cargando) {
        return;
    }

    ESTADO.cargando = true;

    mostrarCargaContenido();

    try {
        switch (ESTADO.pestaña) {
            case "casos":
                await cargarCasos();
                break;

            case "operativos":
                await cargarOperativos();
                break;

            case "inventario":
                await cargarInventario();
                break;

            case "verificaciones":
                await cargarVerificaciones();
                break;

            default:
                ESTADO.pestaña = "casos";
                await cargarCasos();
        }
    } catch (error) {
        mostrarErrorContenido(error);
    } finally {
        ESTADO.cargando = false;
    }
}


/*
==========================================================
CASOS
==========================================================
*/

async function cargarCasos() {
    const estado = ESTADO.casos;

    const respuesta = await consultarCasos(
        obtenerToken(),
        {
            ...estado.filtros,
            limite: estado.limite,
            offset: estado.offset
        }
    );

    estado.registros = respuesta.casos;
    estado.total = respuesta.total;
    estado.limite = respuesta.limite;
    estado.offset = respuesta.offset;

    renderizarCasos();
}


function renderizarCasos() {
    const estado = ESTADO.casos;
    const contenido = obtenerContenido();

    contenido.innerHTML = `
        <div class="query-panel">

            <div class="query-panel__heading">
                <div>
                    <h2>Casos</h2>

                    <p>
                        ${formatearEntero(estado.total)}
                        registro(s) encontrado(s).
                    </p>
                </div>
            </div>

            ${crearFiltrosCasosHTML()}

            <div class="query-table-wrapper">
                ${crearTablaCasos()}
            </div>

            ${crearPaginacionHTML(
                estado.total,
                estado.limite,
                estado.offset,
                "casos"
            )}

        </div>
    `;

    registrarEventosCasos();
}


function crearFiltrosCasosHTML() {
    const filtros = ESTADO.casos.filtros;

    return `
        <form
            id="form-filtros-casos"
            class="query-filters"
        >
            <div class="form-group">
                <label for="casos-busqueda">
                    Buscar
                </label>

                <input
                    id="casos-busqueda"
                    type="search"
                    value="${escaparHTML(
                        filtros.busqueda || ""
                    )}"
                    placeholder="Folio, paciente, municipio..."
                >
            </div>

            ${crearFiltroJurisdiccion(
                "casos-jurisdiccion",
                filtros.jurisdiccion
            )}

            <div class="form-group">
                <label for="casos-clasificacion">
                    Clasificación
                </label>

                <select id="casos-clasificacion">
                    <option value="">
                        Todas
                    </option>

                    <option
                        value="PROBABLE"
                        ${
                            filtros.clasificacion ===
                            "PROBABLE"
                                ? "selected"
                                : ""
                        }
                    >
                        Probable
                    </option>

                    <option
                        value="CONFIRMADO"
                        ${
                            filtros.clasificacion ===
                            "CONFIRMADO"
                                ? "selected"
                                : ""
                        }
                    >
                        Confirmado
                    </option>
                </select>
            </div>

            ${crearCamposFechas(
                "casos",
                filtros.fecha_inicio,
                filtros.fecha_fin
            )}

            <div class="query-filters__actions">
                <button
                    class="button button--primary"
                    type="submit"
                >
                    Consultar
                </button>

                <button
                    id="btn-limpiar-casos"
                    class="button button--secondary"
                    type="button"
                >
                    Limpiar
                </button>
            </div>
        </form>
    `;
}


function crearTablaCasos() {
    const registros = ESTADO.casos.registros;

    if (registros.length === 0) {
        return crearEstadoVacio(
            "No se encontraron casos."
        );
    }

    return `
        <table class="query-table">
            <thead>
                <tr>
                    <th>Folio</th>
                    <th>Paciente</th>
                    <th>Jurisdicción</th>
                    <th>Municipio</th>
                    <th>Clasificación</th>
                    <th>Fecha</th>
                    <th>Operativos</th>
                    <th>Manzanas</th>
                    <th>Viviendas</th>
                </tr>
            </thead>

            <tbody>
                ${registros.map(caso => `
                    <tr>
                        <td>
                            <strong>
                                ${escaparHTML(
                                    caso.folio_caso
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escaparHTML(
                                caso.nombre || "Sin nombre"
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                caso.cve_jur_res || ""
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                caso.municipio || ""
                            )}
                        </td>

                        <td>
                            ${crearEtiquetaEstado(
                                caso.clasificacion
                            )}
                        </td>

                        <td>
                            ${formatearFecha(
                                caso.fec_captura
                            )}
                        </td>

                        <td>
                            ${formatearEntero(
                                caso.total_operativos
                            )}
                        </td>

                        <td>
                            ${formatearEntero(
                                caso.total_manzanas
                            )}
                        </td>

                        <td>
                            ${formatearEntero(
                                caso.total_viviendas
                            )}
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}


function registrarEventosCasos() {
    document
        .getElementById("form-filtros-casos")
        .addEventListener(
            "submit",
            async evento => {
                evento.preventDefault();

                guardarFiltrosCasos();

                ESTADO.casos.offset = 0;

                await cargarPestañaActual();
            }
        );

    document
        .getElementById("btn-limpiar-casos")
        .addEventListener(
            "click",
            async () => {
                ESTADO.casos.filtros =
                    crearFiltrosCasos();

                ESTADO.casos.offset = 0;

                await cargarPestañaActual();
            }
        );

    registrarEventosPaginacion("casos");
}


function guardarFiltrosCasos() {
    ESTADO.casos.filtros = {
        busqueda:
            obtenerValor("casos-busqueda"),

        jurisdiccion:
            obtenerValor("casos-jurisdiccion"),

        clasificacion:
            obtenerValor("casos-clasificacion"),

        fecha_inicio:
            obtenerValor("casos-fecha-inicio"),

        fecha_fin:
            obtenerValor("casos-fecha-fin")
    };
}


/*
==========================================================
OPERATIVOS
==========================================================
*/

async function cargarOperativos() {
    const estado = ESTADO.operativos;

    const respuesta = await consultarOperativos(
        obtenerToken(),
        {
            ...estado.filtros,
            limite: estado.limite,
            offset: estado.offset
        }
    );

    estado.registros = respuesta.operativos;
    estado.total = respuesta.total;
    estado.limite = respuesta.limite;
    estado.offset = respuesta.offset;

    renderizarOperativos();
}


function renderizarOperativos() {
    const estado = ESTADO.operativos;
    const contenido = obtenerContenido();

    contenido.innerHTML = `
        <div class="query-panel">

            <div class="query-panel__heading">
                <div>
                    <h2>Operativos</h2>

                    <p>
                        ${formatearEntero(estado.total)}
                        registro(s) encontrado(s).
                    </p>
                </div>

                <button
                    id="btn-nuevo-operativo-tabla"
                    class="button button--primary"
                    type="button"
                >
                    Registrar operativo
                </button>
            </div>

            ${crearFiltrosOperativosHTML()}

            <div class="query-table-wrapper">
                ${crearTablaOperativos()}
            </div>

            ${crearPaginacionHTML(
                estado.total,
                estado.limite,
                estado.offset,
                "operativos"
            )}

        </div>
    `;

    registrarEventosOperativos();
}


function crearFiltrosOperativosHTML() {
    const filtros = ESTADO.operativos.filtros;

    return `
        <form
            id="form-filtros-operativos"
            class="query-filters"
        >
            <div class="form-group">
                <label for="operativos-busqueda">
                    Buscar
                </label>

                <input
                    id="operativos-busqueda"
                    type="search"
                    value="${escaparHTML(
                        filtros.busqueda || ""
                    )}"
                    placeholder="Caso, localidad, domicilio..."
                >
            </div>

            ${crearFiltroJurisdiccion(
                "operativos-jurisdiccion",
                filtros.jurisdiccion
            )}

            <div class="form-group">
                <label for="operativos-programa">
                    Programa
                </label>

                <select id="operativos-programa">
                    <option value="">
                        Todos
                    </option>

                    ${ESTADO.catalogos.programas
                        .map(programa => `
                            <option
                                value="${escaparHTML(
                                    programa.id
                                )}"
                                ${
                                    filtros.programa_id ===
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
                <label for="operativos-tipo">
                    Tipo
                </label>

                <select id="operativos-tipo">
                    <option value="">
                        Todos
                    </option>

                    ${ESTADO.catalogos.tipos_operativo
                        .map(tipo => `
                            <option
                                value="${escaparHTML(
                                    tipo.id
                                )}"
                                ${
                                    filtros.tipo_operativo_id ===
                                    tipo.id
                                        ? "selected"
                                        : ""
                                }
                            >
                                ${escaparHTML(tipo.nombre)}
                            </option>
                        `)
                        .join("")}
                </select>
            </div>

            <div class="form-group">
                <label for="operativos-estatus">
                    Estatus
                </label>

                <select id="operativos-estatus">
                    <option value="">
                        Todos
                    </option>

                    <option
                        value="ACTIVO"
                        ${
                            filtros.estatus === "ACTIVO"
                                ? "selected"
                                : ""
                        }
                    >
                        Activo
                    </option>

                    <option
                        value="FINALIZADO"
                        ${
                            filtros.estatus === "FINALIZADO"
                                ? "selected"
                                : ""
                        }
                    >
                        Finalizado
                    </option>

                    <option
                        value="CANCELADO"
                        ${
                            filtros.estatus === "CANCELADO"
                                ? "selected"
                                : ""
                        }
                    >
                        Cancelado
                    </option>
                </select>
            </div>

            ${crearCamposFechas(
                "operativos",
                filtros.fecha_inicio,
                filtros.fecha_fin
            )}

            <div class="query-filters__actions">
                <button
                    class="button button--primary"
                    type="submit"
                >
                    Consultar
                </button>

                <button
                    id="btn-limpiar-operativos"
                    class="button button--secondary"
                    type="button"
                >
                    Limpiar
                </button>
            </div>
        </form>
    `;
}


function crearTablaOperativos() {
    const registros = ESTADO.operativos.registros;

    if (registros.length === 0) {
        return crearEstadoVacio(
            "No se encontraron operativos."
        );
    }

    return `
        <table class="query-table">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Programa</th>
                    <th>Tipo</th>
                    <th>Caso</th>
                    <th>Jurisdicción</th>
                    <th>Estatus</th>
                    <th>Manzanas</th>
                    <th>Viviendas</th>
                    <th>Actividades</th>
                    <th>Verificaciones</th>
                    <th></th>
                </tr>
            </thead>

            <tbody>
                ${registros.map(operativo => `
                    <tr>
                        <td>
                            ${formatearFecha(
                                operativo.fecha_inicio
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                operativo.programa
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                operativo.tipo_operativo
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                operativo.folio_caso ||
                                "Sin caso"
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                operativo.cve_jur_res
                            )}
                        </td>

                        <td>
                            ${crearEtiquetaEstado(
                                operativo.cancelado
                                    ? "CANCELADO"
                                    : operativo.estatus
                            )}
                        </td>

                        <td>
                            ${formatearEntero(
                                operativo.total_manzanas
                            )}
                        </td>

                        <td>
                            ${formatearEntero(
                                operativo.total_viviendas
                            )}
                        </td>

                        <td>
                            ${formatearEntero(
                                operativo.total_actividades
                            )}
                        </td>

                        <td>
                            ${formatearEntero(
                                operativo.total_verificaciones
                            )}
                        </td>

                        <td>
                            <button
                                class="button button--small button--secondary"
                                type="button"
                                data-ver-operativo="${escaparHTML(
                                    operativo.id
                                )}"
                            >
                                Ver detalle
                            </button>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}


function registrarEventosOperativos() {
    document
        .getElementById(
            "btn-nuevo-operativo-tabla"
        )
        .addEventListener(
            "click",
            () => navegar("/operativos/nuevo")
        );

    document
        .getElementById(
            "form-filtros-operativos"
        )
        .addEventListener(
            "submit",
            async evento => {
                evento.preventDefault();

                guardarFiltrosOperativos();

                ESTADO.operativos.offset = 0;

                await cargarPestañaActual();
            }
        );

    document
        .getElementById(
            "btn-limpiar-operativos"
        )
        .addEventListener(
            "click",
            async () => {
                ESTADO.operativos.filtros =
                    crearFiltrosOperativos();

                ESTADO.operativos.offset = 0;

                await cargarPestañaActual();
            }
        );

    document
        .querySelectorAll(
            "[data-ver-operativo]"
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                () => abrirDetalleOperativo(
                    boton.dataset.verOperativo
                )
            );
        });

    registrarEventosPaginacion("operativos");
}


function guardarFiltrosOperativos() {
    ESTADO.operativos.filtros = {
        busqueda:
            obtenerValor("operativos-busqueda"),

        jurisdiccion:
            obtenerValor(
                "operativos-jurisdiccion"
            ),

        programa_id:
            obtenerValor("operativos-programa"),

        tipo_operativo_id:
            obtenerValor("operativos-tipo"),

        estatus:
            obtenerValor("operativos-estatus"),

        fecha_inicio:
            obtenerValor(
                "operativos-fecha-inicio"
            ),

        fecha_fin:
            obtenerValor(
                "operativos-fecha-fin"
            )
    };
}


/*
==========================================================
DETALLE DEL OPERATIVO
==========================================================
*/

async function abrirDetalleOperativo(
    operativoId
) {
    mostrarModalCarga(
        "Cargando detalle del operativo..."
    );

    try {
        ESTADO.detalleOperativo =
            await consultarDetalleOperativo(
                obtenerToken(),
                operativoId
            );

        renderizarDetalleOperativo();
    } catch (error) {
        mostrarModalError(error);
    }
}


function renderizarDetalleOperativo() {
    const detalle = ESTADO.detalleOperativo;
    const operativo = detalle.operativo || {};
    const totales = detalle.totales || {};
    const manzanas = obtenerArreglo(
        detalle.manzanas
    );

    abrirModal(`
        <div class="detail-modal">

            <header class="modal-header">
                <div>
                    <p class="modal-header__eyebrow">
                        Detalle operativo
                    </p>

                    <h2>
                        ${escaparHTML(
                            operativo.programa ||
                            "Operativo"
                        )}
                    </h2>

                    <p>
                        ${escaparHTML(
                            operativo.tipo_operativo ||
                            ""
                        )}
                    </p>
                </div>

                <button
                    class="modal-close"
                    type="button"
                    data-cerrar-modal
                    aria-label="Cerrar"
                >
                    ×
                </button>
            </header>

            <div class="modal-body">

                <section class="detail-summary">
                    ${crearResumenDetalle(
                        "Caso",
                        operativo.folio_caso ||
                        "Sin caso"
                    )}

                    ${crearResumenDetalle(
                        "Jurisdicción",
                        operativo.cve_jur_res
                    )}

                    ${crearResumenDetalle(
                        "Inicio",
                        formatearFecha(
                            operativo.fecha_inicio
                        )
                    )}

                    ${crearResumenDetalle(
                        "Estatus",
                        operativo.cancelado
                            ? "CANCELADO"
                            : operativo.estatus
                    )}

                    ${crearResumenDetalle(
                        "Manzanas",
                        totales.manzanas
                    )}

                    ${crearResumenDetalle(
                        "Viviendas",
                        totales.viviendas
                    )}

                    ${crearResumenDetalle(
                        "Habitantes",
                        totales.habitantes
                    )}

                    ${crearResumenDetalle(
                        "Perros",
                        totales.perros
                    )}

                    ${crearResumenDetalle(
                        "Gatos",
                        totales.gatos
                    )}

                    ${crearResumenDetalle(
                        "Actividades",
                        totales.actividades
                    )}

                    ${crearResumenDetalle(
                        "Verificaciones",
                        totales.verificaciones
                    )}

                    ${crearResumenDetalle(
                        "Animales intervenidos",
                        totales.animales_intervenidos
                    )}
                </section>

                <section class="detail-section">
                    <h3>Manzanas y viviendas</h3>

                    <div class="detail-block-list">
                        ${
                            manzanas.length === 0
                                ? crearEstadoVacio(
                                    "No hay manzanas registradas."
                                )
                                : manzanas
                                    .map(crearDetalleManzana)
                                    .join("")
                        }
                    </div>
                </section>

            </div>
        </div>
    `);
}


function crearDetalleManzana(manzana) {
    const viviendas = obtenerArreglo(
        manzana.viviendas
    );

    return `
        <details class="detail-block">
            <summary>
                <div>
                    <strong>
                        Sector
                        ${escaparHTML(manzana.sector)}
                        · Manzana
                        ${escaparHTML(manzana.manzana)}
                    </strong>

                    <span>
                        ${viviendas.length}
                        vivienda(s)
                    </span>
                </div>
            </summary>

            <div class="detail-block__body">
                ${
                    viviendas.length === 0
                        ? crearEstadoVacio(
                            "No hay viviendas."
                        )
                        : viviendas
                            .map(crearDetalleVivienda)
                            .join("")
                }
            </div>
        </details>
    `;
}


function crearDetalleVivienda(vivienda) {
    const visitas = obtenerArreglo(
        vivienda.visitas
    );

    const actividades = obtenerArreglo(
        vivienda.actividades
    );

    const ordinarias = actividades.filter(
        actividad =>
            actividad.es_verificacion !== true
    );

    const verificaciones = actividades.filter(
        actividad =>
            actividad.es_verificacion === true
    );

    return `
        <article class="detail-housing">

            <header class="detail-housing__header">
                <div>
                    <strong>
                        ${escaparHTML(
                            vivienda.clave_vivienda ||
                            "Vivienda"
                        )}
                    </strong>

                    <span>
                        ${formatearEntero(
                            vivienda.habitantes
                        )}
                        habitantes ·

                        ${formatearEntero(
                            vivienda.perros
                        )}
                        perros ·

                        ${formatearEntero(
                            vivienda.gatos
                        )}
                        gatos
                    </span>
                </div>

                ${crearEtiquetaEstado(
                    vivienda.resultado_visita ||
                    "SIN RESULTADO"
                )}
            </header>

            <div class="detail-columns">

                <section>
                    <h4>Visitas</h4>

                    ${
                        visitas.length === 0
                            ? crearEstadoVacio(
                                "Sin visitas registradas."
                            )
                            : visitas
                                .map(crearDetalleVisita)
                                .join("")
                    }
                </section>

                <section>
                    <h4>Actividades ordinarias</h4>

                    ${
                        ordinarias.length === 0
                            ? crearEstadoVacio(
                                "Sin actividades ordinarias."
                            )
                            : ordinarias
                                .map(crearDetalleActividad)
                                .join("")
                    }
                </section>

                <section>
                    <h4>Verificaciones</h4>

                    ${
                        verificaciones.length === 0
                            ? crearEstadoVacio(
                                "Sin verificaciones."
                            )
                            : verificaciones
                                .map(crearDetalleActividad)
                                .join("")
                    }
                </section>

            </div>
        </article>
    `;
}


function crearDetalleVisita(visita) {
    const condiciones = [];

    if (visita.vivienda_cerrada) {
        condiciones.push("Cerrada");
    }

    if (visita.vivienda_deshabitada) {
        condiciones.push("Deshabitada");
    }

    if (visita.vivienda_renuente) {
        condiciones.push("Renuente");
    }

    return `
        <article class="detail-item">
            <div class="detail-item__header">
                <strong>
                    Visita
                    ${formatearEntero(
                        visita.numero_visita || 1
                    )}
                </strong>

                <span>
                    ${formatearFecha(visita.fecha)}
                </span>
            </div>

            <p>
                Resultado:
                <strong>
                    ${escaparHTML(
                        visita.resultado_visita ||
                        "Sin resultado"
                    )}
                </strong>
            </p>

            ${
                visita.es_reapertura
                    ? `
                        <p class="detail-highlight">
                            Reapertura de vivienda
                        </p>
                    `
                    : ""
            }

            ${
                condiciones.length > 0
                    ? `
                        <p>
                            ${escaparHTML(
                                condiciones.join(", ")
                            )}
                        </p>
                    `
                    : ""
            }

            ${
                visita.observaciones
                    ? `
                        <p>
                            ${escaparHTML(
                                visita.observaciones
                            )}
                        </p>
                    `
                    : ""
            }
        </article>
    `;
}


function crearDetalleActividad(actividad) {
    const consumos = obtenerArreglo(
        actividad.consumos
    );

    const animales = obtenerArreglo(
        actividad.animales
    );

    return `
        <article class="detail-item">

            <div class="detail-item__header">
                <strong>
                    ${escaparHTML(
                        actividad.actividad ||
                        actividad.codigo_actividad ||
                        "Actividad"
                    )}
                </strong>

                <span>
                    ${formatearFecha(
                        actividad.fecha
                    )}
                </span>
            </div>

            ${
                actividad.es_verificacion
                    ? `
                        <p class="detail-highlight">
                            Verificación
                            ${
                                actividad.numero_verificacion
                                    ? `número ${formatearEntero(
                                        actividad.numero_verificacion
                                    )}`
                                    : ""
                            }
                        </p>
                    `
                    : ""
            }

            ${
                actividad.motivo_verificacion
                    ? `
                        <p>
                            ${escaparHTML(
                                actividad.motivo_verificacion
                            )}
                        </p>
                    `
                    : ""
            }

            ${
                animales.length > 0
                    ? `
                        <p>
                            Animales:
                            ${formatearEntero(
                                animales.reduce(
                                    (total, animal) =>
                                        total +
                                        Number(
                                            animal.cantidad || 0
                                        ),
                                    0
                                )
                            )}
                        </p>
                    `
                    : ""
            }

            ${
                consumos.length > 0
                    ? `
                        <ul class="detail-consumption-list">
                            ${consumos.map(consumo => `
                                <li>
                                    ${escaparHTML(
                                        consumo.producto
                                    )}
                                    ·
                                    ${escaparHTML(
                                        consumo.lote
                                    )}
                                    ·
                                    ${formatearDecimal(
                                        consumo.cantidad
                                    )}
                                    ${escaparHTML(
                                        consumo.unidad || ""
                                    )}
                                </li>
                            `).join("")}
                        </ul>
                    `
                    : ""
            }

            ${
                actividad.observaciones
                    ? `
                        <p>
                            ${escaparHTML(
                                actividad.observaciones
                            )}
                        </p>
                    `
                    : ""
            }

        </article>
    `;
}


/*
==========================================================
INVENTARIO
==========================================================
*/

async function cargarInventario() {
    const estado = ESTADO.inventario;

    const respuesta = await consultarInventario(
        obtenerToken(),
        {
            ...estado.filtros,
            limite: estado.limite,
            offset: estado.offset
        }
    );

    estado.registros = respuesta.inventario;
    estado.total = respuesta.total;
    estado.limite = respuesta.limite;
    estado.offset = respuesta.offset;

    renderizarInventario();
}


function renderizarInventario() {
    const estado = ESTADO.inventario;
    const contenido = obtenerContenido();

    contenido.innerHTML = `
        <div class="query-panel">

            <div class="query-panel__heading">
                <div>
                    <h2>Inventario</h2>

                    <p>
                        ${formatearEntero(estado.total)}
                        lote(s) encontrado(s).
                    </p>
                </div>
            </div>

            ${crearFiltrosInventarioHTML()}

            <div class="query-table-wrapper">
                ${crearTablaInventario()}
            </div>

            ${crearPaginacionHTML(
                estado.total,
                estado.limite,
                estado.offset,
                "inventario"
            )}

        </div>
    `;

    registrarEventosInventario();
}


function crearFiltrosInventarioHTML() {
    const filtros = ESTADO.inventario.filtros;

    return `
        <form
            id="form-filtros-inventario"
            class="query-filters"
        >
            <div class="form-group">
                <label for="inventario-busqueda">
                    Buscar
                </label>

                <input
                    id="inventario-busqueda"
                    type="search"
                    value="${escaparHTML(
                        filtros.busqueda || ""
                    )}"
                    placeholder="Producto, lote o presentación..."
                >
            </div>

            ${crearFiltroJurisdiccion(
                "inventario-jurisdiccion",
                filtros.jurisdiccion
            )}

            <div class="form-group">
                <label for="inventario-categoria">
                    Categoría
                </label>

                <input
                    id="inventario-categoria"
                    type="text"
                    value="${escaparHTML(
                        filtros.categoria || ""
                    )}"
                    placeholder="Insecticida, ectodesparasitante..."
                >
            </div>

            <div class="form-checkbox-group">
                <label class="checkbox-control">
                    <input
                        id="inventario-disponible"
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

            <div class="query-filters__actions">
                <button
                    class="button button--primary"
                    type="submit"
                >
                    Consultar
                </button>

                <button
                    id="btn-limpiar-inventario"
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
    const registros = ESTADO.inventario.registros;

    if (registros.length === 0) {
        return crearEstadoVacio(
            "No se encontró inventario."
        );
    }

    return `
        <table class="query-table">
            <thead>
                <tr>
                    <th>Jurisdicción</th>
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
                                item.cve_jur_res
                            )}
                        </td>

                        <td>
                            <strong>
                                ${escaparHTML(
                                    item.producto
                                )}
                            </strong>

                            <small class="table-secondary">
                                ${escaparHTML(
                                    item.codigo_producto ||
                                    ""
                                )}
                            </small>
                        </td>

                        <td>
                            ${escaparHTML(item.lote)}
                        </td>

                        <td>
                            ${escaparHTML(
                                item.presentacion || ""
                            )}
                        </td>

                        <td>
                            ${formatearFecha(
                                item.fecha_caducidad
                            )}
                        </td>

                        <td>
                            ${formatearDecimal(
                                item.existencia
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                item.unidad_medida || ""
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
            "form-filtros-inventario"
        )
        .addEventListener(
            "submit",
            async evento => {
                evento.preventDefault();

                guardarFiltrosInventario();

                ESTADO.inventario.offset = 0;

                await cargarPestañaActual();
            }
        );

    document
        .getElementById(
            "btn-limpiar-inventario"
        )
        .addEventListener(
            "click",
            async () => {
                ESTADO.inventario.filtros =
                    crearFiltrosInventario();

                ESTADO.inventario.offset = 0;

                await cargarPestañaActual();
            }
        );

    registrarEventosPaginacion("inventario");
}


function guardarFiltrosInventario() {
    ESTADO.inventario.filtros = {
        busqueda:
            obtenerValor(
                "inventario-busqueda"
            ),

        jurisdiccion:
            obtenerValor(
                "inventario-jurisdiccion"
            ),

        categoria:
            obtenerValor(
                "inventario-categoria"
            ),

        solo_disponible:
            Boolean(
                document.getElementById(
                    "inventario-disponible"
                )?.checked
            )
    };
}


/*
==========================================================
VERIFICACIONES
==========================================================
*/

async function cargarVerificaciones() {
    ESTADO.verificaciones.registros =
        await consultarVerificaciones(
            obtenerToken(),
            ESTADO.verificaciones.filtros
        );

    renderizarVerificaciones();
}


function renderizarVerificaciones() {
    const registros =
        ESTADO.verificaciones.registros;

    const contenido = obtenerContenido();

    contenido.innerHTML = `
        <div class="query-panel">

            <div class="query-panel__heading">
                <div>
                    <h2>Verificaciones</h2>

                    <p>
                        ${formatearEntero(
                            registros.length
                        )}
                        ciclo(s) encontrado(s).
                    </p>
                </div>
            </div>

            ${crearFiltrosVerificacionesHTML()}

            <div class="verification-grid">
                ${
                    registros.length === 0
                        ? crearEstadoVacio(
                            "No se encontraron verificaciones."
                        )
                        : registros
                            .map(crearTarjetaVerificacion)
                            .join("")
                }
            </div>

        </div>
    `;

    registrarEventosVerificaciones();
}


function crearFiltrosVerificacionesHTML() {
    const filtros =
        ESTADO.verificaciones.filtros;

    return `
        <form
            id="form-filtros-verificaciones"
            class="query-filters"
        >
            ${crearFiltroJurisdiccion(
                "verificaciones-jurisdiccion",
                filtros.jurisdiccion
            )}

            <div class="form-group">
                <label for="verificaciones-estatus">
                    Estatus
                </label>

                <select id="verificaciones-estatus">
                    <option value="">
                        Todos
                    </option>

                    ${[
                        "PROGRAMADA",
                        "EN_PROCESO",
                        "COMPLETADA",
                        "CANCELADA"
                    ].map(estatus => `
                        <option
                            value="${estatus}"
                            ${
                                filtros.estatus === estatus
                                    ? "selected"
                                    : ""
                            }
                        >
                            ${escaparHTML(
                                formatearTextoEstado(
                                    estatus
                                )
                            )}
                        </option>
                    `).join("")}
                </select>
            </div>

            <div class="query-filters__actions">
                <button
                    class="button button--primary"
                    type="submit"
                >
                    Consultar
                </button>

                <button
                    id="btn-limpiar-verificaciones"
                    class="button button--secondary"
                    type="button"
                >
                    Limpiar
                </button>
            </div>
        </form>
    `;
}


function crearTarjetaVerificacion(
    verificacion
) {
    return `
        <article class="verification-card">

            <header class="verification-card__header">
                <div>
                    <span>
                        Verificación
                        ${formatearEntero(
                            verificacion.numero_verificacion
                        )}
                    </span>

                    <strong>
                        ${escaparHTML(
                            verificacion.folio_caso
                        )}
                    </strong>
                </div>

                ${crearEtiquetaEstado(
                    verificacion.estatus
                )}
            </header>

            <div class="verification-card__body">

                <p>
                    <strong>Clasificación:</strong>
                    ${escaparHTML(
                        verificacion.clasificacion
                    )}
                </p>

                <p>
                    <strong>Jurisdicción:</strong>
                    ${escaparHTML(
                        verificacion.cve_jur_res
                    )}
                </p>

                <p>
                    <strong>Fecha programada:</strong>
                    ${formatearFecha(
                        verificacion.fecha_programada
                    )}
                </p>

                <p>
                    <strong>Base:</strong>
                    ${formatearEntero(
                        verificacion.manzanas_base
                    )}
                    manzanas ·

                    ${formatearEntero(
                        verificacion.viviendas_base
                    )}
                    viviendas
                </p>

                ${
                    Number(
                        verificacion.dias_vencida
                    ) > 0
                        ? `
                            <p class="verification-overdue">
                                Vencida por
                                ${formatearEntero(
                                    verificacion.dias_vencida
                                )}
                                día(s)
                            </p>
                        `
                        : ""
                }

                ${
                    verificacion.motivo
                        ? `
                            <p>
                                ${escaparHTML(
                                    verificacion.motivo
                                )}
                            </p>
                        `
                        : ""
                }

            </div>

            <footer class="verification-card__actions">

                <button
                    class="button button--secondary"
                    type="button"
                    data-ver-base-verificacion="${escaparHTML(
                        verificacion.operativo_base_id
                    )}"
                >
                    Ver operativo base
                </button>

                ${
                    verificacion.estatus ===
                    "PROGRAMADA"
                        ? `
                            <button
                                class="button button--primary"
                                type="button"
                                data-iniciar-verificacion="${escaparHTML(
                                    verificacion.id
                                )}"
                            >
                                Iniciar
                            </button>
                        `
                        : ""
                }

                ${
                    verificacion.estatus ===
                    "EN_PROCESO"
                        ? `
                            <button
                                class="button button--primary"
                                type="button"
                                data-finalizar-verificacion="${escaparHTML(
                                    verificacion.id
                                )}"
                            >
                                Finalizar
                            </button>
                        `
                        : ""
                }

                ${
                    verificacion.clasificacion ===
                    "CONFIRMADO"
                        ? `
                            <button
                                class="button button--secondary"
                                type="button"
                                data-verificacion-adicional="${escaparHTML(
                                    verificacion.operativo_base_id
                                )}"
                            >
                                Programar otra
                            </button>
                        `
                        : ""
                }

            </footer>
        </article>
    `;
}


function registrarEventosVerificaciones() {
    document
        .getElementById(
            "form-filtros-verificaciones"
        )
        .addEventListener(
            "submit",
            async evento => {
                evento.preventDefault();

                ESTADO.verificaciones.filtros = {
                    jurisdiccion:
                        obtenerValor(
                            "verificaciones-jurisdiccion"
                        ),

                    estatus:
                        obtenerValor(
                            "verificaciones-estatus"
                        )
                };

                await cargarPestañaActual();
            }
        );

    document
        .getElementById(
            "btn-limpiar-verificaciones"
        )
        .addEventListener(
            "click",
            async () => {
                ESTADO.verificaciones.filtros =
                    crearFiltrosVerificaciones();

                await cargarPestañaActual();
            }
        );

    document
        .querySelectorAll(
            "[data-ver-base-verificacion]"
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                () => abrirDetalleOperativo(
                    boton.dataset
                        .verBaseVerificacion
                )
            );
        });

    document
        .querySelectorAll(
            "[data-iniciar-verificacion]"
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                () => procesarIniciarVerificacion(
                    boton.dataset
                        .iniciarVerificacion
                )
            );
        });

    document
        .querySelectorAll(
            "[data-finalizar-verificacion]"
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                () => procesarFinalizarVerificacion(
                    boton.dataset
                        .finalizarVerificacion
                )
            );
        });

    document
        .querySelectorAll(
            "[data-verificacion-adicional]"
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                () => mostrarFormularioVerificacionAdicional(
                    boton.dataset
                        .verificacionAdicional
                )
            );
        });
}


async function procesarIniciarVerificacion(
    verificacionId
) {
    const confirmado = window.confirm(
        "¿Desea iniciar esta verificación?"
    );

    if (!confirmado) {
        return;
    }

    try {
        await iniciarVerificacion(
            obtenerToken(),
            verificacionId,
            fechaActualISO()
        );

        await cargarPestañaActual();
    } catch (error) {
        window.alert(error.message);
    }
}


async function procesarFinalizarVerificacion(
    verificacionId
) {
    const confirmado = window.confirm(
        "¿Desea finalizar esta verificación?"
    );

    if (!confirmado) {
        return;
    }

    try {
        await finalizarVerificacion(
            obtenerToken(),
            verificacionId,
            fechaActualISO()
        );

        await cargarPestañaActual();
    } catch (error) {
        window.alert(error.message);
    }
}


function mostrarFormularioVerificacionAdicional(
    operativoBaseId
) {
    abrirModal(`
        <div class="small-modal">

            <header class="modal-header">
                <div>
                    <p class="modal-header__eyebrow">
                        Caso confirmado
                    </p>

                    <h2>
                        Programar verificación adicional
                    </h2>
                </div>

                <button
                    class="modal-close"
                    type="button"
                    data-cerrar-modal
                >
                    ×
                </button>
            </header>

            <form
                id="form-verificacion-adicional"
                class="modal-body"
            >
                <input
                    id="verificacion-operativo-base"
                    type="hidden"
                    value="${escaparHTML(
                        operativoBaseId
                    )}"
                >

                <div class="form-group">
                    <label for="verificacion-fecha">
                        Fecha programada
                    </label>

                    <input
                        id="verificacion-fecha"
                        type="date"
                    >
                </div>

                <div class="form-group">
                    <label for="verificacion-motivo">
                        Motivo
                    </label>

                    <textarea
                        id="verificacion-motivo"
                        rows="4"
                        maxlength="500"
                        placeholder="Motivo de la verificación adicional"
                    ></textarea>
                </div>

                <div class="modal-actions">
                    <button
                        class="button button--secondary"
                        type="button"
                        data-cerrar-modal
                    >
                        Cancelar
                    </button>

                    <button
                        class="button button--primary"
                        type="submit"
                    >
                        Programar
                    </button>
                </div>
            </form>

        </div>
    `);

    document
        .getElementById(
            "form-verificacion-adicional"
        )
        .addEventListener(
            "submit",
            procesarVerificacionAdicional
        );
}


async function procesarVerificacionAdicional(
    evento
) {
    evento.preventDefault();

    const boton = evento.submitter;

    boton.disabled = true;
    boton.textContent = "Programando...";

    try {
        await crearVerificacionAdicional(
            obtenerToken(),
            {
                operativo_base_id:
                    obtenerValor(
                        "verificacion-operativo-base"
                    ),

                fecha_programada:
                    obtenerValor(
                        "verificacion-fecha"
                    ),

                motivo:
                    obtenerValor(
                        "verificacion-motivo"
                    )
            }
        );

        cerrarModal();

        await cargarPestañaActual();
    } catch (error) {
        window.alert(error.message);

        boton.disabled = false;
        boton.textContent = "Programar";
    }
}


/*
==========================================================
PAGINACIÓN
==========================================================
*/

function crearPaginacionHTML(
    total,
    limite,
    offset,
    tipo
) {
    const paginacion = calcularPaginacion(
        total,
        limite,
        offset
    );

    return `
        <footer class="query-pagination">

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
                    data-paginacion-tipo="${tipo}"
                    data-paginacion-offset="${
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
                    data-paginacion-tipo="${tipo}"
                    data-paginacion-offset="${
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


function registrarEventosPaginacion(tipo) {
    document
        .querySelectorAll(
            `[data-paginacion-tipo="${tipo}"]`
        )
        .forEach(boton => {
            boton.addEventListener(
                "click",
                async () => {
                    if (boton.disabled) {
                        return;
                    }

                    const offset = Number(
                        boton.dataset
                            .paginacionOffset
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
    const root = document.getElementById(
        "query-modal-root"
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
        .querySelectorAll("[data-cerrar-modal]")
        .forEach(elemento => {
            elemento.addEventListener(
                "click",
                cerrarModal
            );
        });

    root
        .querySelector(".modal-overlay")
        ?.addEventListener(
            "click",
            evento => {
                if (
                    evento.target.classList.contains(
                        "modal-overlay"
                    )
                ) {
                    cerrarModal();
                }
            }
        );
}


function cerrarModal() {
    const root = document.getElementById(
        "query-modal-root"
    );

    if (root) {
        root.innerHTML = "";
    }

    document.body.classList.remove(
        "modal-open"
    );
}


function mostrarModalCarga(texto) {
    abrirModal(`
        <div class="small-modal modal-loading">
            <div
                class="initial-loader__spinner"
                aria-hidden="true"
            ></div>

            <p>${escaparHTML(texto)}</p>
        </div>
    `);
}


function mostrarModalError(error) {
    abrirModal(`
        <div class="small-modal">

            <header class="modal-header">
                <h2>
                    No fue posible cargar el detalle
                </h2>

                <button
                    class="modal-close"
                    type="button"
                    data-cerrar-modal
                >
                    ×
                </button>
            </header>

            <div class="modal-body">
                <p>
                    ${escaparHTML(
                        error?.message ||
                        "Ocurrió un error inesperado."
                    )}
                </p>
            </div>

        </div>
    `);
}


/*
==========================================================
FILTROS Y ELEMENTOS COMUNES
==========================================================
*/

function crearFiltroJurisdiccion(
    id,
    valorActual
) {
    const jurisdicciones =
        ESTADO.catalogos.jurisdicciones;

    if (jurisdicciones.length <= 1) {
        return "";
    }

    return `
        <div class="form-group">
            <label for="${id}">
                Jurisdicción
            </label>

            <select id="${id}">
                <option value="">
                    Todas
                </option>

                ${jurisdicciones.map(jurisdiccion => `
                    <option
                        value="${escaparHTML(
                            jurisdiccion.clave
                        )}"
                        ${
                            valorActual ===
                            jurisdiccion.clave
                                ? "selected"
                                : ""
                        }
                    >
                        ${escaparHTML(
                            `${jurisdiccion.clave} - ${jurisdiccion.nombre}`
                        )}
                    </option>
                `).join("")}
            </select>
        </div>
    `;
}


function crearCamposFechas(
    prefijo,
    fechaInicio,
    fechaFin
) {
    return `
        <div class="form-group">
            <label for="${prefijo}-fecha-inicio">
                Desde
            </label>

            <input
                id="${prefijo}-fecha-inicio"
                type="date"
                value="${escaparHTML(
                    fechaInicio || ""
                )}"
            >
        </div>

        <div class="form-group">
            <label for="${prefijo}-fecha-fin">
                Hasta
            </label>

            <input
                id="${prefijo}-fecha-fin"
                type="date"
                value="${escaparHTML(
                    fechaFin || ""
                )}"
            >
        </div>
    `;
}


function crearEtiquetaEstado(estado) {
    const texto = String(
        estado || "SIN ESTATUS"
    ).toUpperCase();

    const clase = obtenerClaseEstado(
        texto
    );

    return `
        <span class="status-badge ${clase}">
            ${escaparHTML(
                formatearTextoEstado(texto)
            )}
        </span>
    `;
}


function obtenerClaseEstado(estado) {
    if (
        [
            "CONFIRMADO",
            "ACTIVO",
            "DISPONIBLE",
            "COMPLETADA",
            "TRABAJADA"
        ].includes(estado)
    ) {
        return "status-badge--success";
    }

    if (
        [
            "PROBABLE",
            "PROGRAMADA",
            "EN_PROCESO",
            "PROXIMO_A_CADUCAR"
        ].includes(estado)
    ) {
        return "status-badge--warning";
    }

    if (
        [
            "CANCELADO",
            "CADUCADO",
            "AGOTADO",
            "VENCIDA"
        ].includes(estado)
    ) {
        return "status-badge--danger";
    }

    return "status-badge--neutral";
}


function crearResumenDetalle(
    etiqueta,
    valor
) {
    return `
        <article class="detail-summary__item">
            <span>
                ${escaparHTML(etiqueta)}
            </span>

            <strong>
                ${escaparHTML(
                    valor === null ||
                    valor === undefined ||
                    valor === ""
                        ? "No especificado"
                        : String(valor)
                )}
            </strong>
        </article>
    `;
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
                    Cargando módulo de consultas...
                </p>
            </div>
        </main>
    `;
}


function mostrarCargaContenido() {
    const contenido = obtenerContenido();

    if (contenido) {
        contenido.innerHTML =
            crearCargaContenido();
    }
}


function crearCargaContenido() {
    return `
        <div class="query-loading">
            <div
                class="initial-loader__spinner"
                aria-hidden="true"
            ></div>

            <p>Cargando información...</p>
        </div>
    `;
}


function mostrarErrorContenido(error) {
    const contenido = obtenerContenido();

    contenido.innerHTML = `
        <div class="query-error">
            <h2>
                No fue posible realizar la consulta
            </h2>

            <p>
                ${escaparHTML(
                    error?.message ||
                    "Ocurrió un error inesperado."
                )}
            </p>

            <button
                id="btn-reintentar-consulta"
                class="button button--primary"
                type="button"
            >
                Reintentar
            </button>
        </div>
    `;

    document
        .getElementById(
            "btn-reintentar-consulta"
        )
        .addEventListener(
            "click",
            cargarPestañaActual
        );
}


function renderizarErrorGeneral(error) {
    obtenerApp().innerHTML = `
        <main class="system-error">
            <section class="system-error__card">
                <h1>
                    No fue posible abrir consultas
                </h1>

                <p>
                    ${escaparHTML(
                        error?.message ||
                        "Ocurrió un error inesperado."
                    )}
                </p>

                <button
                    id="btn-error-consultas-inicio"
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
            "btn-error-consultas-inicio"
        )
        .addEventListener(
            "click",
            () => navegar("/inicio")
        );
}


/*
==========================================================
FILTROS INICIALES
==========================================================
*/

function crearFiltrosCasos() {
    return {
        busqueda: null,
        jurisdiccion: null,
        clasificacion: null,
        fecha_inicio: null,
        fecha_fin: null
    };
}


function crearFiltrosOperativos() {
    return {
        busqueda: null,
        jurisdiccion: null,
        programa_id: null,
        tipo_operativo_id: null,
        fecha_inicio: null,
        fecha_fin: null,
        estatus: null
    };
}


function crearFiltrosInventario() {
    return {
        jurisdiccion: null,
        busqueda: null,
        categoria: null,
        solo_disponible: false
    };
}


function crearFiltrosVerificaciones() {
    return {
        jurisdiccion: null,
        estatus: null
    };
}


/*
==========================================================
UTILIDADES
==========================================================
*/

function obtenerApp() {
    const app = document.getElementById("app");

    if (!app) {
        throw new Error(
            "No se encontró el contenedor principal."
        );
    }

    return app;
}


function obtenerContenido() {
    return document.getElementById(
        "query-content"
    );
}


function obtenerToken() {
    const token = obtenerCookie(
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

    const valor = String(
        elemento.value || ""
    ).trim();

    return valor || null;
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
    ).format(Number(valor) || 0);
}


function formatearDecimal(valor) {
    return new Intl.NumberFormat(
        "es-MX",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    ).format(Number(valor) || 0);
}


function formatearFecha(valor) {
    if (!valor) {
        return "No especificada";
    }

    const fecha = new Date(
        `${String(valor).slice(0, 10)}T12:00:00`
    );

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return escaparHTML(valor);
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


function formatearTextoEstado(valor) {
    return String(valor || "")
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(
            /(^|\s)\S/g,
            letra => letra.toUpperCase()
        );
}


function fechaActualISO() {
    const fecha = new Date();

    const diferencia =
        fecha.getTimezoneOffset() *
        60000;

    return new Date(
        fecha.getTime() - diferencia
    )
        .toISOString()
        .slice(0, 10);
}


function escaparHTML(valor) {
    const elemento =
        document.createElement("div");

    elemento.textContent =
        String(valor ?? "");

    return elemento.innerHTML;
}