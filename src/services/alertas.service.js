import { supabase } from "./supabase.js";


/*
==========================================================
UTILIDADES
==========================================================
*/

function validarToken(token) {
    if (
        !token ||
        typeof token !== "string"
    ) {
        throw new Error(
            "La sesión ha expirado."
        );
    }
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


function normalizarUUID(valor) {
    return normalizarTexto(valor);
}


function normalizarFecha(valor) {
    return normalizarTexto(valor);
}


function normalizarEntero(
    valor,
    predeterminado,
    minimo,
    maximo
) {
    const numero =
        Number(valor);

    if (!Number.isFinite(numero)) {
        return predeterminado;
    }

    return Math.min(
        Math.max(
            Math.trunc(numero),
            minimo
        ),
        maximo
    );
}


function crearError(
    error,
    mensajePredeterminado
) {
    if (error instanceof Error) {
        return error;
    }

    if (
        error &&
        typeof error === "object" &&
        "message" in error
    ) {
        return new Error(
            String(error.message)
        );
    }

    return new Error(
        mensajePredeterminado
    );
}


function validarRespuesta(
    data,
    mensajePredeterminado
) {
    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    ) {
        throw new Error(
            mensajePredeterminado
        );
    }

    if (data.ok === false) {
        throw new Error(
            data.mensaje ||
            mensajePredeterminado
        );
    }

    return data;
}


/*
==========================================================
CONSULTAR ALERTAS
==========================================================
*/

/**
 * Consulta las alertas autorizadas para el usuario.
 *
 * Supervisor:
 * puede consultar todas las jurisdicciones o filtrar una.
 *
 * Jurisdicción:
 * la RPC limita automáticamente los resultados.
 *
 * @param {string} token
 * @param {Object} filtros
 * @param {string|null} [filtros.jurisdiccion]
 * @param {string|null} [filtros.tipo]
 * @param {string|null} [filtros.prioridad]
 * @param {boolean} [filtros.solo_pendientes]
 * @param {string|null} [filtros.fecha_inicio]
 * @param {string|null} [filtros.fecha_fin]
 * @param {number} [filtros.limite]
 * @param {number} [filtros.offset]
 * @returns {Promise<{
 *   usuario: Record<string, any>,
 *   filtros: Record<string, any>,
 *   resumen: Record<string, any>,
 *   total: number,
 *   limite: number,
 *   offset: number,
 *   alertas: Array<Record<string, any>>,
 *   tipos: Array<Record<string, any>>
 * }>}
 */
export async function obtenerAlertas(
    token,
    filtros = {}
) {
    validarToken(token);

    const limite =
        normalizarEntero(
            filtros.limite,
            50,
            1,
            200
        );

    const offset =
        normalizarEntero(
            filtros.offset,
            0,
            0,
            Number.MAX_SAFE_INTEGER
        );

    const {
        data,
        error
    } = await supabase.rpc(
        "obtener_alertas_app",
        {
            p_token:
                token,

            p_jurisdiccion:
                normalizarTexto(
                    filtros.jurisdiccion
                ),

            p_tipo:
                normalizarTexto(
                    filtros.tipo
                ),

            p_prioridad:
                normalizarTexto(
                    filtros.prioridad
                ),

            p_solo_pendientes:
                filtros.solo_pendientes !==
                false,

            p_fecha_inicio:
                normalizarFecha(
                    filtros.fecha_inicio
                ),

            p_fecha_fin:
                normalizarFecha(
                    filtros.fecha_fin
                ),

            p_limite:
                limite,

            p_offset:
                offset
        }
    );

    if (error) {
        throw crearError(
            error,
            "No fue posible consultar las alertas."
        );
    }

    const respuesta =
        validarRespuesta(
            data,
            "No fue posible consultar las alertas."
        );

    return {
        usuario:
            respuesta.usuario &&
            typeof respuesta.usuario ===
                "object"
                ? respuesta.usuario
                : {},

        filtros:
            respuesta.filtros &&
            typeof respuesta.filtros ===
                "object"
                ? respuesta.filtros
                : {},

        resumen:
            respuesta.resumen &&
            typeof respuesta.resumen ===
                "object"
                ? respuesta.resumen
                : {},

        total:
            Number(
                respuesta.total
            ) || 0,

        limite:
            Number(
                respuesta.limite
            ) || limite,

        offset:
            Number(
                respuesta.offset
            ) || offset,

        alertas:
            Array.isArray(
                respuesta.alertas
            )
                ? respuesta.alertas
                : [],

        tipos:
            Array.isArray(
                respuesta.tipos
            )
                ? respuesta.tipos
                : []
    };
}


/*
==========================================================
ATENDER ALERTA REGISTRADA
==========================================================
*/

/**
 * Marca como atendida una alerta real de la tabla alertas.
 *
 * Las alertas dinámicas no se atienden manualmente:
 * desaparecen cuando se corrige la condición que las genera.
 *
 * @param {string} token
 * @param {string} alertaId
 * @param {string|null} observaciones
 * @returns {Promise<Record<string, any>>}
 */
