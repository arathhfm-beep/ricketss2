import { CONFIG } from "../../config.js";

import {
   obtenerCatalogosOperativo,
    buscarCasosOperativo,
    obtenerInventarioOperativo,
    registrarOperativo,
    buscarOperativosRetomar,
    obtenerOperativoJornadas,
    guardarJornadaOperativo,

    obtenerDetalleOperativoEditable,
    editarJornadaOperativo,

    obtenerResultadosOperativosRetomar,
    obtenerDatosOperativoJornadas,
    obtenerTiposJornada,
    obtenerHistorialJornadas,
    calcularTotalesJornadas,
    obtenerClaseTipoJornada
} from "../services/operativos.service.js";

import { obtenerCookie } from "../utils/cookies.js";
import { navegar } from "../utils/router.js";


const MODOS = Object.freeze({
    CASO: "CASO",
    SIN_CASO: "SIN_CASO",
    RETOMAR: "RETOMAR"
});

const TIPOS_JORNADA = Object.freeze({
    INICIAL: "INICIAL",
    CONTINUACION: "CONTINUACION",
    VERIFICACION: "VERIFICACION",
    REINTERVENCION: "REINTERVENCION"
});

const PASOS = Object.freeze([
    { numero: 1, titulo: "Información general" },
    { numero: 2, titulo: "Sectores y manzanas" },
    { numero: 3, titulo: "Actividades" },
    { numero: 4, titulo: "Resumen" }
]);

const ESTADO = {
    cargando: false,
    guardando: false,
    pasoActual: 1,
    modoRegistro: null,
    catalogos: null,
    usuario: crearUsuarioInicial(),
    inventario: [],
    casoSeleccionado: null,
    operativoSeleccionado: null,
    editandoJornada: false,
    jornadaEditandoId: null,
    tiposJornada: [],
    historialJornadas: [],
    jornadaEditandoId: null,
    busquedaOperativo: crearBusquedaInicial(),
    operativo: crearOperativoInicial(),
    jornada: crearJornadaInicial(TIPOS_JORNADA.INICIAL)
};

export async function mostrarRegistrarOperativo(opciones = {}) {
    document.title = `Registrar operativo | ${CONFIG.APP_NAME}`;
    
    reiniciarEstado();
    renderizarCargaOperativo();

    try {
        await cargarCatalogosOperativo();

        if (opciones.operativoId) {
            ESTADO.modoRegistro = MODOS.RETOMAR;
            await seleccionarOperativoRetomar(opciones.operativoId);
            return;
        }

        renderizarSelectorModo();
    } catch (error) {
        renderizarErrorOperativo(error);
    }
}

function crearUsuarioInicial() {
    return {
        rol: null,
        cve_jur_res: null,
        nombre_jurisdiccion: null,
        puede_consultar_estado: false
    };
}

function normalizarRolUsuario(usuario = {}) {
    const rolCrudo =
        usuario.codigo_rol ||
        usuario.rol_codigo ||
        usuario.rol?.codigo ||
        usuario.rol?.nombre ||
        usuario.rol ||
        usuario.nombre_rol ||
        "";

    return String(rolCrudo)
        .trim()
        .toUpperCase()
        .replace(/[ÁÀÄÂ]/g, "A")
        .replace(/[ÉÈËÊ]/g, "E")
        .replace(/[ÍÌÏÎ]/g, "I")
        .replace(/[ÓÒÖÔ]/g, "O")
        .replace(/[ÚÙÜÛ]/g, "U")
        .replace(/\s+/g, "_");
}

function esRolSupervisor(rol) {
    const codigo = String(rol || "").toUpperCase();
    return (
        codigo === "ADMIN" ||
        codigo.includes("SUPERVISOR") ||
        codigo.includes("ADMINISTRADOR")
    );
}

function esUsuarioJurisdiccional() {
    return !esRolSupervisor(ESTADO.usuario.rol) && !ESTADO.usuario.puede_consultar_estado;
}

function aplicarJurisdiccionUsuario() {
    if (esUsuarioJurisdiccional() && ESTADO.usuario.cve_jur_res) {
        ESTADO.operativo.cve_jur_res = ESTADO.usuario.cve_jur_res;
    }
}

function renderizarCapturaJornadaActual() {
    if (ESTADO.operativoSeleccionado?.id) {
        renderizarEditorJornadaRetomada();
        return;
    }

    renderizarFormularioNuevo();
}

function crearBusquedaInicial() {
    return {
        cargando: false,
        texto: "",
        jurisdiccion: null,
        resultados: []
    };
}

function crearOperativoInicial() {
    return {
        programa_id: null,
        tipo_operativo_id: null,
        folio_caso: null,
        nombre_referencia: null,
        motivo: null,
        cve_jur_res: null,
        cve_mpo_res: null,
        localidad: null,
        domicilio: null,
        fecha_inicio: fechaActualISO(),
        fecha_fin: null,
        estatus: "ACTIVO",
        observaciones: null
    };
}

function crearJornadaInicial(tipo = TIPOS_JORNADA.INICIAL) {
    return {
        tipo_jornada: tipo,
        fecha: fechaActualISO(),
        motivo: null,
        observaciones: null,
        sectores: []
    };
}

function crearSectorInicial() {
    return {
        sector: "",
        manzanas: []
    };
}

function crearManzanaInicial() {
    return {
        manzana: "",
        resumen: crearResumenManzanaInicial(),
        actividades: []
    };
}

function crearResumenManzanaInicial() {
    return {
        viviendas_visitadas: 0,
        viviendas_trabajadas: 0,
        viviendas_cerradas: 0,
        viviendas_deshabitadas: 0,
        viviendas_renuentes: 0,
        lotes_baldios: 0,
        otros_inmuebles: 0,
        habitantes_beneficiados: 0,
        viviendas_con_perros: 0,
        viviendas_con_gatos: 0,
        viviendas_con_perros_gatos: 0,
        viviendas_sin_animales: 0,
        perros_censados: 0,
        gatos_censados: 0,
        observaciones: null
    };
}

function crearActividadInicial() {
    return {
        tipo_actividad_id: null,
        fecha: ESTADO.jornada.fecha || fechaActualISO(),
        brigadista1: null,
        brigadista2: null,
        supervisor: null,
        viviendas_cubiertas: 0,
        viviendas_encuestadas: 0,
        viviendas_rociadas: 0,
        viviendas_ectodesparasitadas: 0,
        perros_intervenidos: 0,
        gatos_intervenidos: 0,
        viviendas_inspeccionadas: 0,
        viviendas_con_garrapata: 0,
        perros_inspeccionados: 0,
        perros_con_garrapata: 0,
        gatos_inspeccionados: 0,
        gatos_con_garrapata: 0,
        garrapatas_en_viviendas: 0,
        garrapatas_en_perros: 0,
        garrapatas_en_gatos: 0,
        larvas_encontradas: 0,
        ninfas_encontradas: 0,
        adultos_encontrados: 0,
        muestras_enviadas: 0,
        garrapatas_positivas: null,
        rangos_vacunacion: [],
        rangos_esterilizacion: [],
        observaciones: null,
        insumos: []
    };
}

function crearInsumoInicial() {
    return {
        lote_id: null,

        tipo_captura: "UNIDAD_BASE",

        cantidad_capturada: 0,
        cantidad: 0,

        unidad: null,
        presentacion: null,
        contenido_presentacion: null,
        existencia_disponible: 0,
        rangos_folios: []
    };
}

function reiniciarEstado() {
    ESTADO.cargando = false;
    ESTADO.guardando = false;
    ESTADO.pasoActual = 1;
    ESTADO.modoRegistro = null;
    ESTADO.catalogos = null;
    ESTADO.usuario = crearUsuarioInicial();
    ESTADO.inventario = [];
    ESTADO.casoSeleccionado = null;
    ESTADO.operativoSeleccionado = null;
    ESTADO.tiposJornada = [];
    ESTADO.historialJornadas = [];
    ESTADO.jornadaEditandoId = null;
    ESTADO.busquedaOperativo = crearBusquedaInicial();
    ESTADO.operativo = crearOperativoInicial();
    ESTADO.jornada = crearJornadaInicial();
    ESTADO.editandoJornada = false;
    ESTADO.jornadaEditandoId = null;
}

async function cargarCatalogosOperativo() {
    const respuesta = await obtenerCatalogosOperativo(
        obtenerToken()
    );

    ESTADO.catalogos =
        respuesta?.catalogos ||
        respuesta ||
        {};

    const usuario =
        respuesta?.usuario ||
        respuesta?.contexto ||
        ESTADO.catalogos?.usuario ||
        {};

    const rol = normalizarRolUsuario(usuario);

    ESTADO.usuario = {
        rol: rol || null,
        cve_jur_res:
            usuario.cve_jur_res ||
            usuario.jurisdiccion ||
            null,
        nombre_jurisdiccion:
            usuario.nombre_jurisdiccion ||
            null,
        puede_consultar_estado:
            usuario.puede_consultar_estado === true ||
            usuario.puede_consultar_estado === "true" ||
            usuario.puede_administrar === true ||
            usuario.puede_administrar === "true" ||
            esRolSupervisor(rol)
    };

    ESTADO.inventario = obtenerArreglo(
        respuesta?.inventario
    );

    aplicarJurisdiccionUsuario();

    const jurisdicciones = obtenerArreglo(
        ESTADO.catalogos?.jurisdicciones
    );

    if (
        !ESTADO.operativo.cve_jur_res &&
        jurisdicciones.length === 1
    ) {
        ESTADO.operativo.cve_jur_res =
            jurisdicciones[0].clave;
    }
}

function renderizarSelectorModo() {
    const app = obtenerApp();

    app.innerHTML = `
        <div class="operative-page">
            ${crearEncabezadoPagina(
                "Registrar operativo",
                "Cree un expediente nuevo o agregue una jornada a un operativo existente.",
                false
            )}

            <main class="operative-main">
                <section class="operation-flow">
                    <header class="step-panel__header">
                        <div>
                            <p class="step-panel__eyebrow">Paso inicial</p>
                            <h2>¿Qué desea registrar?</h2>
                            <p>Seleccione el flujo de captura.</p>
                        </div>
                    </header>

                    <div class="operation-flow__options">
                        ${crearOpcionModo(
                            MODOS.CASO,
                            "Nuevo por caso",
                            "Buscar un caso existente y registrar la primera jornada."
                        )}
                        ${crearOpcionModo(
                            MODOS.SIN_CASO,
                            "Nuevo sin caso",
                            "Crear un operativo por evento, lugar o actividad general."
                        )}
                        ${crearOpcionModo(
                            MODOS.RETOMAR,
                            "Retomar operativo",
                            "Agregar una continuación, verificación o reintervención."
                        )}
                    </div>
                </section>
            </main>
        </div>
    `;

    document.querySelectorAll("[data-operation-mode]").forEach(boton => {
        boton.addEventListener("click", () => {
            seleccionarModoRegistro(boton.dataset.operationMode);
        });
    });

    document.getElementById("btn-operation-home")?.addEventListener(
        "click",
        () => navegar("/inicio")
    );
}

function crearOpcionModo(modo, titulo, descripcion) {
    return `
        <button
            class="operation-flow-card"
            type="button"
            data-operation-mode="${escaparHTML(modo)}"
        >
            <span class="operation-flow-card__content">
                <strong>${escaparHTML(titulo)}</strong>
                <span>${escaparHTML(descripcion)}</span>
            </span>
            <span class="operation-flow-card__arrow">→</span>
        </button>
    `;
}

function seleccionarModoRegistro(modo) {
    const modoNormalizado = String(modo || "").toUpperCase();
    ESTADO.modoRegistro = modoNormalizado;

    if (modoNormalizado === MODOS.RETOMAR) {
        renderizarBusquedaOperativo();
        return;
    }

    if (![MODOS.CASO, MODOS.SIN_CASO].includes(modoNormalizado)) {
        renderizarSelectorModo();
        return;
    }

    ESTADO.pasoActual = 1;
    ESTADO.operativo = crearOperativoInicial();
    ESTADO.jornada = crearJornadaInicial(TIPOS_JORNADA.INICIAL);
    ESTADO.casoSeleccionado = null;

    const jurisdicciones = obtenerArreglo(ESTADO.catalogos?.jurisdicciones);
    if (jurisdicciones.length === 1) {
        ESTADO.operativo.cve_jur_res = jurisdicciones[0].clave;
    }

    renderizarFormularioNuevo();
}

function renderizarFormularioNuevo() {
    const app = obtenerApp();

    app.innerHTML = `
        <div class="operative-page">
            ${crearEncabezadoPagina(
                "Registrar operativo",
                ESTADO.modoRegistro === MODOS.CASO
                    ? "Nuevo expediente ligado a un caso."
                    : "Nuevo expediente sin caso asociado.",
                true
            )}

            <main class="operative-main">
                ${crearIndicadorPasos()}

                <section id="operative-step-content" class="operative-step">
                    ${crearContenidoPasoNuevo()}
                </section>

                ${crearNavegacionInferior()}
            </main>
        </div>
    `;

    registrarEventosGeneralesNuevo();
    registrarEventosPasoActual();
}

function crearEncabezadoPagina(titulo, descripcion, mostrarCambioModo) {
    return `
        <header class="operative-header">
            <div>
                <p class="operative-header__eyebrow">Operación de campo</p>
                <h1>${escaparHTML(titulo)}</h1>
                <p class="operative-header__description">${escaparHTML(descripcion)}</p>
            </div>

            <div class="operative-header__actions">
                ${mostrarCambioModo ? `
                    <button
                        id="btn-cambiar-modo-operativo"
                        class="button button--secondary"
                        type="button"
                    >
                        Cambiar tipo de registro
                    </button>
                ` : ""}

                <button
                    id="btn-operation-home"
                    class="button button--secondary"
                    type="button"
                >
                    Volver al inicio
                </button>
            </div>
        </header>
    `;
}

function crearIndicadorPasos() {
    return `
        <nav class="wizard-progress" aria-label="Progreso del registro">
            ${PASOS.map(paso => {
                const activa = paso.numero === ESTADO.pasoActual;
                const terminada = paso.numero < ESTADO.pasoActual;

                return `
                    <button
                        class="wizard-progress__step ${activa ? "is-active" : ""} ${terminada ? "is-complete" : ""}"
                        type="button"
                        data-wizard-step="${paso.numero}"
                        ${paso.numero > ESTADO.pasoActual ? "disabled" : ""}
                    >
                        <span class="wizard-progress__number">${terminada ? "✓" : paso.numero}</span>
                        <span class="wizard-progress__title">${escaparHTML(paso.titulo)}</span>
                    </button>
                `;
            }).join("")}
        </nav>
    `;
}

function crearContenidoPasoNuevo() {
    switch (ESTADO.pasoActual) {
        case 1:
            return crearPasoInformacionGeneral();
        case 2:
            return crearPasoSectoresManzanas();
        case 3:
            return crearPasoActividades();
        case 4:
            return crearPasoResumen();
        default:
            return crearPasoInformacionGeneral();
    }
}

function crearNavegacionInferior() {
    const primero = ESTADO.pasoActual === 1;
    const ultimo = ESTADO.pasoActual === PASOS.length;

    return `
        <footer class="wizard-footer">
            <button
                id="btn-paso-anterior"
                class="button button--secondary"
                type="button"
                ${primero ? "disabled" : ""}
            >Anterior</button>

            <div id="operative-global-message" class="form-message" role="alert" aria-live="polite"></div>

            ${ultimo ? `
                <button
                    id="btn-guardar-operativo"
                    class="button button--primary"
                    type="button"
                >Registrar operativo</button>
            ` : `
                <button
                    id="btn-paso-siguiente"
                    class="button button--primary"
                    type="button"
                >Siguiente</button>
            `}
        </footer>
    `;
}

function crearPasoInformacionGeneral() {
    const programas = obtenerArreglo(ESTADO.catalogos?.programas);
    const jurisdicciones = obtenerArreglo(ESTADO.catalogos?.jurisdicciones);
    const tipos = obtenerArreglo(ESTADO.catalogos?.tipos_operativo).filter(tipo => {
        if (ESTADO.modoRegistro === MODOS.CASO) {
            return Boolean(tipo.requiere_caso);
        }
        return !Boolean(tipo.requiere_caso);
    });

    return `
        <div class="step-panel">
            <header class="step-panel__header">
                <div>
                    <p class="step-panel__eyebrow">Paso 1</p>
                    <h2>Información general</h2>
                    <p>Registre los datos permanentes del expediente y la primera jornada.</p>
                </div>
            </header>

            <div class="form-grid">
                ${crearSelectGeneral(
                    "operativo-programa",
                    "Programa",
                    programas,
                    ESTADO.operativo.programa_id,
                    "id",
                    "nombre"
                )}

                ${crearSelectGeneral(
                    "operativo-tipo",
                    "Tipo de operativo",
                    tipos,
                    ESTADO.operativo.tipo_operativo_id,
                    "id",
                    "nombre"
                )}

                ${crearSelectJurisdiccion(jurisdicciones)}

                <div class="form-group">
                    <label for="operativo-fecha-inicio">Fecha de la primera jornada</label>
                    <input
                        id="operativo-fecha-inicio"
                        type="date"
                        value="${escaparHTML(ESTADO.operativo.fecha_inicio || "")}"
                        required
                    >
                </div>

                <div class="form-group form-group--full">
                    <label for="operativo-nombre-referencia">Nombre o referencia</label>
                    <input
                        id="operativo-nombre-referencia"
                        type="text"
                        maxlength="200"
                        value="${escaparHTML(ESTADO.operativo.nombre_referencia || "")}"
                        placeholder="Ej. Gimnasio Municipal, evento o referencia del lugar"
                    >
                </div>

                <div class="form-group">
                    <label for="operativo-municipio">Clave de municipio</label>
                    <input
                        id="operativo-municipio"
                        type="text"
                        maxlength="10"
                        value="${escaparHTML(ESTADO.operativo.cve_mpo_res || "")}"
                    >
                </div>

                <div class="form-group">
                    <label for="operativo-localidad">Localidad</label>
                    <input
                        id="operativo-localidad"
                        type="text"
                        maxlength="150"
                        value="${escaparHTML(ESTADO.operativo.localidad || "")}"
                    >
                </div>

                <div class="form-group form-group--full">
                    <label for="operativo-domicilio">Domicilio o referencia</label>
                    <textarea id="operativo-domicilio" rows="3" maxlength="500">${escaparHTML(ESTADO.operativo.domicilio || "")}</textarea>
                </div>

                <div class="form-group form-group--full">
                    <label for="operativo-motivo">Motivo del operativo</label>
                    <textarea id="operativo-motivo" rows="2" maxlength="500">${escaparHTML(ESTADO.operativo.motivo || "")}</textarea>
                </div>

                <div class="form-group form-group--full">
                    <label for="operativo-observaciones">Observaciones</label>
                    <textarea id="operativo-observaciones" rows="3" maxlength="1000">${escaparHTML(ESTADO.operativo.observaciones || "")}</textarea>
                </div>
            </div>

            ${ESTADO.modoRegistro === MODOS.CASO ? `
                <section class="case-section">
                    ${crearSelectorCaso()}
                </section>
            ` : ""}
        </div>
    `;
}

function crearSelectGeneral(id, etiqueta, opciones, seleccionado, campoValor, campoTexto) {
    return `
        <div class="form-group">
            <label for="${id}">${escaparHTML(etiqueta)}</label>
            <select id="${id}" required>
                <option value="">Seleccione</option>
                ${opciones.map(opcion => `
                    <option
                        value="${escaparHTML(opcion[campoValor])}"
                        ${opcion[campoValor] === seleccionado ? "selected" : ""}
                    >${escaparHTML(opcion[campoTexto])}</option>
                `).join("")}
            </select>
        </div>
    `;
}

function crearSelectJurisdiccion(jurisdicciones) {
    if (esUsuarioJurisdiccional()) {
        return `
            <div class="form-group">
                <label>Jurisdicción</label>
                <div class="readonly-field">
                    ${escaparHTML(
                        [
                            ESTADO.usuario.cve_jur_res,
                            ESTADO.usuario.nombre_jurisdiccion
                        ].filter(Boolean).join(" - ") ||
                        "Jurisdicción asignada"
                    )}
                </div>
            </div>
        `;
    }

    return `
        <div class="form-group">
            <label for="operativo-jurisdiccion">Jurisdicción</label>
            <select id="operativo-jurisdiccion" required>
                <option value="">Seleccione</option>
                ${jurisdicciones.map(jurisdiccion => `
                    <option
                        value="${escaparHTML(jurisdiccion.clave)}"
                        ${jurisdiccion.clave === ESTADO.operativo.cve_jur_res ? "selected" : ""}
                    >${escaparHTML(`${jurisdiccion.clave} - ${jurisdiccion.nombre}`)}</option>
                `).join("")}
            </select>
        </div>
    `;
}

function crearSelectorCaso() {
    return `
        <header class="case-section__header">
            <div>
                <h3>Caso asociado</h3>
                <p>Busque por folio, paciente, municipio o domicilio.</p>
            </div>
        </header>

        <div class="case-search">
            <input id="caso-busqueda" type="search" placeholder="Buscar caso" autocomplete="off">
            <button id="btn-buscar-casos" class="button button--secondary" type="button">Buscar</button>
        </div>

        <div id="casos-resultados" class="case-results">
            ${ESTADO.casoSeleccionado
                ? crearCasoSeleccionado(ESTADO.casoSeleccionado)
                : `<p class="empty-message">No se ha seleccionado un caso.</p>`}
        </div>
    `;
}

function crearCasoSeleccionado(caso) {
    return `
        <article class="selected-case">
            <div>
                <span>Caso seleccionado</span>
                <strong>${escaparHTML(caso.folio_caso)}</strong>
                <p>${escaparHTML([
                    caso.nombre,
                    caso.municipio,
                    caso.localidad,
                    caso.clasificacion
                ].filter(Boolean).join(" · "))}</p>
            </div>
            <button id="btn-quitar-caso" class="button button--danger" type="button">Quitar</button>
        </article>
    `;
}

async function ejecutarBusquedaCasos() {
    const contenedor =
        document.getElementById(
            "casos-resultados"
        );

    const campoBusqueda =
        document.getElementById(
            "caso-busqueda"
        );

    const busqueda =
        campoBusqueda?.value?.trim() || "";

    if (!contenedor) {
        console.error(
            "No existe el contenedor #casos-resultados."
        );
        return;
    }

    contenedor.innerHTML = `
        <p class="empty-message">
            Buscando casos...
        </p>
    `;

    try {
        const token = obtenerToken();

        console.log(
            "[Operativos] Consultando casos:",
            {
                busqueda,
                tokenExiste: Boolean(token),
                tokenInicio:
                    token?.slice(0, 8) || null
            }
        );

        const respuesta =
            await buscarCasosOperativo(
                token,
                busqueda,
                100
            );

        console.log(
            "[Operativos] Respuesta del servicio:",
            respuesta
        );

        const casos =
            Array.isArray(respuesta?.casos)
                ? respuesta.casos
                : [];

        if (casos.length === 0) {
            contenedor.innerHTML = `
                <div class="empty-message">
                    <p>
                        No se encontraron casos.
                    </p>

                    <small>
                        Usuario:
                        ${escaparHTML(
                            respuesta?.usuario
                                ?.usuario_login ||
                            "No identificado"
                        )}
                        · Jurisdicción:
                        ${escaparHTML(
                            respuesta?.usuario
                                ?.cve_jur_res ||
                            "No identificada"
                        )}
                        · Total RPC:
                        ${escaparHTML(
                            respuesta?.total ?? 0
                        )}
                    </small>
                </div>
            `;

            return;
        }

        contenedor.innerHTML = `
            <div class="case-search-summary">
                <strong>
                    ${casos.length}
                    caso${casos.length === 1 ? "" : "s"}
                    encontrado${casos.length === 1 ? "" : "s"}
                </strong>

                <small>
                    ${escaparHTML(
                        respuesta?.usuario
                            ?.usuario_login ||
                        ""
                    )}
                    · Jurisdicción
                    ${escaparHTML(
                        respuesta?.usuario
                            ?.cve_jur_res ||
                        ""
                    )}
                </small>
            </div>

            <div class="case-result-list">
                ${casos
                    .map(crearResultadoCaso)
                    .join("")}
            </div>
        `;

        contenedor
            .querySelectorAll(
                "[data-seleccionar-caso]"
            )
            .forEach(boton => {
                boton.addEventListener(
                    "click",
                    seleccionarCasoDesdeBoton
                );
            });

    } catch (error) {
        console.error(
            "[Operativos] Error al consultar casos:",
            error
        );

        contenedor.innerHTML = `
            <div class="form-message form-message--error">
                <strong>
                    No fue posible consultar los casos.
                </strong>

                <p>
                    ${escaparHTML(
                        error?.message ||
                        "Error desconocido."
                    )}
                </p>
            </div>
        `;
    }
}

function crearResultadoCaso(caso) {
    const serializado = encodeURIComponent(JSON.stringify(caso));

    return `
        <article class="case-result-card">
            <div>
                <strong>${escaparHTML(caso.folio_caso || "Sin folio")}</strong>
                <span>${escaparHTML(caso.nombre || "Paciente sin nombre")}</span>
                <small>${escaparHTML([
                    caso.municipio,
                    caso.localidad,
                    caso.clasificacion
                ].filter(Boolean).join(" · "))}</small>
            </div>
            <button
                class="button button--primary"
                type="button"
                data-seleccionar-caso="${serializado}"
            >Seleccionar</button>
        </article>
    `;
}

function seleccionarCasoDesdeBoton(evento) {
    try {
        const caso = JSON.parse(decodeURIComponent(evento.currentTarget.dataset.seleccionarCaso));
        ESTADO.casoSeleccionado = caso;
        ESTADO.operativo.folio_caso = caso.folio_caso || null;
        if (!esUsuarioJurisdiccional()) {
            ESTADO.operativo.cve_jur_res = caso.cve_jur_res || ESTADO.operativo.cve_jur_res;
        }
        ESTADO.operativo.cve_mpo_res = caso.cve_mpo_res || null;
        ESTADO.operativo.localidad = caso.localidad || null;
        ESTADO.operativo.domicilio = caso.domicilio || null;
        ESTADO.operativo.nombre_referencia = caso.nombre || caso.folio_caso || null;

        cargarInventario().finally(renderizarFormularioNuevo);
    } catch {
        mostrarMensajeGlobal("No fue posible seleccionar el caso.", true);
    }
}

function crearPasoSectoresManzanas() {
    return `
        <div class="step-panel">
            <header class="step-panel__header">
                <div>
                    <p class="step-panel__eyebrow">Paso 2</p>
                    <h2>Sectores y manzanas</h2>
                    <p>Agregue un sector y capture todas las manzanas trabajadas dentro de él.</p>
                </div>
                <button id="btn-agregar-sector" class="button button--primary" type="button">Agregar sector</button>
            </header>

            <div class="record-list">
                ${ESTADO.jornada.sectores.length === 0
                    ? `<div class="empty-state"><h3>No hay sectores registrados</h3><p>Agregue al menos un sector.</p></div>`
                    : ESTADO.jornada.sectores.map(crearTarjetaSector).join("")}
            </div>
        </div>
    `;
}

function crearTarjetaSector(sector, indiceSector) {
    return `
        <article class="record-card" data-sector-index="${indiceSector}">
            <header class="record-card__header">
                <div>
                    <span class="record-card__number">${indiceSector + 1}</span>
                    <div>
                        <h3>Sector ${escaparHTML(sector.sector || "sin clave")}</h3>
                        <p>${sector.manzanas.length} manzana(s)</p>
                    </div>
                </div>
                <button
                    class="button button--danger"
                    type="button"
                    data-eliminar-sector="${indiceSector}"
                >Eliminar sector</button>
            </header>

            <div class="form-grid">
                <div class="form-group">
                    <label>Sector</label>
                    <input
                        type="text"
                        maxlength="50"
                        value="${escaparHTML(sector.sector || "")}"
                        data-sector-campo="sector"
                        data-sector-index="${indiceSector}"
                    >
                </div>

                <div class="form-group">
                    <label>&nbsp;</label>
                    <button
                        class="button button--secondary"
                        type="button"
                        data-agregar-manzana="${indiceSector}"
                    >Agregar manzana</button>
                </div>
            </div>

            <div class="accordion-list">
                ${sector.manzanas.length === 0
                    ? `<p class="empty-message">No hay manzanas en este sector.</p>`
                    : sector.manzanas.map((manzana, indiceManzana) =>
                        crearTarjetaManzana(manzana, indiceSector, indiceManzana)
                    ).join("")}
            </div>
        </article>
    `;
}