export async function atenderAlerta(
    token,
    alertaId,
    observaciones = null
) {
    validarToken(token);

    const id =
        normalizarUUID(
            alertaId
        );

    if (!id) {
        throw new Error(
            "El identificador de la alerta es obligatorio."
        );
    }

    const {
        data,
        error
    } = await supabase.rpc(
        "atender_alerta_app",
        {
            p_token:
                token,

            p_alerta_id:
                id,

            p_observaciones:
                normalizarTexto(
                    observaciones
                )
        }
    );

    if (error) {
        throw crearError(
            error,
            "No fue posible atender la alerta."
        );
    }

    return validarRespuesta(
        data,
        "No fue posible atender la alerta."
    );
}


/*
==========================================================
SELECTORES DE RESPUESTA
==========================================================
*/

export function obtenerResumenAlertas(
    respuesta
) {
    return respuesta?.resumen &&
        typeof respuesta.resumen ===
            "object"
        ? respuesta.resumen
        : {};
}


export function obtenerListaAlertas(
    respuesta
) {
    return Array.isArray(
        respuesta?.alertas
    )
        ? respuesta.alertas
        : [];
}


export function obtenerTiposAlertas(
    respuesta
) {
    return Array.isArray(
        respuesta?.tipos
    )
        ? respuesta.tipos
        : [];
}


export function obtenerFiltrosAlertas(
    respuesta
) {
    return respuesta?.filtros &&
        typeof respuesta.filtros ===
            "object"
        ? respuesta.filtros
        : {};
}


export function obtenerUsuarioAlertas(
    respuesta
) {
    return respuesta?.usuario &&
        typeof respuesta.usuario ===
            "object"
        ? respuesta.usuario
        : {};
}


/*
==========================================================
PERMISOS
==========================================================
*/

export function puedeConsultarAlertasEstatales(
    respuesta
) {
    return Boolean(
        respuesta?.usuario
            ?.puede_consultar_estado
    );
}


export function obtenerJurisdiccionAlertas(
    respuesta
) {
    return respuesta?.usuario
        ?.jurisdiccion ??
        null;
}


export function obtenerRolAlertas(
    respuesta
) {
    return respuesta?.usuario
        ?.rol ??
        null;
}


/*
==========================================================
PAGINACIÓN
==========================================================
*/

export function calcularPaginacionAlertas(
    total,
    limite,
    offset
) {
    const totalNormalizado =
        Math.max(
            Number(total) || 0,
            0
        );

    const limiteNormalizado =
        Math.max(
            Number(limite) || 1,
            1
        );

    const offsetNormalizado =
        Math.max(
            Number(offset) || 0,
            0
        );

    const totalPaginas =
        Math.max(
            Math.ceil(
                totalNormalizado /
                limiteNormalizado
            ),
            1
        );

    const paginaActual =
        Math.min(
            Math.floor(
                offsetNormalizado /
                limiteNormalizado
            ) + 1,
            totalPaginas
        );

    return {
        paginaActual,

        totalPaginas,

        tieneAnterior:
            offsetNormalizado > 0,

        tieneSiguiente:
            offsetNormalizado +
            limiteNormalizado <
            totalNormalizado,

        offsetAnterior:
            Math.max(
                offsetNormalizado -
                limiteNormalizado,
                0
            ),

        offsetSiguiente:
            offsetNormalizado +
            limiteNormalizado
    };
}


/*
==========================================================
CLASIFICACIÓN VISUAL
==========================================================
*/

export function obtenerClasePrioridad(
    prioridad
) {
    const valor =
        String(
            prioridad || ""
        ).toUpperCase();

    if (valor === "ALTA") {
        return "alert-priority--high";
    }

    if (valor === "MEDIA") {
        return "alert-priority--medium";
    }

    if (valor === "BAJA") {
        return "alert-priority--low";
    }

    return "alert-priority--neutral";
}


export function obtenerClaseOrigenAlerta(
    origen
) {
    const valor =
        String(
            origen || ""
        ).toUpperCase();

    if (valor === "CASO") {
        return "alert-origin--case";
    }

    if (valor === "VERIFICACION") {
        return "alert-origin--verification";
    }

    if (valor === "INVENTARIO") {
        return "alert-origin--inventory";
    }

    if (valor === "REGISTRADA") {
        return "alert-origin--registered";
    }

    return "alert-origin--neutral";
}


/*
==========================================================
ACCIONES DISPONIBLES
==========================================================
*/

export function puedeAtenderAlerta(
    alerta
) {
    return Boolean(
        alerta?.puede_atender &&
        alerta?.alerta_id &&
        alerta?.atendida !== true
    );
}


export function tieneOperativoRelacionado(
    alerta
) {
    return Boolean(
        alerta?.operativo_id
    );
}


export function tieneVerificacionRelacionada(
    alerta
) {
    return Boolean(
        alerta?.verificacion_id
    );
}


export function tieneLoteRelacionado(
    alerta
) {
    return Boolean(
        alerta?.lote_id
    );
}


export function tieneCasoRelacionado(
    alerta
) {
    return Boolean(
        alerta?.folio_caso
    );
}