function crearTarjetaManzana(manzana, indiceSector, indiceManzana) {
    const resumen = manzana.resumen || crearResumenManzanaInicial();

    return `
        <section class="accordion-card">
            <header class="accordion-card__header">
                <div>
                    <h3>Manzana ${escaparHTML(manzana.manzana || indiceManzana + 1)}</h3>
                    <p>Resumen consolidado de la jornada.</p>
                </div>
                ${manzana.id ? `
                    <span class="form-help">Manzana existente · no eliminable desde la aplicación</span>
                ` : `
                    <button
                        class="button button--danger"
                        type="button"
                        data-eliminar-manzana="${indiceManzana}"
                        data-sector-index="${indiceSector}"
                    >Eliminar</button>
                `}
            </header>

            <div class="accordion-card__body">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Clave de manzana</label>
                        <input
                            type="text"
                            maxlength="50"
                            value="${escaparHTML(manzana.manzana || "")}"
                            data-manzana-campo="manzana"
                            data-sector-index="${indiceSector}"
                            data-manzana-index="${indiceManzana}"
                        >
                    </div>

                    <div class="form-group">
                        <label>Viviendas visitadas</label>
                        <input type="number" min="0" step="1" value="${calcularViviendasVisitadas(resumen)}" readonly>
                        <small>Trabajadas + cerradas + deshabitadas + renuentes.</small>
                    </div>
                    ${crearCampoResumen("viviendas_trabajadas", "Viviendas trabajadas", resumen, indiceSector, indiceManzana)}
                    ${crearCampoResumen("viviendas_cerradas", "Viviendas cerradas", resumen, indiceSector, indiceManzana)}
                    ${crearCampoResumen("viviendas_deshabitadas", "Viviendas deshabitadas", resumen, indiceSector, indiceManzana)}
                    ${crearCampoResumen("viviendas_renuentes", "Viviendas renuentes", resumen, indiceSector, indiceManzana)}
                    
                    ${crearCampoResumen("habitantes_beneficiados", "Habitantes beneficiados", resumen, indiceSector, indiceManzana)}
                    ${crearCampoResumen("viviendas_con_perros", "Viviendas con perros", resumen, indiceSector, indiceManzana)}
                    ${crearCampoResumen("viviendas_con_gatos", "Viviendas con gatos", resumen, indiceSector, indiceManzana)}
                    ${crearCampoResumen("viviendas_con_perros_gatos", "Viviendas con perros y gatos", resumen, indiceSector, indiceManzana)}
                    ${crearCampoResumen("viviendas_sin_animales", "Viviendas sin animales", resumen, indiceSector, indiceManzana)}
                    ${crearCampoResumen("perros_censados", "Perros censados", resumen, indiceSector, indiceManzana)}
                    ${crearCampoResumen("gatos_censados", "Gatos censados", resumen, indiceSector, indiceManzana)}

                    <div class="form-group form-group--full">
                        <label>Observaciones de la manzana</label>
                        <textarea
                            rows="2"
                            maxlength="500"
                            data-resumen-campo="observaciones"
                            data-sector-index="${indiceSector}"
                            data-manzana-index="${indiceManzana}"
                        >${escaparHTML(resumen.observaciones || "")}</textarea>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function calcularViviendasVisitadas(resumen = {}) {
    return enteroSeguro(resumen.viviendas_trabajadas) +
        enteroSeguro(resumen.viviendas_cerradas) +
        enteroSeguro(resumen.viviendas_deshabitadas) +
        enteroSeguro(resumen.viviendas_renuentes);
}

function crearCampoResumen(campo, etiqueta, resumen, indiceSector, indiceManzana) {
    return `
        <div class="form-group">
            <label>${escaparHTML(etiqueta)}</label>
            <input
                type="number"
                min="0"
                step="1"
                value="${enteroSeguro(resumen[campo])}"
                data-resumen-campo="${campo}"
                data-sector-index="${indiceSector}"
                data-manzana-index="${indiceManzana}"
            >
        </div>
    `;
}

function crearPasoActividades() {
    if (contarManzanas() === 0) {
        return crearBloqueSinManzanas();
    }

    return `
        <div class="step-panel">
            <header class="step-panel__header">
                <div>
                    <p class="step-panel__eyebrow">Paso 3</p>
                    <h2>Actividades por manzana</h2>
                    <p>Registre las actividades consolidadas de cada manzana.</p>
                </div>
            </header>

            <div class="accordion-list">
                ${ESTADO.jornada.sectores.map((sector, indiceSector) => `
                    <section class="accordion-card">
                        <header class="accordion-card__header">
                            <div>
                                <h3>Sector ${escaparHTML(sector.sector || "sin clave")}</h3>
                                <p>${sector.manzanas.length} manzana(s)</p>
                            </div>
                        </header>

                        <div class="accordion-card__body">
                            ${sector.manzanas.map((manzana, indiceManzana) =>
                                crearActividadesManzana(manzana, indiceSector, indiceManzana)
                            ).join("")}
                        </div>
                    </section>
                `).join("")}
            </div>
        </div>
    `;
}

function crearActividadesManzana(manzana, indiceSector, indiceManzana) {
    return `
        <article class="activity-housing">
            <header class="activity-housing__header">
                <div>
                    <strong>Manzana ${escaparHTML(manzana.manzana || indiceManzana + 1)}</strong>
                    <small>${manzana.actividades.length} actividad(es)</small>
                </div>
                <button
                    class="button button--primary"
                    type="button"
                    data-agregar-actividad="true"
                    data-sector-index="${indiceSector}"
                    data-manzana-index="${indiceManzana}"
                >Agregar actividad</button>
            </header>

            <div class="activity-list">
                ${manzana.actividades.length === 0
                    ? `<p class="empty-message">No hay actividades registradas.</p>`
                    : manzana.actividades.map((actividad, indiceActividad) =>
                        crearTarjetaActividad(actividad, indiceSector, indiceManzana, indiceActividad)
                    ).join("")}
            </div>
        </article>
    `;
}

function crearTarjetaActividad(actividad, indiceSector, indiceManzana, indiceActividad) {
    const tipos = obtenerTiposActividadPrograma();

    return `
        <section class="activity-card">
            <header class="activity-card__header">
                <div>
                    <span>Actividad ${indiceActividad + 1}</span>
                    <strong>${escaparHTML(obtenerNombreTipoActividad(actividad.tipo_actividad_id) || "Sin seleccionar")}</strong>
                </div>
                <button
                    class="button button--danger"
                    type="button"
                    data-eliminar-actividad="${indiceActividad}"
                    data-sector-index="${indiceSector}"
                    data-manzana-index="${indiceManzana}"
                >Eliminar</button>
            </header>

            <div class="form-grid">
                <div class="form-group">
                    <label>Tipo de actividad</label>
                    <select
                        data-actividad-campo="tipo_actividad_id"
                        data-sector-index="${indiceSector}"
                        data-manzana-index="${indiceManzana}"
                        data-actividad-index="${indiceActividad}"
                    >
                        <option value="">Seleccione</option>
                        ${tipos.map(tipo => `
                            <option
                                value="${escaparHTML(tipo.id)}"
                                ${tipo.id === actividad.tipo_actividad_id ? "selected" : ""}
                            >${escaparHTML(tipo.nombre)}</option>
                        `).join("")}
                    </select>
                </div>

                ${crearCampoActividadTexto("fecha", "Fecha", "date", actividad, indiceSector, indiceManzana, indiceActividad)}
                ${crearCampoActividadTexto("brigadista1", "Brigadista 1", "text", actividad, indiceSector, indiceManzana, indiceActividad)}
                ${crearCampoActividadTexto("brigadista2", "Brigadista 2", "text", actividad, indiceSector, indiceManzana, indiceActividad)}
                ${crearCampoActividadTexto("supervisor", "Supervisor", "text", actividad, indiceSector, indiceManzana, indiceActividad)}

                ${crearCamposSegunActividad(
                    obtenerCodigoTipoActividad(actividad.tipo_actividad_id),
                    actividad,
                    indiceSector,
                    indiceManzana,
                    indiceActividad
                )}

                <div class="form-group form-group--full">
                    <label>Observaciones</label>
                    <textarea
                        rows="2"
                        maxlength="500"
                        data-actividad-campo="observaciones"
                        data-sector-index="${indiceSector}"
                        data-manzana-index="${indiceManzana}"
                        data-actividad-index="${indiceActividad}"
                    >${escaparHTML(actividad.observaciones || "")}</textarea>
                </div>
            </div>

            ${actividadPermiteInsumos(actividad.tipo_actividad_id)
                ? crearFormularioInsumos(actividad, indiceSector, indiceManzana, indiceActividad)
                : ""}
        </section>
    `;
}


function obtenerCodigoTipoActividad(tipoActividadId) {
    return obtenerTiposActividadPrograma()
        .find(tipo => tipo.id === tipoActividadId)
        ?.codigo || "";
}

function crearCamposSegunActividad(
    codigoActividad,
    actividad,
    indiceSector,
    indiceManzana,
    indiceActividad
) {
    const codigo =
        String(
            codigoActividad || ""
        )
        .trim()
        .toUpperCase();

    if (!codigo) {
        return `
            <p class="form-help form-group--full">
                Seleccione el tipo de actividad para mostrar sus campos específicos.
            </p>
        `;
    }

    const contiene =
        texto =>
            codigo.includes(texto);


    /*
    ==========================================================
    ENCUESTA / ENTOMOLOGÍA
    ==========================================================
    */

    if (
        contiene("ENCUESTA") ||
        contiene("ENTOMO") ||
        contiene("GARRAPATA") ||
        contiene("MUESTRA")
    ) {
        return `

            ${crearCampoActividadNumero(
                "viviendas_encuestadas",
                "Viviendas encuestadas",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumero(
                "viviendas_inspeccionadas",
                "Viviendas inspeccionadas",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumero(
                "viviendas_con_garrapata",
                "Viviendas con garrapata",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumero(
                "perros_inspeccionados",
                "Perros inspeccionados",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumero(
                "perros_con_garrapata",
                "Perros con garrapata",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumero(
                "gatos_inspeccionados",
                "Gatos inspeccionados",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumero(
                "gatos_con_garrapata",
                "Gatos con garrapata",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumero(
                "garrapatas_en_viviendas",
                "Total de garrapatas en viviendas",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumero(
                "garrapatas_en_perros",
                "Total de garrapatas en perros",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumero(
                "garrapatas_en_gatos",
                "Total de garrapatas en gatos",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumero(
                "larvas_encontradas",
                "Larvas encontradas",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumero(
                "ninfas_encontradas",
                "Ninfas encontradas",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumero(
                "adultos_encontrados",
                "Adultos encontrados",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumero(
                "muestras_enviadas",
                "Muestras enviadas (garrapatas)",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumeroNullable(
                "garrapatas_positivas",
                "Garrapatas positivas (resultado)",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad,
                "Dejar vacío mientras el resultado esté pendiente."
            )}
        `;
    }


    /*
    ==========================================================
    ECTODESPARASITACIÓN
    ==========================================================
    */

    if (
        contiene("DESPARAS") ||
        contiene("ECTO") ||
        contiene("TRATAMIENTO")
    ) {
        return `

            ${crearCampoActividadNumero(
                "viviendas_ectodesparasitadas",
                "Viviendas ectodesparasitadas",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumero(
                "perros_intervenidos",
                "Perros desparasitados",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumero(
                "gatos_intervenidos",
                "Gatos desparasitados",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}
        `;
    }


    /*
    ==========================================================
    ROCIADO
    ==========================================================
    */

    if (
        contiene("ROCI") ||
        contiene("INSECTICIDA")
    ) {
        return `

            ${crearCampoActividadNumero(
                "viviendas_rociadas",
                "Viviendas rociadas",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}
        `;
    }



    /*
    ==========================================================
    ESTERILIZACIÓN
    ==========================================================
    */

    if (
        contiene("ESTERIL")
    ) {
        return `

            ${crearCampoActividadNumero(
                "perros_intervenidos",
                "Perros esterilizados",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumero(
                "gatos_intervenidos",
                "Gatos esterilizados",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearRangosEsterilizacionActividad(
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}
        `;
    }


    /*
    ==========================================================
    VACUNACIÓN
    ==========================================================
    */

    if (
        contiene("VACUN")
    ) {
        return `

            ${crearCampoActividadNumero(
                "perros_intervenidos",
                "Perros vacunados",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}

            ${crearCampoActividadNumero(
                "gatos_intervenidos",
                "Gatos vacunados",
                actividad,
                indiceSector,
                indiceManzana,
                indiceActividad
            )}
        `;
    }


    /*
    ==========================================================
    OTROS
    ==========================================================
    */

    return `

        ${crearCampoActividadNumero(
            "viviendas_cubiertas",
            "Viviendas cubiertas",
            actividad,
            indiceSector,
            indiceManzana,
            indiceActividad
        )}

        ${crearCampoActividadNumero(
            "perros_intervenidos",
            "Perros intervenidos",
            actividad,
            indiceSector,
            indiceManzana,
            indiceActividad
        )}

        ${crearCampoActividadNumero(
            "gatos_intervenidos",
            "Gatos intervenidos",
            actividad,
            indiceSector,
            indiceManzana,
            indiceActividad
        )}
    `;
}

function crearCampoActividadTexto(campo, etiqueta, tipo, actividad, indiceSector, indiceManzana, indiceActividad) {
    return `
        <div class="form-group">
            <label>${escaparHTML(etiqueta)}</label>
            <input
                type="${tipo}"
                value="${escaparHTML(actividad[campo] || "")}"
                data-actividad-campo="${campo}"
                data-sector-index="${indiceSector}"
                data-manzana-index="${indiceManzana}"
                data-actividad-index="${indiceActividad}"
            >
        </div>
    `;
}

function crearCampoActividadNumero(campo, etiqueta, actividad, indiceSector, indiceManzana, indiceActividad) {
    return `
        <div class="form-group">
            <label>${escaparHTML(etiqueta)}</label>
            <input
                type="number"
                min="0"
                step="1"
                value="${enteroSeguro(actividad[campo])}"
                data-actividad-campo="${campo}"
                data-sector-index="${indiceSector}"
                data-manzana-index="${indiceManzana}"
                data-actividad-index="${indiceActividad}"
            >
        </div>
    `;
}


function crearCampoActividadNumeroNullable(
    campo,
    etiqueta,
    actividad,
    indiceSector,
    indiceManzana,
    indiceActividad,
    ayuda = ""
) {
    const valor =
        actividad[campo] === null ||
        actividad[campo] === undefined ||
        actividad[campo] === ""
            ? ""
            : enteroSeguro(
                actividad[campo]
            );

    return `
        <div class="form-group">
            <label>${escaparHTML(etiqueta)}</label>
            <input
                type="number"
                min="0"
                step="1"
                value="${valor}"
                data-actividad-campo="${campo}"
                data-actividad-nullable="true"
                data-sector-index="${indiceSector}"
                data-manzana-index="${indiceManzana}"
                data-actividad-index="${indiceActividad}"
            >
            ${
                ayuda
                    ? `<small class="form-help">${escaparHTML(ayuda)}</small>`
                    : ""
            }
        </div>
    `;
}


function actividadPermiteInsumos(tipoActividadId) {
    const codigo = String(
        obtenerCodigoTipoActividad(tipoActividadId) || ""
    )
        .trim()
        .toUpperCase();

    return (
        codigo.includes("ECTO") ||
        codigo.includes("DESPARAS") ||
        codigo.includes("TRATAMIENTO") ||
        codigo.includes("ROCI") ||
        codigo.includes("INSECTICIDA") ||
        codigo.includes("VACUN")
    );
}

function crearFormularioInsumos(
    actividad,
    indiceSector,
    indiceManzana,
    indiceActividad
) {
    return `
        <div class="activity-subsection">

            <div class="activity-subsection__header">

                <div>
                    <h4>Consumo de insumos</h4>

                    <p class="inventory-consumption-help">
                        Seleccione el lote. La presentación,
                        unidad y existencia se determinan
                        automáticamente.
                    </p>
                </div>

                <button
                    class="button button--secondary"
                    type="button"
                    data-agregar-insumo="true"
                    data-sector-index="${indiceSector}"
                    data-manzana-index="${indiceManzana}"
                    data-actividad-index="${indiceActividad}"
                >
                    Agregar insumo
                </button>

            </div>

            <div class="subrecord-list">

                ${
                    actividad.insumos.length === 0
                        ? `
                            <p class="empty-message">
                                No hay insumos registrados.
                            </p>
                        `
                        : actividad.insumos
                            .map(
                                (
                                    insumo,
                                    indiceInsumo
                                ) => {
                                    const lote =
                                        obtenerLoteInventario(
                                            insumo.lote_id
                                        );

                                    const unidad =
                                        obtenerUnidadLote(
                                            lote
                                        ) ||
                                        insumo.unidad ||
                                        "";

                                    const presentacion =
                                        obtenerPresentacionLote(
                                            lote
                                        ) ||
                                        insumo.presentacion ||
                                        "Sin presentación";

                                    const contenido =
                                        obtenerContenidoPresentacion(
                                            lote
                                        );

                                    const existencia =
                                        obtenerExistenciaLote(
                                            lote
                                        );

                                    const tipoCaptura =
                                        insumo.tipo_captura ||
                                        "UNIDAD_BASE";

                                    const cantidadCapturada =
                                        decimalSeguro(
                                            insumo
                                                .cantidad_capturada ??
                                            insumo.cantidad
                                        );

                                    const cantidadBase =
                                        calcularCantidadBaseConsumo(
                                            tipoCaptura,
                                            cantidadCapturada,
                                            contenido
                                        );

                                    const existenciaPosterior =
                                        existencia -
                                        cantidadBase;

                                    return `
                                        <div
                                            class="
                                                subrecord-row
                                                subrecord-row--consumption
                                            "
                                        >

                                            <div
                                                class="
                                                    form-group
                                                    form-group--full
                                                "
                                            >
                                                <label>
                                                    Insumo, presentación y lote
                                                </label>

                                                <select
                                                    data-insumo-campo="lote_id"
                                                    data-sector-index="${indiceSector}"
                                                    data-manzana-index="${indiceManzana}"
                                                    data-actividad-index="${indiceActividad}"
                                                    data-insumo-index="${indiceInsumo}"
                                                >
                                                    <option value="">
                                                        Seleccione
                                                    </option>

                                                    ${ESTADO.inventario
                                                        .map(
                                                            item => `
                                                                <option
                                                                    value="${escaparHTML(
                                                                        item.lote_id
                                                                    )}"
                                                                    ${
                                                                        item.lote_id ===
                                                                        insumo.lote_id
                                                                            ? "selected"
                                                                            : ""
                                                                    }
                                                                >
                                                                    ${escaparHTML(
                                                                        crearEtiquetaLoteInventario(
                                                                            item
                                                                        )
                                                                    )}
                                                                </option>
                                                            `
                                                        )
                                                        .join("")}
                                                </select>
                                            </div>

                                            <div class="form-group">
                                                <label>
                                                    Modo de captura
                                                </label>

                                                <select
                                                    data-insumo-campo="tipo_captura"
                                                    data-sector-index="${indiceSector}" 
                                                    data-manzana-index="${indiceManzana}"
                                                    data-actividad-index="${indiceActividad}"
                                                    data-insumo-index="${indiceInsumo}"
                                                    ${
                                                        !insumo.lote_id
                                                            ? "disabled"
                                                            : ""
                                                    }
                                                >
                                                    <option
                                                        value="UNIDAD_BASE"
                                                        ${
                                                            tipoCaptura !==
                                                            "PRESENTACION"
                                                                ? "selected"
                                                                : ""
                                                        }
                                                    >
                                                        Cantidad base
                                                        (${escaparHTML(
                                                            unidad ||
                                                            "unidad"
                                                        )})
                                                    </option>

                                                    <option
                                                        value="PRESENTACION"
                                                        ${
                                                            tipoCaptura ===
                                                            "PRESENTACION"
                                                                ? "selected"
                                                                : ""
                                                        }
                                                        ${
                                                            contenido > 0
                                                                ? ""
                                                                : ""
                                                        }
                                                    >
                                                        Por pieza /
                                                        presentación
                                                    </option>
                                                </select>
                                            </div>

                                            <div class="form-group">
                                                <label>
                                                    ${
                                                        tipoCaptura ===
                                                        "PRESENTACION"
                                                            ? "Número de piezas / presentaciones"
                                                            : "Cantidad utilizada"
                                                    }
                                                </label>

                                                <input
                                                    type="number"
                                                    min="${
                                                        tipoCaptura ===
                                                        "PRESENTACION"
                                                            ? "1"
                                                            : "0.000001"
                                                    }"
                                                    step="${
                                                        tipoCaptura ===
                                                        "PRESENTACION"
                                                            ? "1"
                                                            : "0.000001"
                                                    }"
                                                    value="${cantidadCapturada}"
                                                    data-insumo-campo="cantidad_capturada"
                                                    data-sector-index="${indiceSector}"
                                                    data-manzana-index="${indiceManzana}"
                                                    data-actividad-index="${indiceActividad}"
                                                    data-insumo-index="${indiceInsumo}"
                                                    ${
                                                        !insumo.lote_id
                                                            ? "disabled"
                                                            : ""
                                                    }
                                                >
                                            </div>

                                            <div class="form-group">
                                                <label>Unidad</label>

                                                <div class="readonly-field">
                                                    ${escaparHTML(
                                                        tipoCaptura ===
                                                        "PRESENTACION"
                                                            ? presentacion
                                                            : unidad ||
                                                              "—"
                                                    )}
                                                </div>
                                            </div>

                                            <div
                                                class="
                                                    consumption-summary
                                                    form-group--full
                                                "
                                                data-consumption-summary="true"
                                                data-sector-index="${indiceSector}"
                                                data-manzana-index="${indiceManzana}"
                                                data-actividad-index="${indiceActividad}"
                                                data-insumo-index="${indiceInsumo}"
                                            >
                                                <span>
                                                    <strong>
                                                        Presentación:
                                                    </strong>

                                                    ${escaparHTML(
                                                        presentacion
                                                    )}
                                                </span>

                                                <span>
                                                    <strong>
                                                        Disponible:
                                                    </strong>

                                                    ${formatearCantidad(
                                                        existencia
                                                    )}

                                                    ${escaparHTML(
                                                        unidad
                                                    )}
                                                </span>

                                                <span
                                                    data-consumption-base
                                                >
                                                    <strong>
                                                        Se descontará:
                                                    </strong>

                                                    ${formatearCantidad(
                                                        cantidadBase
                                                    )}

                                                    ${escaparHTML(
                                                        unidad
                                                    )}
                                                </span>

                                                <span
                                                    data-consumption-after
                                                >
                                                    <strong>
                                                        Existencia posterior:
                                                    </strong>

                                                    ${formatearCantidad(
                                                        existenciaPosterior
                                                    )}

                                                    ${escaparHTML(
                                                        unidad
                                                    )}
                                                </span>
                                            </div>

                                            ${
                                                esActividadVacunacion(actividad)
                                                    ? crearRangosVacunacionInsumo(
                                                        insumo,
                                                        indiceSector,
                                                        indiceManzana,
                                                        indiceActividad,
                                                        indiceInsumo
                                                    )
                                                    : ""
                                            }

                                            <button
                                                class="
                                                    button
                                                    button--danger
                                                "
                                                type="button"
                                                data-eliminar-insumo="${indiceInsumo}"
                                                data-sector-index="${indiceSector}"
                                                data-manzana-index="${indiceManzana}"
                                                data-actividad-index="${indiceActividad}"
                                            >
                                                Eliminar
                                            </button>

                                        </div>
                                    `;
                                }
                            )
                            .join("")
                }

            </div>

        </div>
    `;
}

function obtenerLoteInventario(loteId) {
    return ESTADO.inventario.find(item => item.lote_id === loteId) || null;
}

function obtenerUnidadLote(lote) {
    return normalizarTexto(lote?.unidad_medida || lote?.unidad);
}

function obtenerPresentacionLote(lote) {
    return normalizarTexto(
        lote?.presentacion_nombre ||
        lote?.presentacion ||
        lote?.nombre_presentacion
    );
}

function obtenerContenidoPresentacion(lote) {
    const contenido = Number(
        lote?.contenido_presentacion ??
        lote?.presentacion_contenido ??
        lote?.contenido_catalogo ??
        lote?.contenido ??
        lote?.cantidad_presentacion ??
        lote?.presentacion?.contenido ??
        0
    );

    return Number.isFinite(contenido) &&
        contenido > 0
        ? contenido
        : 0;
}

function obtenerExistenciaLote(lote) {
    const existencia = Number(lote?.existencia ?? lote?.disponible ?? 0);
    return Number.isFinite(existencia) ? existencia : 0;
}

function crearEtiquetaLoteInventario(item) {
    const producto = item.producto || item.nombre_producto || "Producto";
    const presentacion = obtenerPresentacionLote(item) || "Sin presentación";
    const lote = item.lote || item.numero_lote || "Sin lote";
    const existencia = obtenerExistenciaLote(item);
    const unidad = obtenerUnidadLote(item) || "";
    return `${producto} · ${presentacion} · Lote ${lote} · Disponible ${formatearCantidad(existencia)} ${unidad}`;
}

function calcularCantidadBaseConsumo(modo, cantidadCapturada, contenidoPresentacion) {
    const cantidad = decimalSeguro(cantidadCapturada);
    if (String(modo).toUpperCase() === "PRESENTACION") {
        return cantidad * decimalSeguro(contenidoPresentacion);
    }
    return cantidad;
}

function formatearCantidad(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) {
        return "0";
    }
    return new Intl.NumberFormat("es-MX", {
        maximumFractionDigits: 3
    }).format(numero);
}

function crearPasoResumen() {
    const resumen = calcularResumenJornada(ESTADO.jornada);

    return `
        <div class="step-panel">
            <header class="step-panel__header">
                <div>
                    <p class="step-panel__eyebrow">Paso 4</p>
                    <h2>Revisar y registrar</h2>
                    <p>Confirme la información antes de guardar.</p>
                </div>
            </header>

            <div class="review-grid">
                ${crearDatoResumen("Programa", obtenerNombrePrograma())}
                ${crearDatoResumen("Tipo de operativo", obtenerNombreTipoOperativo())}
                ${crearDatoResumen("Jurisdicción", ESTADO.operativo.cve_jur_res)}
                ${crearDatoResumen("Caso", ESTADO.operativo.folio_caso || "Sin caso")}
                ${crearDatoResumen("Fecha", ESTADO.jornada.fecha)}
                ${crearDatoResumen("Sectores", resumen.sectores)}
                ${crearDatoResumen("Manzanas", resumen.manzanas)}
                ${crearDatoResumen("Viviendas visitadas", resumen.viviendas_visitadas)}
                ${crearDatoResumen("Viviendas trabajadas", resumen.viviendas_trabajadas)}
                ${crearDatoResumen("Habitantes beneficiados", resumen.habitantes_beneficiados)}
                ${crearDatoResumen("Perros censados", resumen.perros_censados)}
                ${crearDatoResumen("Gatos censados", resumen.gatos_censados)}
                ${crearDatoResumen("Actividades", resumen.actividades)}
                ${crearDatoResumen("Consumos", resumen.insumos)}
            </div>
        </div>
    `;
}

function crearDatoResumen(etiqueta, valor) {
    return `
        <article class="review-card">
            <span>${escaparHTML(etiqueta)}</span>
            <strong>${escaparHTML(valor === null || valor === undefined || valor === "" ? "No especificado" : String(valor))}</strong>
        </article>
    `;
}

function registrarEventosGeneralesNuevo() {
    document.getElementById("btn-cambiar-modo-operativo")?.addEventListener(
        "click",
        renderizarSelectorModo
    );

    document.getElementById("btn-operation-home")?.addEventListener(
        "click",
        () => navegar("/inicio")
    );

    document.getElementById("btn-paso-anterior")?.addEventListener(
        "click",
        irPasoAnterior
    );

    document.getElementById("btn-paso-siguiente")?.addEventListener(
        "click",
        irPasoSiguiente
    );

    document.getElementById("btn-guardar-operativo")?.addEventListener(
        "click",
        guardarNuevoOperativo
    );

    document.querySelectorAll("[data-wizard-step]").forEach(boton => {
        boton.addEventListener("click", () => {
            const paso = Number(boton.dataset.wizardStep);
            if (paso >= 1 && paso <= ESTADO.pasoActual) {
                guardarCamposInformacionGeneral();
                ESTADO.pasoActual = paso;
                renderizarFormularioNuevo();
            }
        });
    });
}

function registrarEventosPasoActual() {
    switch (ESTADO.pasoActual) {
        case 1:
            registrarEventosInformacionGeneral();
            break;
        case 2:
            registrarEventosSectoresManzanas();
            break;
        case 3:
            registrarEventosActividades();
            break;
        default:
            break;
    }
}

function registrarEventosInformacionGeneral() {
    const campos = {
        programa_id: "operativo-programa",
        tipo_operativo_id: "operativo-tipo",
        fecha_inicio: "operativo-fecha-inicio",
        nombre_referencia: "operativo-nombre-referencia",
        cve_mpo_res: "operativo-municipio",
        localidad: "operativo-localidad",
        domicilio: "operativo-domicilio",
        motivo: "operativo-motivo",
        observaciones: "operativo-observaciones"
    };

    Object.entries(campos).forEach(([campo, id]) => {
        const elemento = document.getElementById(id);
        const actualizar = async () => {
            ESTADO.operativo[campo] = normalizarTexto(elemento?.value);

            if (campo === "programa_id") {
                limpiarActividadesIncompatibles();
            }

            if (campo === "cve_jur_res") {
                ESTADO.casoSeleccionado = null;
                ESTADO.operativo.folio_caso = null;
                await cargarInventario();
            }
        };

        elemento?.addEventListener("change", actualizar);
        elemento?.addEventListener("input", () => {
            ESTADO.operativo[campo] = normalizarTexto(elemento.value);
        });
    });

    const selectorJurisdiccion = document.getElementById("operativo-jurisdiccion");
    selectorJurisdiccion?.addEventListener("change", async evento => {
        ESTADO.operativo.cve_jur_res = normalizarTexto(evento.target.value);
        ESTADO.casoSeleccionado = null;
        ESTADO.operativo.folio_caso = null;
        await cargarInventario();
    });

    const fecha = document.getElementById("operativo-fecha-inicio");
    fecha?.addEventListener("change", () => {
        ESTADO.operativo.fecha_inicio = normalizarTexto(fecha.value);
        ESTADO.jornada.fecha = ESTADO.operativo.fecha_inicio;
        actualizarFechasActividades();
    });

    document.getElementById("btn-buscar-casos")?.addEventListener("click", ejecutarBusquedaCasos);
    document.getElementById("caso-busqueda")?.addEventListener("keydown", evento => {
        if (evento.key === "Enter") {
            evento.preventDefault();
            ejecutarBusquedaCasos();
        }
    });

    document.getElementById("btn-quitar-caso")?.addEventListener("click", () => {
        ESTADO.casoSeleccionado = null;
        ESTADO.operativo.folio_caso = null;
        renderizarFormularioNuevo();
    });
}

function registrarEventosSectoresManzanas() {
    document.getElementById("btn-agregar-sector")?.addEventListener("click", () => {
        ESTADO.jornada.sectores.push(crearSectorInicial());
        renderizarCapturaJornadaActual();
    });

    document.querySelectorAll("[data-eliminar-sector]").forEach(boton => {
        boton.addEventListener("click", () => {
            ESTADO.jornada.sectores.splice(Number(boton.dataset.eliminarSector), 1);
            renderizarCapturaJornadaActual();
        });
    });

    document.querySelectorAll("[data-sector-campo]").forEach(elemento => {
        elemento.addEventListener("input", () => {
            const sector = ESTADO.jornada.sectores[Number(elemento.dataset.sectorIndex)];
            if (sector) {
                sector[elemento.dataset.sectorCampo] = normalizarTexto(elemento.value) || "";
            }
        });
    });

    document.querySelectorAll("[data-agregar-manzana]").forEach(boton => {
        boton.addEventListener("click", () => {
            const sector = ESTADO.jornada.sectores[Number(boton.dataset.agregarManzana)];
            sector?.manzanas.push(crearManzanaInicial());
            renderizarCapturaJornadaActual();
        });
    });

    document.querySelectorAll("[data-eliminar-manzana]").forEach(boton => {
        boton.addEventListener("click", () => {
            const sector = ESTADO.jornada.sectores[Number(boton.dataset.sectorIndex)];
            sector?.manzanas.splice(Number(boton.dataset.eliminarManzana), 1);
            renderizarCapturaJornadaActual();
        });
    });

    document.querySelectorAll("[data-manzana-campo]").forEach(elemento => {
        elemento.addEventListener("input", () => {
            const manzana = obtenerManzanaPorElemento(elemento);
            if (manzana) {
                manzana[elemento.dataset.manzanaCampo] = normalizarTexto(elemento.value) || "";
            }
        });
    });

    document.querySelectorAll("[data-resumen-campo]").forEach(elemento => {
        const evento = elemento.type === "number" ? "input" : "input";
        elemento.addEventListener(evento, () => {
            const manzana = obtenerManzanaPorElemento(elemento);
            const campo = elemento.dataset.resumenCampo;
            if (!manzana || !campo) {
                return;
            }

            manzana.resumen[campo] = elemento.type === "number"
                ? enteroSeguro(elemento.value)
                : normalizarTexto(elemento.value);
        });
    });
}

function registrarEventosActividades() {
    document.querySelectorAll("[data-agregar-actividad]").forEach(boton => {
        boton.addEventListener("click", () => {
            const manzana = obtenerManzanaPorElemento(boton);
            manzana?.actividades.push(crearActividadInicial());
            renderizarCapturaJornadaActual();
        });
    });

    document.querySelectorAll("[data-eliminar-actividad]").forEach(boton => {
        boton.addEventListener("click", () => {
            const manzana = obtenerManzanaPorElemento(boton);
            manzana?.actividades.splice(Number(boton.dataset.eliminarActividad), 1);
            renderizarCapturaJornadaActual();
        });
    });

    document.querySelectorAll("[data-actividad-campo]").forEach(elemento => {
        const evento = elemento.tagName === "SELECT" ? "change" : "input";
        elemento.addEventListener(evento, () => {
            const actividad = obtenerActividadPorElemento(elemento);
            const campo = elemento.dataset.actividadCampo;
            if (!actividad || !campo) {
                return;
            }

            actividad[campo] =
                elemento.type === "number"
                    ? (
                        elemento.dataset.actividadNullable === "true" &&
                        elemento.value === ""
                            ? null
                            : enteroSeguro(elemento.value)
                    )
                    : normalizarTexto(elemento.value);

            if (campo === "tipo_actividad_id") {
                renderizarCapturaJornadaActual();
            }
        });
    });

    document.querySelectorAll("[data-agregar-insumo]").forEach(boton => {
        boton.addEventListener("click", () => {
            const actividad = obtenerActividadPorElemento(boton);
            actividad?.insumos.push(crearInsumoInicial());
            renderizarCapturaJornadaActual();
        });
    });

    document.querySelectorAll("[data-eliminar-insumo]").forEach(boton => {
        boton.addEventListener("click", () => {
            const actividad = obtenerActividadPorElemento(boton);
            actividad?.insumos.splice(Number(boton.dataset.eliminarInsumo), 1);
            renderizarCapturaJornadaActual();
        });
    });

    document.querySelectorAll("[data-insumo-campo]").forEach(elemento => {
        elemento.addEventListener(elemento.tagName === "SELECT" ? "change" : "input", () => {
            const insumo = obtenerInsumoPorElemento(elemento);
            const campo = elemento.dataset.insumoCampo;
            if (!insumo || !campo) {
                return;
            }

            if (campo === "cantidad_capturada") {
                insumo.cantidad_capturada = decimalSeguro(elemento.value);
            } else {
                insumo[campo] = normalizarTexto(elemento.value);
            }

           if (campo === "lote_id") {
    const lote =
        obtenerLoteInventario(
            insumo.lote_id
        );

    insumo.unidad =
        obtenerUnidadLote(
            lote
        );

    insumo.presentacion =
        obtenerPresentacionLote(
            lote
        );

    insumo.contenido_presentacion =
        obtenerContenidoPresentacion(
            lote
        );

    insumo.existencia_disponible =
        obtenerExistenciaLote(
            lote
        );

    /*
     * Al cambiar de lote se inicia en unidad base.
     * El usuario todavía puede cambiar después
     * a PRESENTACION desde el selector.
     */
    insumo.tipo_captura =
        "UNIDAD_BASE";

    insumo.cantidad_capturada = 0;
    insumo.cantidad = 0;
}

            const contenido = decimalSeguro(insumo.contenido_presentacion);
            insumo.cantidad = calcularCantidadBaseConsumo(
                insumo.tipo_captura,
                insumo.cantidad_capturada,
                contenido
            );

            if (campo === "cantidad_capturada") {
                actualizarResumenConsumoEnFila(elemento, insumo);
                return;
            }

            const posicionScroll = window.scrollY;
            renderizarCapturaJornadaActual();
            requestAnimationFrame(() => {
                window.scrollTo({
                    top: posicionScroll,
                    behavior: "auto"
                });
            });
        });
    });

    registrarEventosRangosVacunacion();
    registrarEventosRangosEsterilizacion();
}

function actualizarResumenConsumoEnFila(elemento, insumo) {
    const selector = [
        '[data-consumption-summary="true"]',
        `[data-sector-index="${elemento.dataset.sectorIndex}"]`,
        `[data-manzana-index="${elemento.dataset.manzanaIndex}"]`,
        `[data-actividad-index="${elemento.dataset.actividadIndex}"]`,
        `[data-insumo-index="${elemento.dataset.insumoIndex}"]`
    ].join("");

    const resumen = document.querySelector(selector);
    if (!resumen) {
        return;
    }

    const existencia = decimalSeguro(insumo.existencia_disponible);
    const cantidadBase = decimalSeguro(insumo.cantidad);
    const unidad = normalizarTexto(insumo.unidad) || "";
    const existenciaPosterior = Math.max(0, existencia - cantidadBase);

    const base = resumen.querySelector("[data-consumption-base]");
    const posterior = resumen.querySelector("[data-consumption-after]");

    if (base) {
        base.innerHTML = `<strong>Se descontará:</strong> ${formatearCantidad(cantidadBase)} ${escaparHTML(unidad)}`;
    }

    if (posterior) {
        posterior.innerHTML = `<strong>Existencia posterior:</strong> ${formatearCantidad(existenciaPosterior)} ${escaparHTML(unidad)}`;
    }
}



/*
==========================================================
ESTERILIZACIÓN - FOLIOS POR ACTIVIDAD
==========================================================
*/

function esActividadEsterilizacion(actividad) {
    const codigo =
        String(
            obtenerCodigoTipoActividad(
                actividad?.tipo_actividad_id
            ) || ""
        )
            .trim()
            .toUpperCase();

    return codigo.includes("ESTERIL");
}

function crearRangoEsterilizacionInicial() {
    return {
        id: null,
        folio_desde: null,
        folio_hasta: null
    };
}

function obtenerRangosEsterilizacion(actividad) {
    if (!Array.isArray(actividad.rangos_esterilizacion)) {
        actividad.rangos_esterilizacion = [];
    }

    return actividad.rangos_esterilizacion;
}

function crearRangosEsterilizacionActividad(
    actividad,
    indiceSector,
    indiceManzana,
    indiceActividad
) {
    const rangos =
        obtenerRangosEsterilizacion(
            actividad
        );

    const total =
        rangos.reduce(
            (suma, rango) =>
                suma +
                cantidadFoliosRango(
                    rango
                ),
            0
        );

    return `
        <div class="form-group form-group--full">

            <label>
                Folios de esterilización
            </label>

            <p class="inventory-consumption-help">
                Total:
                ${total} folio(s).
            </p>

            <div class="subrecord-list">

                ${
                    rangos.length === 0
                        ? `
                            <p class="empty-message">
                                No hay rangos de folios registrados.
                            </p>
                        `
                        : rangos
                            .map(
                                (
                                    rango,
                                    indiceRango
                                ) => `
                                    <div class="subrecord-row">

                                        <div class="form-group">
                                            <label>
                                                Folio desde
                                            </label>

                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value="${rango.folio_desde ?? ""}"
                                                data-rango-esterilizacion-campo="folio_desde"
                                                data-sector-index="${indiceSector}"
                                                data-manzana-index="${indiceManzana}"
                                                data-actividad-index="${indiceActividad}"
                                                data-rango-index="${indiceRango}"
                                            >
                                        </div>

                                        <div class="form-group">
                                            <label>
                                                Folio hasta
                                            </label>

                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value="${rango.folio_hasta ?? ""}"
                                                data-rango-esterilizacion-campo="folio_hasta"
                                                data-sector-index="${indiceSector}"
                                                data-manzana-index="${indiceManzana}"
                                                data-actividad-index="${indiceActividad}"
                                                data-rango-index="${indiceRango}"
                                            >
                                        </div>

                                        <div class="form-group">
                                            <label>
                                                Cantidad
                                            </label>

                                            <input
                                                type="number"
                                                value="${cantidadFoliosRango(rango)}"
                                                readonly
                                            >
                                        </div>

                                        <button
                                            class="button button--danger"
                                            type="button"
                                            data-eliminar-rango-esterilizacion="${indiceRango}"
                                            data-sector-index="${indiceSector}"
                                            data-manzana-index="${indiceManzana}"
                                            data-actividad-index="${indiceActividad}"
                                        >
                                            Eliminar rango
                                        </button>

                                    </div>
                                `
                            )
                            .join("")
                }

            </div>

            <button
                class="button button--secondary"
                type="button"
                data-agregar-rango-esterilizacion="true"
                data-sector-index="${indiceSector}"
                data-manzana-index="${indiceManzana}"
                data-actividad-index="${indiceActividad}"
            >
                Agregar rango de folios
            </button>

        </div>
    `;
}

function obtenerRangoEsterilizacionPorElemento(elemento) {
    const actividad =
        obtenerActividadPorElemento(
            elemento
        );

    if (!actividad) {
        return null;
    }

    return obtenerRangosEsterilizacion(
        actividad
    )[
        Number(
            elemento.dataset.rangoIndex
        )
    ] || null;
}

function registrarEventosRangosEsterilizacion() {

    document
        .querySelectorAll(
            "[data-agregar-rango-esterilizacion]"
        )
        .forEach(
            boton => {
                boton.addEventListener(
                    "click",
                    () => {
                        const actividad =
                            obtenerActividadPorElemento(
                                boton
                            );

                        if (!actividad) {
                            return;
                        }

                        obtenerRangosEsterilizacion(
                            actividad
                        ).push(
                            crearRangoEsterilizacionInicial()
                        );

                        renderizarCapturaJornadaActual();
                    }
                );
            }
        );

    document
        .querySelectorAll(
            "[data-eliminar-rango-esterilizacion]"
        )
        .forEach(
            boton => {
                boton.addEventListener(
                    "click",
                    () => {
                        const actividad =
                            obtenerActividadPorElemento(
                                boton
                            );

                        if (!actividad) {
                            return;
                        }

                        obtenerRangosEsterilizacion(
                            actividad
                        ).splice(
                            Number(
                                boton.dataset
                                    .eliminarRangoEsterilizacion
                            ),
                            1
                        );

                        renderizarCapturaJornadaActual();
                    }
                );
            }
        );

    document
        .querySelectorAll(
            "[data-rango-esterilizacion-campo]"
        )
        .forEach(
            elemento => {
                elemento.addEventListener(
                    "input",
                    () => {
                        const rango =
                            obtenerRangoEsterilizacionPorElemento(
                                elemento
                            );

                        const campo =
                            elemento.dataset
                                .rangoEsterilizacionCampo;

                        if (
                            !rango ||
                            !campo
                        ) {
                            return;
                        }

                        rango[campo] =
                            elemento.value === ""
                                ? null
                                : enteroSeguro(
                                    elemento.value
                                );
                    }
                );

                elemento.addEventListener(
                    "change",
                    () => {
                        const posicionScroll =
                            window.scrollY;

                        renderizarCapturaJornadaActual();

                        requestAnimationFrame(
                            () => {
                                window.scrollTo({
                                    top:
                                        posicionScroll,
                                    behavior:
                                        "auto"
                                });
                            }
                        );
                    }
                );
            }
        );
}

function validarRangosEsterilizacion(
    actividad,
    manzana
) {
    const rangos =
        obtenerRangosEsterilizacion(
            actividad
        );

    if (rangos.length === 0) {
        throw new Error(
            `La esterilización de la manzana ${manzana} debe registrar al menos un rango de folios.`
        );
    }

    const foliosUsados =
        new Set();

    rangos.forEach(
        (
            rango,
            indiceRango
        ) => {
            const desde =
                enteroSeguro(
                    rango.folio_desde
                );

            const hasta =
                enteroSeguro(
                    rango.folio_hasta
                );

            if (
                desde <= 0 ||
                hasta <= 0
            ) {
                throw new Error(
                    `Complete el rango ${indiceRango + 1} de esterilización.`
                );
            }

            if (hasta < desde) {
                throw new Error(
                    `El folio final ${hasta} no puede ser menor que el folio inicial ${desde}.`
                );
            }

            for (
                let folio = desde;
                folio <= hasta;
                folio += 1
            ) {
                if (
                    foliosUsados.has(
                        folio
                    )
                ) {
                    throw new Error(
                        `El folio ${folio} de esterilización está registrado más de una vez.`
                    );
                }

                foliosUsados.add(
                    folio
                );
            }
        }
    );
}


/*
==========================================================
VACUNACIÓN - FOLIOS POR LOTE
==========================================================
*/

function esActividadVacunacion(actividad) {
    const codigo =
        String(
            obtenerCodigoTipoActividad(
                actividad?.tipo_actividad_id
            ) || ""
        )
            .trim()
            .toUpperCase();

    return codigo.includes("VACUN");
}

function crearRangoVacunacionInicial() {
    return {
        id: null,
        folio_desde: null,
        folio_hasta: null
    };
}

function obtenerRangosVacunacion(insumo) {
    if (!Array.isArray(insumo.rangos_folios)) {
        insumo.rangos_folios = [];
    }

    return insumo.rangos_folios;
}

function cantidadFoliosRango(rango) {
    const desde =
        enteroSeguro(
            rango?.folio_desde
        );

    const hasta =
        enteroSeguro(
            rango?.folio_hasta
        );

    if (
        desde <= 0 ||
        hasta < desde
    ) {
        return 0;
    }

    return hasta - desde + 1;
}

function crearRangosVacunacionInsumo(
    insumo,
    indiceSector,
    indiceManzana,
    indiceActividad,
    indiceInsumo
) {
    const rangos =
        obtenerRangosVacunacion(
            insumo
        );

    const total =
        rangos.reduce(
            (suma, rango) =>
                suma +
                cantidadFoliosRango(
                    rango
                ),
            0
        );

    return `
        <div class="form-group form-group--full">

            <label>
                Folios de vacunación asociados a este lote
            </label>

            <p class="inventory-consumption-help">
                Total asociado al lote:
                ${total} folio(s).
            </p>

            <div class="subrecord-list">

                ${
                    rangos.length === 0
                        ? `
                            <p class="empty-message">
                                No hay rangos de folios registrados.
                            </p>
                        `
                        : rangos
                            .map(
                                (
                                    rango,
                                    indiceRango
                                ) => `
                                    <div class="subrecord-row">

                                        <div class="form-group">
                                            <label>
                                                Folio desde
                                            </label>

                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value="${rango.folio_desde ?? ""}"
                                                data-rango-vacunacion-campo="folio_desde"
                                                data-sector-index="${indiceSector}"
                                                data-manzana-index="${indiceManzana}"
                                                data-actividad-index="${indiceActividad}"
                                                data-insumo-index="${indiceInsumo}"
                                                data-rango-index="${indiceRango}"
                                            >
                                        </div>

                                        <div class="form-group">
                                            <label>
                                                Folio hasta
                                            </label>

                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value="${rango.folio_hasta ?? ""}"
                                                data-rango-vacunacion-campo="folio_hasta"
                                                data-sector-index="${indiceSector}"
                                                data-manzana-index="${indiceManzana}"
                                                data-actividad-index="${indiceActividad}"
                                                data-insumo-index="${indiceInsumo}"
                                                data-rango-index="${indiceRango}"
                                            >
                                        </div>

                                        <div class="form-group">
                                            <label>
                                                Cantidad
                                            </label>

                                            <input
                                                type="number"
                                                value="${cantidadFoliosRango(rango)}"
                                                readonly
                                            >
                                        </div>

                                        <button
                                            class="button button--danger"
                                            type="button"
                                            data-eliminar-rango-vacunacion="${indiceRango}"
                                            data-sector-index="${indiceSector}"
                                            data-manzana-index="${indiceManzana}"
                                            data-actividad-index="${indiceActividad}"
                                            data-insumo-index="${indiceInsumo}"
                                        >
                                            Eliminar rango
                                        </button>

                                    </div>
                                `
                            )
                            .join("")
                }

            </div>

            <button
                class="button button--secondary"
                type="button"
                data-agregar-rango-vacunacion="true"
                data-sector-index="${indiceSector}"
                data-manzana-index="${indiceManzana}"
                data-actividad-index="${indiceActividad}"
                data-insumo-index="${indiceInsumo}"
                ${!insumo.lote_id ? "disabled" : ""}
            >
                Agregar rango de folios
            </button>

        </div>
    `;
}

function obtenerRangoVacunacionPorElemento(elemento) {
    const insumo =
        obtenerInsumoPorElemento(
            elemento
        );

    if (!insumo) {
        return null;
    }

    return obtenerRangosVacunacion(
        insumo
    )[
        Number(
            elemento.dataset.rangoIndex
        )
    ] || null;
}

function marcarInsumoVacunacionModificado(insumo) {
    if (
        insumo?.id &&
        String(
            insumo.accion ||
            "SIN_CAMBIO"
        )
            .trim()
            .toUpperCase() ===
            "SIN_CAMBIO"
    ) {
        insumo.accion =
            "REEMPLAZAR";
    }
}

function registrarEventosRangosVacunacion() {

    document
        .querySelectorAll(
            "[data-agregar-rango-vacunacion]"
        )
        .forEach(
            boton => {
                boton.addEventListener(
                    "click",
                    () => {
                        const insumo =
                            obtenerInsumoPorElemento(
                                boton
                            );

                        if (!insumo) {
                            return;
                        }

                        obtenerRangosVacunacion(
                            insumo
                        ).push(
                            crearRangoVacunacionInicial()
                        );

                        marcarInsumoVacunacionModificado(
                            insumo
                        );

                        renderizarCapturaJornadaActual();
                    }
                );
            }
        );

    document
        .querySelectorAll(
            "[data-eliminar-rango-vacunacion]"
        )
        .forEach(
            boton => {
                boton.addEventListener(
                    "click",
                    () => {
                        const insumo =
                            obtenerInsumoPorElemento(
                                boton
                            );

                        if (!insumo) {
                            return;
                        }

                        obtenerRangosVacunacion(
                            insumo
                        ).splice(
                            Number(
                                boton.dataset
                                    .eliminarRangoVacunacion
                            ),
                            1
                        );

                        marcarInsumoVacunacionModificado(
                            insumo
                        );

                        renderizarCapturaJornadaActual();
                    }
                );
            }
        );

    document
        .querySelectorAll(
            "[data-rango-vacunacion-campo]"
        )
        .forEach(
            elemento => {
                elemento.addEventListener(
                    "input",
                    () => {
                        const insumo =
                            obtenerInsumoPorElemento(
                                elemento
                            );

                        const rango =
                            obtenerRangoVacunacionPorElemento(
                                elemento
                            );

                        const campo =
                            elemento.dataset
                                .rangoVacunacionCampo;

                        if (
                            !insumo ||
                            !rango ||
                            !campo
                        ) {
                            return;
                        }

                        rango[campo] =
                            elemento.value === ""
                                ? null
                                : enteroSeguro(
                                    elemento.value
                                );

                        marcarInsumoVacunacionModificado(
                            insumo
                        );
                    }
                );

                elemento.addEventListener(
                    "change",
                    () => {
                        const posicionScroll =
                            window.scrollY;

                        renderizarCapturaJornadaActual();

                        requestAnimationFrame(
                            () => {
                                window.scrollTo({
                                    top:
                                        posicionScroll,
                                    behavior:
                                        "auto"
                                });
                            }
                        );
                    }
                );
            }
        );
}

function validarRangosVacunacion(
    actividad,
    manzana
) {
    const insumos =
        obtenerArreglo(
            actividad?.insumos
        );

    if (insumos.length === 0) {
        throw new Error(
            `La vacunación de la manzana ${manzana} debe registrar al menos un lote de vacuna.`
        );
    }

    const foliosUsados =
        new Set();

    insumos.forEach(
        (
            insumo,
            indiceInsumo
        ) => {
            const rangos =
                obtenerRangosVacunacion(
                    insumo
                );

            if (rangos.length === 0) {
                throw new Error(
                    `Registre al menos un rango de folios para el lote ${indiceInsumo + 1} de vacunación.`
                );
            }

            rangos.forEach(
                (
                    rango,
                    indiceRango
                ) => {
                    const desde =
                        enteroSeguro(
                            rango.folio_desde
                        );

                    const hasta =
                        enteroSeguro(
                            rango.folio_hasta
                        );

                    if (
                        desde <= 0 ||
                        hasta <= 0
                    ) {
                        throw new Error(
                            `Complete el rango ${indiceRango + 1} del lote ${indiceInsumo + 1} de vacunación.`
                        );
                    }

                    if (hasta < desde) {
                        throw new Error(
                            `El folio final ${hasta} no puede ser menor que el folio inicial ${desde}.`
                        );
                    }

                    for (
                        let folio = desde;
                        folio <= hasta;
                        folio += 1
                    ) {
                        if (
                            foliosUsados.has(
                                folio
                            )
                        ) {
                            throw new Error(
                                `El folio ${folio} de vacunación está registrado más de una vez.`
                            );
                        }

                        foliosUsados.add(
                            folio
                        );
                    }
                }
            );
        }
    );
}


function irPasoAnterior() {
    guardarCamposInformacionGeneral();
    if (ESTADO.pasoActual > 1) {
        ESTADO.pasoActual -= 1;
        renderizarFormularioNuevo();
    }
}

async function irPasoSiguiente() {
    guardarCamposInformacionGeneral();

    try {
        validarPasoActual();

        if (ESTADO.pasoActual === 1) {
            await cargarInventario();
        }

        if (ESTADO.pasoActual < PASOS.length) {
            ESTADO.pasoActual += 1;
            renderizarFormularioNuevo();
        }
    } catch (error) {
        mostrarMensajeGlobal(error?.message || "Revise la información.", true);
    }
}

function validarPasoActual() {
    switch (ESTADO.pasoActual) {
        case 1:
            validarInformacionGeneral();
            break;
        case 2:
            validarSectoresManzanas();
            break;
        case 3:
            validarActividades();
            break;
        default:
            break;
    }
}

function validarInformacionGeneral() {
    if (!ESTADO.operativo.programa_id) {
        throw new Error("Seleccione el programa.");
    }
    if (!ESTADO.operativo.tipo_operativo_id) {
        throw new Error("Seleccione el tipo de operativo.");
    }
    if (!ESTADO.operativo.cve_jur_res) {
        throw new Error("Seleccione la jurisdicción.");
    }
    if (!ESTADO.operativo.fecha_inicio) {
        throw new Error("Ingrese la fecha de la jornada.");
    }
    if (ESTADO.modoRegistro === MODOS.CASO && !ESTADO.operativo.folio_caso) {
        throw new Error("Seleccione el caso asociado.");
    }
}

function validarSectoresManzanas() {
    if (ESTADO.jornada.sectores.length === 0) {
        throw new Error("Agregue al menos un sector.");
    }

    const claves = new Set();

    ESTADO.jornada.sectores.forEach((sector, indiceSector) => {
        if (!normalizarTexto(sector.sector)) {
            throw new Error(`Ingrese la clave del sector ${indiceSector + 1}.`);
        }
        if (sector.manzanas.length === 0) {
            throw new Error(`Agregue al menos una manzana al sector ${sector.sector}.`);
        }

        sector.manzanas.forEach((manzana, indiceManzana) => {
            if (!normalizarTexto(manzana.manzana)) {
                throw new Error(`Ingrese la clave de la manzana ${indiceManzana + 1} del sector ${sector.sector}.`);
            }

            const clave = `${sector.sector.trim().toUpperCase()}::${manzana.manzana.trim().toUpperCase()}`;
            if (claves.has(clave)) {
                throw new Error(`La manzana ${manzana.manzana} del sector ${sector.sector} está repetida.`);
            }
            claves.add(clave);

            validarResumenManzana(manzana.resumen, sector.sector, manzana.manzana);
        });
    });
}

function validarResumenManzana(resumen, sector, manzana) {
    const resultados =
        enteroSeguro(resumen.viviendas_trabajadas) +
        enteroSeguro(resumen.viviendas_cerradas) +
        enteroSeguro(resumen.viviendas_deshabitadas) +
        enteroSeguro(resumen.viviendas_renuentes);

    // Viviendas visitadas se deriva siempre del resultado de la visita.
    resumen.viviendas_visitadas = resultados;

    const distribucionAnimales =
        enteroSeguro(resumen.viviendas_con_perros) +
        enteroSeguro(resumen.viviendas_con_gatos) +
        enteroSeguro(resumen.viviendas_con_perros_gatos) +
        enteroSeguro(resumen.viviendas_sin_animales);

    if (distribucionAnimales > enteroSeguro(resumen.viviendas_trabajadas)) {
        throw new Error(`En el sector ${sector}, manzana ${manzana}, la distribución por animales supera las viviendas trabajadas.`);
    }
}
function validarActividades() {
    let total = 0;

    ESTADO.jornada.sectores.forEach(sector => {
        sector.manzanas.forEach(manzana => {
            manzana.actividades.forEach(actividad => {
                total += 1;

                if (!actividad.tipo_actividad_id) {
                    throw new Error(
                        `Seleccione el tipo de todas las actividades de la manzana ${manzana.manzana}.`
                    );
                }

                actividad.insumos.forEach(insumo => {
                    if (!insumo.lote_id) {
                        throw new Error(
                            "Seleccione el lote de todos los insumos."
                        );
                    }

                    const lote =
                        obtenerLoteInventario(
                            insumo.lote_id
                        );
                      
                    if (!lote) {
                        throw new Error(
                            "El lote seleccionado ya no está disponible."
                        );
                    }

                    const contenido =
                        decimalSeguro(
                            insumo.contenido_presentacion ??
                            obtenerContenidoPresentacion(lote)
                        );

                    const existencia =
                        obtenerExistenciaLote(lote);

                    const cantidadCapturada =
                        decimalSeguro(
                            insumo.cantidad_capturada ??
                            insumo.cantidad
                        );

                    const tipoCaptura =
                        String(
                            insumo.tipo_captura ||
                            "UNIDAD_BASE"
                        )
                            .trim()
                            .toUpperCase();

                    if (cantidadCapturada <= 0) {
                        throw new Error(
                            "La cantidad de cada insumo debe ser mayor que cero."
                        );
                    }

                    if (
                        tipoCaptura === "PRESENTACION" &&
                        !Number.isInteger(
                            cantidadCapturada
                        )
                    ) {
                        throw new Error(
                            "Las presentaciones completas deben capturarse con números enteros."
                        );
                    }

                    if (
                        tipoCaptura === "PRESENTACION" &&
                        contenido <= 0
                    ) {
                        throw new Error(
                            "El lote seleccionado no tiene configurado el contenido de su presentación."
                        );
                    }

                    insumo.unidad =
                        obtenerUnidadLote(lote);

                    insumo.presentacion =
                        obtenerPresentacionLote(lote);

                    insumo.tipo_captura =
                        tipoCaptura;

                    insumo.cantidad_capturada =
                        cantidadCapturada;

                    insumo.contenido_presentacion =
                        contenido;

                    insumo.existencia_disponible =
                        existencia;

                    insumo.cantidad =
                        calcularCantidadBaseConsumo(
                            tipoCaptura,
                            cantidadCapturada,
                            contenido
                        );

                    if (
                        insumo.cantidad >
                        existencia
                    ) {
                        throw new Error(
                            `El consumo de ${
                                crearEtiquetaLoteInventario(
                                    lote
                                )
                            } supera la existencia disponible.`
                        );
                    }
                });

                const codigoActividad =
                    String(
                        obtenerCodigoTipoActividad(
                            actividad.tipo_actividad_id
                        ) || ""
                    )
                        .trim()
                        .toUpperCase();

                if (
                    codigoActividad.includes("ENTOMO") ||
                    codigoActividad.includes("GARRAPATA") ||
                    codigoActividad.includes("MUESTRA") ||
                    codigoActividad.includes("ENCUESTA")
                ) {
                    const enviadas =
                        enteroSeguro(
                            actividad.muestras_enviadas
                        );

                    const positivas =
                        actividad.garrapatas_positivas;

                    if (
                        positivas !== null &&
                        positivas !== undefined &&
                        positivas !== "" &&
                        enteroSeguro(positivas) > enviadas
                    ) {
                        throw new Error(
                            `En la manzana ${manzana.manzana}, las garrapatas positivas no pueden superar las muestras enviadas.`
                        );
                    }
                }

                if (esActividadVacunacion(actividad)) {
                    validarRangosVacunacion(
                        actividad,
                        manzana.manzana
                    );
                }

                if (esActividadEsterilizacion(actividad)) {
                    validarRangosEsterilizacion(
                        actividad,
                        manzana.manzana
                    );
                }
            });
        });
    });

    if (total === 0) {
        throw new Error(
            "Registre al menos una actividad."
        );
    }
}

async function guardarNuevoOperativo() {
    aplicarJurisdiccionUsuario();
    if (ESTADO.guardando) {
        return;
    }

    guardarCamposInformacionGeneral();

    try {
        validarInformacionGeneral();
        validarSectoresManzanas();
        validarActividades();

        ESTADO.guardando = true;
        bloquearBotonGuardar(true);

        const payloadOperativo = construirPayloadOperativoBase();
        const respuestaOperativo = await registrarOperativo(obtenerToken(), payloadOperativo);
        const operativoId = extraerOperativoId(respuestaOperativo);

        if (!operativoId) {
            throw new Error("El servidor no devolvió el identificador del operativo.");
        }

        const respuestaJornada = await guardarJornadaOperativo(
            obtenerToken(),
            {
                operativo_id: operativoId,
                ...construirPayloadJornadaActual(TIPOS_JORNADA.INICIAL)
            }
        );

        mostrarRegistroExitoso(respuestaOperativo, respuestaJornada);
    } catch (error) {
        ESTADO.guardando = false;
        bloquearBotonGuardar(false);
        mostrarMensajeGlobal(error?.message || "No fue posible registrar el operativo.", true);
    }
}

function construirPayloadOperativoBase() {
    const manzanasCompatibles = ESTADO.jornada.sectores.flatMap(sector =>
        sector.manzanas.map(manzana => ({
            sector: sector.sector,
            manzana: manzana.manzana,
            fecha_inicio: ESTADO.jornada.fecha,
            fecha_fin: ESTADO.jornada.fecha,
            estatus: "TRABAJADA",
            observaciones: manzana.resumen?.observaciones || null,
            viviendas: []
        }))
    );

    return {
        ...ESTADO.operativo,
        fecha_inicio: ESTADO.jornada.fecha,
        fecha_fin: ESTADO.jornada.fecha,
        manzanas: manzanasCompatibles
    };
}

function construirPayloadJornadaActual(tipo = ESTADO.jornada.tipo_jornada) {
    return {
        tipo_jornada: tipo,
        fecha: ESTADO.jornada.fecha,
        motivo: ESTADO.jornada.motivo || ESTADO.operativo.motivo,
        observaciones: ESTADO.jornada.observaciones || ESTADO.operativo.observaciones,
        sectores: ESTADO.jornada.sectores
    };
}

function extraerOperativoId(respuesta) {
    return respuesta?.operativo?.id || respuesta?.operativo_id || respuesta?.id || null;
}

function mostrarRegistroExitoso(respuestaOperativo, respuestaJornada) {
    const app = obtenerApp();
    const operativo = respuestaOperativo?.operativo || respuestaOperativo || {};
    const jornada = respuestaJornada?.jornada || {};

    app.innerHTML = `
        <main class="operation-success">
            <section class="operation-success__card">
                <div class="operation-success__icon" aria-hidden="true">✓</div>
                <p class="operation-success__eyebrow">Registro terminado</p>
                <h1>Operativo registrado correctamente</h1>
                <p>Se creó el expediente y se agregó su primera jornada.</p>

                <div class="review-grid">
                    ${crearDatoResumen("Folio operativo", operativo.folio_operativo || jornada.folio_operativo || "Generado")}
                    ${crearDatoResumen("Caso", operativo.folio_caso || ESTADO.operativo.folio_caso || "Sin caso")}
                    ${crearDatoResumen("Jornada", jornada.numero_jornada || 1)}
                    ${crearDatoResumen("Manzanas", jornada.manzanas || contarManzanas())}
                    ${crearDatoResumen("Actividades", jornada.actividades || contarActividades())}
                </div>

                <div class="operation-success__actions">
                    <button id="btn-nuevo-operativo" class="button button--primary" type="button">Registrar otro operativo</button>
                    <button id="btn-volver-inicio" class="button button--secondary" type="button">Volver al inicio</button>
                </div>
            </section>
        </main>
    `;

    document.getElementById("btn-nuevo-operativo")?.addEventListener("click", () => mostrarRegistrarOperativo());
    document.getElementById("btn-volver-inicio")?.addEventListener("click", () => navegar("/inicio"));
}

function renderizarBusquedaOperativo() {
    const app = obtenerApp();
    const jurisdicciones = obtenerArreglo(ESTADO.catalogos?.jurisdicciones);

    app.innerHTML = `
        <div class="operative-page">
            ${crearEncabezadoPagina(
                "Retomar operativo",
                "Busque un expediente existente y agregue una nueva jornada.",
                true
            )}

            <main class="operative-main">
                <section class="operation-search">
                    <form id="form-search-operation" class="operation-search__form">
                        <div class="form-group">
                            <label for="operation-search-text">Buscar</label>
                            <input
                                id="operation-search-text"
                                type="search"
                                value="${escaparHTML(ESTADO.busquedaOperativo.texto)}"
                                placeholder="Folio, caso, nombre del lugar o domicilio"
                            >
                        </div>

                        <div class="form-group">
                            <label for="operation-search-jurisdiction">Jurisdicción</label>
                            <select id="operation-search-jurisdiction">
                                <option value="">Todas o la autorizada</option>
                                ${jurisdicciones.map(j => `
                                    <option
                                        value="${escaparHTML(j.clave)}"
                                        ${j.clave === ESTADO.busquedaOperativo.jurisdiccion ? "selected" : ""}
                                    >${escaparHTML(`${j.clave} - ${j.nombre}`)}</option>
                                `).join("")}
                            </select>
                        </div>

                        <div class="operation-search__actions">
                            <button class="button button--primary" type="submit">Buscar operativo</button>
                            <button id="btn-clear-operation-search" class="button button--secondary" type="button">Limpiar</button>
                        </div>
                    </form>
                </section>

                <section id="operation-search-results" class="operation-search-results">
                    ${crearEstadoInicialBusqueda()}
                </section>
            </main>
        </div>
    `;

    document.getElementById("btn-cambiar-modo-operativo")?.addEventListener("click", renderizarSelectorModo);
    document.getElementById("btn-operation-home")?.addEventListener("click", () => navegar("/inicio"));
    document.getElementById("form-search-operation")?.addEventListener("submit", procesarBusquedaOperativo);
    document.getElementById("btn-clear-operation-search")?.addEventListener("click", () => {
        ESTADO.busquedaOperativo = crearBusquedaInicial();
        renderizarBusquedaOperativo();
    });
}

function crearEstadoInicialBusqueda() {
    return `
        <div class="operation-search-empty">
            <h3>Busque un operativo</h3>
            <p>Puede buscar por folio, caso, lugar o domicilio.</p>
        </div>
    `;
}

async function procesarBusquedaOperativo(evento) {
    evento?.preventDefault();

    if (ESTADO.busquedaOperativo.cargando) {
        return;
    }

    ESTADO.busquedaOperativo.texto = document.getElementById("operation-search-text")?.value?.trim() || "";
    ESTADO.busquedaOperativo.jurisdiccion = normalizarTexto(document.getElementById("operation-search-jurisdiction")?.value);
    ESTADO.busquedaOperativo.cargando = true;
    renderizarCargaBusqueda();

    try {
        const respuesta = await buscarOperativosRetomar(obtenerToken(), {
            busqueda: ESTADO.busquedaOperativo.texto,
            jurisdiccion: ESTADO.busquedaOperativo.jurisdiccion,
            limite: 50
        });

        ESTADO.busquedaOperativo.resultados = obtenerResultadosOperativosRetomar(respuesta);
        renderizarResultadosBusqueda();
    } catch (error) {
        renderizarErrorBusqueda(error);
    } finally {
        ESTADO.busquedaOperativo.cargando = false;
    }
}

function renderizarCargaBusqueda() {
    const contenedor = document.getElementById("operation-search-results");
    if (contenedor) {
        contenedor.innerHTML = `<div class="operation-search-loading"><p>Buscando operativos...</p></div>`;
    }
}

function renderizarResultadosBusqueda() {
    const contenedor = document.getElementById("operation-search-results");
    const resultados = ESTADO.busquedaOperativo.resultados;

    if (!contenedor) {
        return;
    }

    if (resultados.length === 0) {
        contenedor.innerHTML = `<div class="operation-search-empty"><h3>Sin resultados</h3><p>No se encontraron operativos.</p></div>`;
        return;
    }

    contenedor.innerHTML = `
        <div class="operation-search-grid">
            ${resultados.map(crearTarjetaOperativoBusqueda).join("")}
        </div>
    `;

    contenedor.querySelectorAll("[data-select-operation]").forEach(boton => {
        boton.addEventListener("click", () => seleccionarOperativoRetomar(boton.dataset.selectOperation));
    });
}

function crearTarjetaOperativoBusqueda(operativo) {
    return `
        <article class="operation-result-card">
            <header class="operation-result-card__header">
                <div>
                    <span class="operation-result-card__folio">${escaparHTML(operativo.folio_operativo || "Sin folio")}</span>
                    <h3>${escaparHTML(operativo.nombre_referencia || operativo.folio_caso || operativo.tipo_operativo || "Operativo")}</h3>
                </div>
                <span>Jurisdicción ${escaparHTML(operativo.cve_jur_res || "—")}</span>
            </header>

            <div class="operation-result-card__body">
                <p>${escaparHTML(operativo.domicilio || operativo.localidad || "Sin domicilio")}</p>
                <p>Última jornada: ${formatearFecha(operativo.ultima_jornada || operativo.fecha_inicio)}</p>
                <p>Jornadas: ${enteroSeguro(operativo.total_jornadas)} · Verificaciones: ${enteroSeguro(operativo.total_verificaciones)}</p>
            </div>

            <footer class="operation-result-card__actions">
                <button
                    class="button button--primary"
                    type="button"
                    data-select-operation="${escaparHTML(operativo.id)}"
                >Seleccionar y continuar</button>
            </footer>
        </article>
    `;
}

async function seleccionarOperativoRetomar(operativoId) {
    renderizarCargaOperativo();

    try {
        const respuesta = await obtenerOperativoJornadas(obtenerToken(), operativoId);
        ESTADO.operativoSeleccionado = obtenerDatosOperativoJornadas(respuesta);
        ESTADO.tiposJornada = obtenerTiposJornada(respuesta);
        ESTADO.historialJornadas = obtenerHistorialJornadas(respuesta);
        ESTADO.jornada = crearJornadaInicial(determinarTipoJornadaPredeterminado());
        ESTADO.operativo.cve_jur_res = ESTADO.operativoSeleccionado?.cve_jur_res || null;
        ESTADO.operativo.programa_id = ESTADO.operativoSeleccionado?.programa_id || null;
        await cargarInventario();
        renderizarDetalleOperativoRetomar();
    } catch (error) {
        renderizarErrorOperativo(error);
    }
}

function determinarTipoJornadaPredeterminado() {
    return ESTADO.historialJornadas.some(j => !j.cancelada)
        ? TIPOS_JORNADA.CONTINUACION
        : TIPOS_JORNADA.INICIAL;
}

function renderizarDetalleOperativoRetomar() {
    const app = obtenerApp();
    const operativo = ESTADO.operativoSeleccionado || {};
    const totales = calcularTotalesJornadas(ESTADO.historialJornadas);

    app.innerHTML = `
        <div class="operative-page">
            ${crearEncabezadoPagina(
                operativo.folio_operativo || "Operativo seleccionado",
                operativo.nombre_referencia || operativo.folio_caso || operativo.domicilio || "Expediente operativo",
                true
            )}

            <main class="operative-main">
                <section class="operation-selected">
                    <div class="operation-selected__summary">
                        ${crearDatoResumen("Folio", operativo.folio_operativo || "Sin folio")}
                        ${crearDatoResumen("Caso", operativo.folio_caso || "Sin caso")}
                        ${crearDatoResumen("Jurisdicción", operativo.cve_jur_res || "—")}
                        ${crearDatoResumen("Programa", operativo.programa || "—")}
                        ${crearDatoResumen("Jornadas", totales.jornadas)}
                        ${crearDatoResumen("Verificaciones", totales.verificaciones)}
                        ${crearDatoResumen("Manzanas", totales.manzanas)}
                        ${crearDatoResumen("Habitantes", totales.habitantes_beneficiados)}
                    </div>
                </section>

                <section class="operation-history">
                    <header class="operation-history__header">
                        <div>
                            <h2>Historial de jornadas</h2>
                        </div>
                        <button id="btn-new-operation-journey" class="button button--primary" type="button">Agregar jornada</button>
                    </header>
                    ${crearHistorialJornadas()}
                </section>

                <section id="new-operation-journey-container"></section>
            </main>
        </div>
    `;

    document.getElementById("btn-cambiar-modo-operativo")?.addEventListener("click", renderizarBusquedaOperativo);
    document.getElementById("btn-operation-home")?.addEventListener("click", () => navegar("/inicio"));
    document.getElementById("btn-new-operation-journey")?.addEventListener("click", renderizarFormularioNuevaJornada);
    document
    .querySelectorAll(
        "[data-editar-jornada]"
    )
    .forEach(boton => {

        boton.addEventListener(
            "click",
            () => editarJornadaExistente(
                boton.dataset.editarJornada
            )
        );

    });
    document.querySelectorAll("[data-editar-jornada]").forEach(boton => {
        boton.addEventListener("click", () => iniciarEdicionJornada(boton.dataset.editarJornada));
    });
}

function crearHistorialJornadas() {
    if (ESTADO.historialJornadas.length === 0) {
        return `
            <div class="operation-history-empty">
                <p>No hay jornadas registradas.</p>
            </div>
        `;
    }

    return `
        <div class="operation-timeline">

            ${ESTADO.historialJornadas.map(jornada => `

                <article class="operation-timeline-item">

                    <div class="operation-timeline-item__content">

                        <header>

                            <div>

                                <span
                                    class="journey-type ${obtenerClaseTipoJornada(
                                        jornada.tipo_jornada
                                    )}"
                                >
                                    ${escaparHTML(
                                        jornada.tipo_jornada_nombre ||
                                        jornada.tipo_jornada
                                    )}
                                </span>

                                <h3>
                                    Jornada ${enteroSeguro(
                                        jornada.numero_jornada
                                    )}
                                </h3>

                            </div>

                            <time>
                                ${formatearFecha(
                                    jornada.fecha
                                )}
                            </time>

                        </header>

                        <p>
                            ${escaparHTML(
                                jornada.motivo ||
                                jornada.observaciones ||
                                "Sin observaciones"
                            )}
                        </p>

                        ${!jornada.cancelada ? `

                            <div class="operation-timeline-item__actions">

                                <button
                                    class="button button--secondary"
                                    type="button"
                                    data-editar-jornada="${escaparHTML(
                                        jornada.id
                                    )}"
                                >
                                    Editar jornada
                                </button>

                            </div>

                        ` : ""}

                    </div>

                </article>

            `).join("")}

        </div>
    `;
}

function iniciarEdicionJornada(jornadaId) {
    const jornada = ESTADO.historialJornadas.find(item => String(item.id) === String(jornadaId));
    if (!jornada) {
        renderizarErrorOperativo(new Error("No se encontró la jornada seleccionada."));
        return;
    }
    if (jornada.cancelada) {
        renderizarErrorOperativo(new Error("No se puede editar una jornada cancelada."));
        return;
    }

    ESTADO.jornadaEditandoId = jornada.id;
    ESTADO.jornada = normalizarJornadaParaEdicion(jornada);
    renderizarEditorJornadaRetomada();
}

function construirJornadaDesdeDetalle(
    detalle,
    jornadaId
) {
    const manzanasDetalle =
        obtenerArreglo(
            detalle?.manzanas
        )
        .filter(
            manzana =>
                String(
                    manzana.jornada_id || ""
                ) ===
                String(
                    jornadaId || ""
                )
        );


    if (manzanasDetalle.length === 0) {
        throw new Error(
            "La jornada seleccionada no tiene manzanas registradas."
        );
    }


    const jornadaBD =
        manzanasDetalle[0]?.jornada || {};


    /*
    ======================================================
    AGRUPAR MANZANAS POR SECTOR
    ======================================================
    */

    const sectoresMap =
        new Map();


    manzanasDetalle.forEach(
        manzanaBD => {

            const codigoSector =
                String(
                    manzanaBD.sector || ""
                ).trim();


            if (
                !sectoresMap.has(
                    codigoSector
                )
            ) {

                sectoresMap.set(
                    codigoSector,
                    {
                        sector:
                            codigoSector,

                        manzanas: []
                    }
                );

            }


            const resumenBD =
                manzanaBD.resumen || {};


            const actividades =
                obtenerArreglo(
                    manzanaBD.actividades
                )
                .map(
                    actividadBD => {

                        const consumos =
                            obtenerArreglo(
                                actividadBD.consumos ||
                                actividadBD.insumos
                            )
                            .map(
                                consumoBD => ({
                                    id:
                                        consumoBD.id,

                                    lote_id:
                                        consumoBD.lote_id,

                                    tipo_captura:
                                        consumoBD.tipo_captura ||
                                        "UNIDAD_BASE",

                                    cantidad_capturada:
                                        decimalSeguro(
                                            consumoBD.cantidad_capturada ??
                                            consumoBD.cantidad
                                        ),

                                    cantidad:
                                        decimalSeguro(
                                            consumoBD.cantidad_base ??
                                            consumoBD.cantidad
                                        ),

                                    unidad:
                                        consumoBD.unidad || null,

                                    presentacion:
                                        consumoBD.presentacion || null,

                                    contenido_presentacion:
                                        decimalSeguro(
                                            consumoBD.contenido_presentacion
                                        ),

                                    existencia_disponible:
                                        0,

                                    rangos_folios:
                                        obtenerArreglo(
                                            consumoBD.rangos_folios ||
                                            consumoBD.rangos_vacunacion
                                        ).map(
                                            rango => ({
                                                id:
                                                    rango.id || null,

                                                folio_desde:
                                                    rango.folio_desde ?? null,

                                                folio_hasta:
                                                    rango.folio_hasta ?? null
                                            })
                                        ),

                                    /*
                                     * Muy importante:
                                     * consumo existente = no tocar stock.
                                     */
                                    accion:
                                        "SIN_CAMBIO"
                                })
                            );


                        return {
                            id:
                                actividadBD.id,

                            tipo_actividad_id:
                                actividadBD.tipo_actividad_id,

                            fecha:
                                actividadBD.fecha ||
                                jornadaBD.fecha ||
                                fechaActualISO(),

                            brigadista1:
                                actividadBD.brigadista1 || null,

                            brigadista2:
                                actividadBD.brigadista2 || null,

                            supervisor:
                                actividadBD.supervisor || null,

                            viviendas_cubiertas:
                                enteroSeguro(
                                    actividadBD.viviendas_cubiertas
                                ),

                            viviendas_encuestadas:
                                enteroSeguro(
                                    actividadBD.viviendas_encuestadas
                                ),

                            viviendas_rociadas:
                                enteroSeguro(
                                    actividadBD.viviendas_rociadas
                                ),

                            viviendas_ectodesparasitadas:
                                enteroSeguro(
                                    actividadBD.viviendas_ectodesparasitadas
                                ),

                            perros_intervenidos:
                                enteroSeguro(
                                    actividadBD.perros_intervenidos
                                ),

                            gatos_intervenidos:
                                enteroSeguro(
                                    actividadBD.gatos_intervenidos
                                ),

                            viviendas_inspeccionadas:
                                enteroSeguro(
                                    actividadBD.viviendas_inspeccionadas
                                ),

                            viviendas_con_garrapata:
                                enteroSeguro(
                                    actividadBD.viviendas_con_garrapata
                                ),

                            perros_inspeccionados:
                                enteroSeguro(
                                    actividadBD.perros_inspeccionados
                                ),

                            perros_con_garrapata:
                                enteroSeguro(
                                    actividadBD.perros_con_garrapata
                                ),

                            gatos_inspeccionados:
                                enteroSeguro(
                                    actividadBD.gatos_inspeccionados
                                ),

                            gatos_con_garrapata:
                                enteroSeguro(
                                    actividadBD.gatos_con_garrapata
                                ),

                            garrapatas_en_viviendas:
                                enteroSeguro(
                                    actividadBD.garrapatas_en_viviendas
                                ),

                            garrapatas_en_perros:
                                enteroSeguro(
                                    actividadBD.garrapatas_en_perros
                                ),

                            garrapatas_en_gatos:
                                enteroSeguro(
                                    actividadBD.garrapatas_en_gatos
                                ),

                            larvas_encontradas:
                                enteroSeguro(
                                    actividadBD.larvas_encontradas
                                ),

                            ninfas_encontradas:
                                enteroSeguro(
                                    actividadBD.ninfas_encontradas
                                ),

                            adultos_encontrados:
                                enteroSeguro(
                                    actividadBD.adultos_encontrados
                                ),

                            muestras_enviadas:
                                enteroSeguro(
                                    actividadBD.muestras_enviadas
                                ),

                            garrapatas_positivas:
                                (
                                    actividadBD.garrapatas_positivas === null ||
                                    actividadBD.garrapatas_positivas === undefined ||
                                    actividadBD.garrapatas_positivas === ""
                                )
                                    ? null
                                    : enteroSeguro(
                                        actividadBD.garrapatas_positivas
                                    ),

                            rangos_esterilizacion:
                                obtenerArreglo(
                                    actividadBD.rangos_esterilizacion ||
                                    actividadBD.folios_esterilizacion
                                ).map(
                                    rango => ({
                                        id:
                                            rango.id || null,

                                        folio_desde:
                                            rango.folio_desde ?? null,

                                        folio_hasta:
                                            rango.folio_hasta ?? null
                                    })
                                ),

                            observaciones:
                                actividadBD.observaciones || null,

                            insumos:
                                consumos
                        };

                    }
                );


            sectoresMap
                .get(
                    codigoSector
                )
                .manzanas
                .push({
                    /*
                     * El ID es fundamental.
                     * Le indica a la RPC que es UPDATE,
                     * no una manzana nueva.
                     */
                    id:
                        manzanaBD.id,

                    manzana:
                        manzanaBD.manzana || "",

                    fecha_inicio:
                        manzanaBD.fecha_inicio || null,

                    fecha_fin:
                        manzanaBD.fecha_fin || null,

                    estatus:
                        manzanaBD.estatus || "TRABAJADA",

                    observaciones:
                        manzanaBD.observaciones || null,

                    resumen: {
                        id:
                            resumenBD.id || null,

                        viviendas_visitadas:
                            enteroSeguro(
                                resumenBD.viviendas_visitadas
                            ),

                        viviendas_trabajadas:
                            enteroSeguro(
                                resumenBD.viviendas_trabajadas
                            ),

                        viviendas_cerradas:
                            enteroSeguro(
                                resumenBD.viviendas_cerradas
                            ),

                        viviendas_deshabitadas:
                            enteroSeguro(
                                resumenBD.viviendas_deshabitadas
                            ),

                        viviendas_renuentes:
                            enteroSeguro(
                                resumenBD.viviendas_renuentes
                            ),

                        lotes_baldios:
                            enteroSeguro(
                                resumenBD.lotes_baldios
                            ),

                        otros_inmuebles:
                            enteroSeguro(
                                resumenBD.otros_inmuebles
                            ),

                        habitantes_beneficiados:
                            enteroSeguro(
                                resumenBD.habitantes_beneficiados
                            ),

                        viviendas_con_perros:
                            enteroSeguro(
                                resumenBD.viviendas_con_perros
                            ),

                        viviendas_con_gatos:
                            enteroSeguro(
                                resumenBD.viviendas_con_gatos
                            ),

                        viviendas_con_perros_gatos:
                            enteroSeguro(
                                resumenBD.viviendas_con_perros_gatos
                            ),

                        viviendas_sin_animales:
                            enteroSeguro(
                                resumenBD.viviendas_sin_animales
                            ),

                        perros_censados:
                            enteroSeguro(
                                resumenBD.perros_censados
                            ),

                        gatos_censados:
                            enteroSeguro(
                                resumenBD.gatos_censados
                            ),

                        observaciones:
                            resumenBD.observaciones || null
                    },

                    actividades
                });

        }
    );


    return {
        id:
            jornadaId,

        tipo_jornada:
            jornadaBD.codigo_tipo_jornada ||
            jornadaBD.tipo_jornada ||
            TIPOS_JORNADA.CONTINUACION,

        fecha:
            jornadaBD.fecha ||
            fechaActualISO(),

        motivo:
            jornadaBD.motivo || null,

        observaciones:
            jornadaBD.observaciones || null,

        sectores:
            Array.from(
                sectoresMap.values()
            )
    };
}

async function editarJornadaExistente(
    jornadaId
) {
    if (!jornadaId) {
        return;
    }

    renderizarCargaOperativo();

    try {

        const detalle =
            await obtenerDetalleOperativoEditable(
                obtenerToken(),
                ESTADO.operativoSeleccionado.id
            );


        ESTADO.jornada =
            construirJornadaDesdeDetalle(
                detalle,
                jornadaId
            );


        ESTADO.editandoJornada =
            true;

        ESTADO.jornadaEditandoId =
            jornadaId;


        /*
         * Necesitamos existencia actual para que
         * los consumos se calculen correctamente.
         */
        await cargarInventario();


        renderizarEditorJornadaRetomada();

    } catch (error) {

        ESTADO.editandoJornada =
            false;

        ESTADO.jornadaEditandoId =
            null;

        renderizarErrorOperativo(
            error
        );

    }
}

function normalizarJornadaParaEdicion(jornada = {}) {
    const manzanasCrudas = obtenerArreglo(jornada.manzanas_detalle || jornada.manzanas || jornada.detalle_manzanas);
    const sectoresMapa = new Map();

    manzanasCrudas.forEach(item => {
        const sectorCodigo = normalizarTexto(item.sector) || "SIN_SECTOR";
        if (!sectoresMapa.has(sectorCodigo)) {
            sectoresMapa.set(sectorCodigo, { sector: sectorCodigo, manzanas: [] });
        }
        sectoresMapa.get(sectorCodigo).manzanas.push({
            id: item.id || item.operativo_manzana_id || null,
            manzana: item.manzana || "",
            fecha_inicio: item.fecha_inicio || jornada.fecha || fechaActualISO(),
            fecha_fin: item.fecha_fin || jornada.fecha || fechaActualISO(),
            estatus: item.estatus || "TRABAJADA",
            observaciones: item.observaciones || null,
            resumen: {
                ...crearResumenManzanaInicial(),
                ...(item.resumen || item.resumen_manzana || {})
            },
            actividades: obtenerArreglo(item.actividades).map(a => ({
                ...crearActividadInicial(),
                ...a,
                id: a.id || a.actividad_manzana_id || null,
                rangos_esterilizacion: obtenerArreglo(
                    a.rangos_esterilizacion ||
                    a.folios_esterilizacion
                ).map(rango => ({
                    id: rango.id || null,
                    folio_desde: rango.folio_desde ?? null,
                    folio_hasta: rango.folio_hasta ?? null
                })),
                insumos: obtenerArreglo(a.insumos || a.consumos).map(i => ({
                    ...crearInsumoInicial(),
                    ...i,
                    id: i.id || i.consumo_id || null,
                    accion: "SIN_CAMBIO",
                    rangos_folios: obtenerArreglo(
                        i.rangos_folios ||
                        i.rangos_vacunacion
                    ).map(rango => ({
                        id: rango.id || null,
                        folio_desde: rango.folio_desde ?? null,
                        folio_hasta: rango.folio_hasta ?? null
                    }))
                }))
            }))
        });
    });

    return {
        tipo_jornada: jornada.tipo_jornada || TIPOS_JORNADA.CONTINUACION,
        fecha: jornada.fecha || fechaActualISO(),
        hora_inicio: jornada.hora_inicio || null,
        hora_fin: jornada.hora_fin || null,
        motivo: jornada.motivo || null,
        observaciones: jornada.observaciones || null,
        sectores: Array.from(sectoresMapa.values())
    };
}


function renderizarFormularioNuevaJornada() {
    const contenedor = document.getElementById("new-operation-journey-container");
    if (!contenedor) {
        return;
    }

    const tipos = ESTADO.tiposJornada.filter(tipo =>
        tipo.codigo !== TIPOS_JORNADA.INICIAL || ESTADO.historialJornadas.length === 0
    );

    contenedor.innerHTML = `
        <section class="new-operation-journey">
            <header class="new-operation-journey__header">
                <div>
                    <h2>Agregar jornada</h2>
                    <p>Registre una continuación, verificación o reintervención.</p>
                </div>
                <button id="btn-cancel-new-journey" class="button button--secondary" type="button">Cancelar</button>
            </header>

            <div class="form-grid">
                <div class="form-group">
                    <label for="retomar-tipo-jornada">Tipo de jornada</label>
                    <select id="retomar-tipo-jornada">
                        ${tipos.map(tipo => `
                            <option
                                value="${escaparHTML(tipo.codigo)}"
                                ${tipo.codigo === ESTADO.jornada.tipo_jornada ? "selected" : ""}
                            >${escaparHTML(tipo.nombre)}</option>
                        `).join("")}
                    </select>
                </div>

                <div class="form-group">
                    <label for="retomar-fecha-jornada">Fecha</label>
                    <input id="retomar-fecha-jornada" type="date" value="${escaparHTML(ESTADO.jornada.fecha)}">
                </div>

                <div class="form-group form-group--full">
                    <label for="retomar-motivo">Motivo</label>
                    <input id="retomar-motivo" type="text" maxlength="300" value="${escaparHTML(ESTADO.jornada.motivo || "")}">
                </div>
            </div>

            <div class="new-operation-journey__actions">
                <button id="btn-edit-journey-sectors" class="button button--primary" type="button">Capturar sectores y manzanas</button>
            </div>
        </section>
    `;

    document.getElementById("btn-cancel-new-journey")?.addEventListener("click", () => {
        contenedor.innerHTML = "";
    });

    document.getElementById("btn-edit-journey-sectors")?.addEventListener("click", () => {
        ESTADO.jornada.tipo_jornada = document.getElementById("retomar-tipo-jornada")?.value || TIPOS_JORNADA.CONTINUACION;
        ESTADO.jornada.fecha = document.getElementById("retomar-fecha-jornada")?.value || fechaActualISO();
        ESTADO.jornada.motivo = normalizarTexto(document.getElementById("retomar-motivo")?.value);
        ESTADO.jornada.sectores = ESTADO.jornada.sectores.length ? ESTADO.jornada.sectores : [crearSectorInicial()];
        renderizarEditorJornadaRetomada();
    });
}

function renderizarEditorJornadaRetomada() {
    const app = obtenerApp();
    const operativo = ESTADO.operativoSeleccionado || {};

    const esEdicion =
        ESTADO.editandoJornada &&
        Boolean(ESTADO.jornadaEditandoId);

    app.innerHTML = `
        <div class="operative-page">

            ${crearEncabezadoPagina(
                `${
                    esEdicion
                        ? "Editar jornada"
                        : "Nueva jornada"
                } · ${
                    operativo.folio_operativo ||
                    "Operativo"
                }`,
                ESTADO.jornada.tipo_jornada,
                true
            )}

            <main class="operative-main">

                <section class="operative-step">
                    ${crearPasoSectoresManzanas()}
                </section>

                <section class="operative-step">
                    ${crearPasoActividades()}
                </section>

                <footer class="wizard-footer">

                    <div
                        id="operative-global-message"
                        class="form-message"
                        role="alert"
                    ></div>

                    ${esEdicion ? `
                        <div class="form-group form-group--edit-reason">

                            <label for="motivo-edicion-jornada">
                                Motivo de la edición
                            </label>

                            <input
                                id="motivo-edicion-jornada"
                                type="text"
                                maxlength="500"
                                placeholder="Ej. Corrección de captura"
                                autocomplete="off"
                            >

                        </div>
                    ` : ""}

                    <button
                        id="btn-guardar-jornada-retomada"
                        class="button button--primary"
                        type="button"
                    >
                        ${
                            esEdicion
                                ? "Guardar cambios"
                                : "Guardar jornada"
                        }
                    </button>

                </footer>

            </main>

        </div>
    `;

    document
        .getElementById(
            "btn-cambiar-modo-operativo"
        )
        ?.addEventListener(
            "click",
            renderizarDetalleOperativoRetomar
        );

    document
        .getElementById(
            "btn-operation-home"
        )
        ?.addEventListener(
            "click",
            () => navegar("/inicio")
        );

    registrarEventosSectoresManzanas();

    registrarEventosActividades();

    document
        .getElementById(
            "btn-guardar-jornada-retomada"
        )
        ?.addEventListener(
            "click",
            guardarJornadaRetomada
        );
}

async function guardarJornadaRetomada() {
    if (ESTADO.guardando) {
        return;
    }

    try {

        validarSectoresManzanas();
        validarActividades();

        ESTADO.guardando =
            true;


        if (
            ESTADO.editandoJornada &&
            ESTADO.jornadaEditandoId
        ) {

            const motivoEdicion =
                window.prompt(
                    "Indique el motivo de la edición:"
                );


            if (
                !motivoEdicion ||
                !motivoEdicion.trim()
            ) {
                throw new Error(
                    "Debe indicar el motivo de la edición."
                );
            }


            const payload =
                construirPayloadEdicionJornadaActual(
                    motivoEdicion
                );


            await editarJornadaOperativo(
                obtenerToken(),
                ESTADO.jornadaEditandoId,
                payload
            );

        } else {

            await guardarJornadaOperativo(
                obtenerToken(),
                {
                    operativo_id:
                        ESTADO.operativoSeleccionado.id,

                    ...construirPayloadJornadaActual()
                }
            );

        }


        ESTADO.guardando =
            false;

        ESTADO.editandoJornada =
            false;

        ESTADO.jornadaEditandoId =
            null;


        await seleccionarOperativoRetomar(
            ESTADO.operativoSeleccionado.id
        );

    } catch (error) {

        ESTADO.guardando =
            false;

        mostrarMensajeGlobal(
            error?.message ||
            "No fue posible guardar la jornada.",
            true
        );

    }
}

function renderizarErrorBusqueda(error) {
    const contenedor = document.getElementById("operation-search-results");
    if (contenedor) {
        contenedor.innerHTML = `
            <div class="operation-search-error">
                <h3>No fue posible buscar operativos</h3>
                <p>${escaparHTML(error?.message || "Ocurrió un error inesperado.")}</p>
                <button id="btn-retry-operation-search" class="button button--primary" type="button">Reintentar</button>
            </div>
        `;
        document.getElementById("btn-retry-operation-search")?.addEventListener("click", procesarBusquedaOperativo);
    }
}

async function cargarInventario() {
    aplicarJurisdiccionUsuario();

    if (!ESTADO.operativo.cve_jur_res) {
        ESTADO.inventario = [];
        return;
    }

    try {
        const respuesta = await obtenerInventarioOperativo(
            obtenerToken(),
            ESTADO.operativo.cve_jur_res
        );
        ESTADO.inventario = obtenerArreglo(respuesta?.inventario || respuesta?.resultados || respuesta);
       
    } catch {
        ESTADO.inventario = [];
    }
}

function guardarCamposInformacionGeneral() {
    const mapeo = {
        programa_id: "operativo-programa",
        tipo_operativo_id: "operativo-tipo",
        fecha_inicio: "operativo-fecha-inicio",
        nombre_referencia: "operativo-nombre-referencia",
        cve_mpo_res: "operativo-municipio",
        localidad: "operativo-localidad",
        domicilio: "operativo-domicilio",
        motivo: "operativo-motivo",
        observaciones: "operativo-observaciones"
    };

    Object.entries(mapeo).forEach(([campo, id]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            ESTADO.operativo[campo] = normalizarTexto(elemento.value);
        }
    });
    ESTADO.jornada.fecha = ESTADO.operativo.fecha_inicio || ESTADO.jornada.fecha;
}

function actualizarFechasActividades() {
    ESTADO.jornada.sectores.forEach(sector => {
        sector.manzanas.forEach(manzana => {
            manzana.actividades.forEach(actividad => {
                if (!actividad.fecha) {
                    actividad.fecha = ESTADO.jornada.fecha;
                }
            });
        });
    });
}
function construirPayloadEdicionJornadaActual(
    motivoEdicion
) {
    return {
        fecha:
            ESTADO.jornada.fecha,

        motivo:
            ESTADO.jornada.motivo,

        observaciones:
            ESTADO.jornada.observaciones,

        motivo_edicion:
            motivoEdicion,

        manzanas:
            ESTADO.jornada.sectores.flatMap(
                sector =>
                    sector.manzanas.map(
                        manzana => ({
                            id:
                                manzana.id || null,

                            sector:
                                sector.sector,

                            manzana:
                                manzana.manzana,

                            fecha_inicio:
                                manzana.fecha_inicio ||
                                ESTADO.jornada.fecha,

                            fecha_fin:
                                manzana.fecha_fin || null,

                            estatus:
                                manzana.estatus ||
                                "TRABAJADA",

                            observaciones:
                                manzana.observaciones || null,

                            resumen:
                                {
                                    ...manzana.resumen,

                                    viviendas_visitadas:
                                        calcularViviendasVisitadasResumen(
                                            manzana.resumen
                                        )
                                },

                            actividades:
                                manzana.actividades.map(
                                    actividad => ({
                                        ...actividad,

                                        id:
                                            actividad.id || null,

                                        insumos:
                                            actividad.insumos.map(
                                                insumo => ({
                                                    ...insumo,

                                                    id:
                                                        insumo.id ||
                                                        null,

                                                    /*
                                                     * Nuevos insumos:
                                                     */
                                                    accion:
                                                        insumo.id
                                                            ? (
                                                                insumo.accion ||
                                                                "SIN_CAMBIO"
                                                            )
                                                            : "AGREGAR"
                                                })
                                            )
                                    })
                                )
                        })
                    )
            )
    };
}

function calcularViviendasVisitadasResumen(
    resumen = {}
) {
    return (
        enteroSeguro(
            resumen.viviendas_trabajadas
        )
        +
        enteroSeguro(
            resumen.viviendas_cerradas
        )
        +
        enteroSeguro(
            resumen.viviendas_deshabitadas
        )
        +
        enteroSeguro(
            resumen.viviendas_renuentes
        )
    );
}
function limpiarActividadesIncompatibles() {
    const idsPermitidos = new Set(obtenerTiposActividadPrograma().map(tipo => tipo.id));
    ESTADO.jornada.sectores.forEach(sector => {
        sector.manzanas.forEach(manzana => {
            manzana.actividades = manzana.actividades.filter(actividad =>
                !actividad.tipo_actividad_id || idsPermitidos.has(actividad.tipo_actividad_id)
            );
        });
    });
}

function obtenerTiposActividadPrograma() {
    return obtenerArreglo(ESTADO.catalogos?.tipos_actividad).filter(tipo =>
        !ESTADO.operativo.programa_id || tipo.programa_id === ESTADO.operativo.programa_id
    );
}

function obtenerNombreTipoActividad(tipoId) {
    return obtenerTiposActividadPrograma().find(tipo => tipo.id === tipoId)?.nombre || null;
}

function obtenerNombrePrograma() {
    return obtenerArreglo(ESTADO.catalogos?.programas).find(
        programa => programa.id === ESTADO.operativo.programa_id
    )?.nombre || "No especificado";
}

function obtenerNombreTipoOperativo() {
    return obtenerArreglo(ESTADO.catalogos?.tipos_operativo).find(
        tipo => tipo.id === ESTADO.operativo.tipo_operativo_id
    )?.nombre || "No especificado";
}

function obtenerManzanaPorElemento(elemento) {
    const sector = ESTADO.jornada.sectores[Number(elemento.dataset.sectorIndex)];
    return sector?.manzanas?.[Number(elemento.dataset.manzanaIndex)] || null;
}

function obtenerActividadPorElemento(elemento) {
    return obtenerManzanaPorElemento(elemento)?.actividades?.[Number(elemento.dataset.actividadIndex)] || null;
}

function obtenerInsumoPorElemento(elemento) {
    return obtenerActividadPorElemento(elemento)?.insumos?.[Number(elemento.dataset.insumoIndex)] || null;
}

function contarManzanas() {
    return ESTADO.jornada.sectores.reduce((total, sector) => total + sector.manzanas.length, 0);
}

function contarActividades() {
    return ESTADO.jornada.sectores.reduce(
        (total, sector) => total + sector.manzanas.reduce(
            (subtotal, manzana) => subtotal + manzana.actividades.length,
            0
        ),
        0
    );
}

function calcularResumenJornada(jornada) {
    const total = {
        sectores: jornada.sectores.length,
        manzanas: 0,
        viviendas_visitadas: 0,
        viviendas_trabajadas: 0,
        habitantes_beneficiados: 0,
        perros_censados: 0,
        gatos_censados: 0,
        actividades: 0,
        insumos: 0
    };

    jornada.sectores.forEach(sector => {
        sector.manzanas.forEach(manzana => {
            total.manzanas += 1;
            total.viviendas_visitadas += enteroSeguro(manzana.resumen?.viviendas_visitadas);
            total.viviendas_trabajadas += enteroSeguro(manzana.resumen?.viviendas_trabajadas);
            total.habitantes_beneficiados += enteroSeguro(manzana.resumen?.habitantes_beneficiados);
            total.perros_censados += enteroSeguro(manzana.resumen?.perros_censados);
            total.gatos_censados += enteroSeguro(manzana.resumen?.gatos_censados);
            total.actividades += manzana.actividades.length;
            total.insumos += manzana.actividades.reduce((suma, actividad) => suma + actividad.insumos.length, 0);
        });
    });

    return total;
}

function crearBloqueSinManzanas() {
    return `
        <div class="step-panel">
            <div class="empty-state">
                <h2>No hay manzanas registradas</h2>
                <p>Regrese al paso anterior y agregue al menos una.</p>
            </div>
        </div>
    `;
}

function bloquearBotonGuardar(bloqueado) {
    const boton = document.getElementById("btn-guardar-operativo");
    if (boton) {
        boton.disabled = bloqueado;
        boton.textContent = bloqueado ? "Registrando..." : "Registrar operativo";
    }
}

function mostrarMensajeGlobal(mensaje, esError = false) {
    const contenedor = document.getElementById("operative-global-message");
    if (!contenedor) {
        return;
    }
    contenedor.textContent = mensaje;
    contenedor.className = `form-message ${esError ? "form-message--error" : "form-message--success"}`;
}

function renderizarCargaOperativo() {
    obtenerApp().innerHTML = `
        <main class="initial-loader">
            <div class="initial-loader__spinner" aria-hidden="true"></div>
            <p>Cargando módulo de operativos...</p>
        </main>
    `;
}

function renderizarErrorOperativo(error) {
    const app = obtenerApp();
    app.innerHTML = `
        <main class="system-error">
            <section class="system-error__card">
                <h1>No fue posible cargar el módulo</h1>
                <p>${escaparHTML(error?.message || "Ocurrió un error inesperado.")}</p>
                <div class="system-error__actions">
                    <button id="btn-reintentar-operativos" class="button button--primary" type="button">Reintentar</button>
                    <button id="btn-inicio-operativos" class="button button--secondary" type="button">Volver al inicio</button>
                </div>
            </section>
        </main>
    `;

    document.getElementById("btn-reintentar-operativos")?.addEventListener("click", () => mostrarRegistrarOperativo());
    document.getElementById("btn-inicio-operativos")?.addEventListener("click", () => navegar("/inicio"));
}

function obtenerApp() {
    const app = document.getElementById("app");
    if (!app) {
        throw new Error("No se encontró el contenedor principal.");
    }
    return app;
}

function obtenerToken() {
    const token = obtenerCookie(CONFIG.SESSION_COOKIE);
    if (!token) {
        throw new Error("La sesión ha expirado.");
    }
    return token;
}

function obtenerArreglo(valor) {
    return Array.isArray(valor) ? valor : [];
}

function normalizarTexto(valor) {
    if (valor === null || valor === undefined) {
        return null;
    }
    const texto = String(valor).trim();
    return texto || null;
}

function enteroSeguro(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0 ? Math.trunc(numero) : 0;
}

function decimalSeguro(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

function fechaActualISO() {
    const fecha = new Date();
    const diferenciaZona = fecha.getTimezoneOffset() * 60000;
    return new Date(fecha.getTime() - diferenciaZona).toISOString().slice(0, 10);
}

function formatearFecha(valor) {
    if (!valor) {
        return "No especificada";
    }
    const fecha = new Date(`${String(valor).slice(0, 10)}T12:00:00`);
    return Number.isNaN(fecha.getTime())
        ? String(valor)
        : new Intl.DateTimeFormat("es-MX", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(fecha);
}

function escaparHTML(valor) {
    const elemento = document.createElement("div");
    elemento.textContent = String(valor ?? "");
    return elemento.innerHTML;
}
