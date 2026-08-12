import { supabase } from "./supabase.js";


/**
 * Convierte un error de Supabase o Javascript
 * en una instancia normalizada de Error.
 *
 * @param {unknown} error
 * @param {string} mensajePredeterminado
 * @returns {Error}
 */
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


/**
 * Valida el objeto regresado por una RPC.
 *
 * @param {unknown} data
 * @param {string} mensajePredeterminado
 * @returns {Record<string, any>}
 */
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


/**
 * Valida que exista un token de sesión.
 *
 * @param {string} token
 */
function validarToken(token) {
    if (
        !token ||
        typeof token !== "string"
    ) {
        throw new Error(
            "No existe una sesión activa."
        );
    }
}


/**
 * Normaliza un texto opcional.
 *
 * @param {unknown} valor
 * @returns {string|null}
 */
function normalizarTexto(valor) {
    if (
        valor === undefined ||
        valor === null
    ) {
        return null;
    }

    const texto = String(valor).trim();

    return texto || null;
}


/**
 * Normaliza un UUID opcional.
 *
 * @param {unknown} valor
 * @returns {string|null}
 */
function normalizarUUID(valor) {
    return normalizarTexto(valor);
}


/**
 * Normaliza una fecha opcional.
 *
 * @param {unknown} valor
 * @returns {string|null}
 */
function normalizarFecha(valor) {
    const texto = normalizarTexto(valor);

    if (!texto) {
        return null;
    }

    return texto;
}


/**
 * Normaliza un entero para paginación.
 *
 * @param {unknown} valor
 * @param {number} predeterminado
 * @param {number} minimo
 * @param {number} maximo
 * @returns {number}
 */
function normalizarEntero(
    valor,
    predeterminado,
    minimo,
    maximo
) {
    const numero = Number(valor);

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


/*
==========================================================
CONSULTA DE CASOS
==========================================================
*/

/**
 * Consulta casos autorizados para el usuario.
 *
 * Supervisor:
 * puede filtrar por jurisdicción.
 *
 * Jurisdiccional:
 * Supabase utiliza automáticamente su jurisdicción.
 *
 * @param {string} token
 * @param {Object} filtros
 * @param {string} [filtros.busqueda]
 * @param {string} [filtros.jurisdiccion]
 * @param {string} [filtros.clasificacion]
 * @param {string} [filtros.fecha_inicio]
 * @param {string} [filtros.fecha_fin]
 * @param {number} [filtros.limite]
 * @param {number} [filtros.offset]
 * @returns {Promise<{
 *   total:number,
 *   limite:number,
 *   offset:number,
 *   casos:Array<Record<string, any>>
 * }>}
 */
export async function consultarCasos(
    token,
    filtros = {}
) {
    validarToken(token);

    const limite = normalizarEntero(
        filtros.limite,
        50,
        1,
        200
    );

    const offset = normalizarEntero(
        filtros.offset,
        0,
        0,
        Number.MAX_SAFE_INTEGER
    );

    const { data, error } = await supabase.rpc(
        "consultar_casos",
        {
            p_token: token,

            p_busqueda:
                normalizarTexto(
                    filtros.busqueda
                ),

            p_jurisdiccion:
                normalizarTexto(
                    filtros.jurisdiccion
                ),

            p_clasificacion:
                normalizarTexto(
                    filtros.clasificacion
                ),

            p_fecha_inicio:
                normalizarFecha(
                    filtros.fecha_inicio
                ),

            p_fecha_fin:
                normalizarFecha(
                    filtros.fecha_fin
                ),

            p_limite: limite,

            p_offset: offset
        }
    );

    if (error) {
        throw crearError(
            error,
            "No fue posible consultar los casos."
        );
    }

    const respuesta = validarRespuesta(
        data,
        "No fue posible consultar los casos."
    );

    return {
        total:
            Number(respuesta.total) || 0,

        limite:
            Number(respuesta.limite) ||
            limite,

        offset:
            Number(respuesta.offset) ||
            offset,

        casos:
            Array.isArray(respuesta.casos)
                ? respuesta.casos
                : []
    };
}


/*
==========================================================
CONSULTA DE OPERATIVOS
==========================================================
*/

/**
 * Consulta los operativos autorizados.
 *
 * @param {string} token
 * @param {Object} filtros
 * @param {string} [filtros.busqueda]
 * @param {string} [filtros.jurisdiccion]
 * @param {string} [filtros.programa_id]
 * @param {string} [filtros.tipo_operativo_id]
 * @param {string} [filtros.fecha_inicio]
 * @param {string} [filtros.fecha_fin]
 * @param {string} [filtros.estatus]
 * @param {number} [filtros.limite]
 * @param {number} [filtros.offset]
 * @returns {Promise<{
 *   total:number,
 *   limite:number,
 *   offset:number,
 *   operativos:Array<Record<string, any>>
 * }>}
 */
export async function consultarOperativos(
    token,
    filtros = {}
) {
    validarToken(token);

    const limite = normalizarEntero(
        filtros.limite,
        50,
        1,
        200
    );

    const offset = normalizarEntero(
        filtros.offset,
        0,
        0,
        Number.MAX_SAFE_INTEGER
    );

    const { data, error } = await supabase.rpc(
        "consultar_operativos",
        {
            p_token: token,

            p_busqueda:
                normalizarTexto(
                    filtros.busqueda
                ),

            p_jurisdiccion:
                normalizarTexto(
                    filtros.jurisdiccion
                ),

            p_programa_id:
                normalizarUUID(
                    filtros.programa_id
                ),

            p_tipo_operativo_id:
                normalizarUUID(
                    filtros.tipo_operativo_id
                ),

            p_fecha_inicio:
                normalizarFecha(
                    filtros.fecha_inicio
                ),

            p_fecha_fin:
                normalizarFecha(
                    filtros.fecha_fin
                ),

            p_estatus:
                normalizarTexto(
                    filtros.estatus
                ),

            p_limite: limite,

            p_offset: offset
        }
    );

    if (error) {
        throw crearError(
            error,
            "No fue posible consultar los operativos."
        );
    }

    const respuesta = validarRespuesta(
        data,
        "No fue posible consultar los operativos."
    );

    return {
        total:
            Number(respuesta.total) || 0,

        limite:
            Number(respuesta.limite) ||
            limite,

        offset:
            Number(respuesta.offset) ||
            offset,

        operativos:
            Array.isArray(
                respuesta.operativos
            )
                ? respuesta.operativos
                : Array.isArray(
                    respuesta.resultados
                )
                    ? respuesta.resultados
                    : Array.isArray(
                        respuesta.datos
                    )
                        ? respuesta.datos
                        : []
    };
}


/*
==========================================================
DETALLE DE OPERATIVO
==========================================================
*/

/**
 * Consulta un operativo completo.
 *
 * Incluye:
 * - datos generales;
 * - manzanas;
 * - viviendas;
 * - visitas sucesivas;
 * - actividades ordinarias;
 * - verificaciones;
 * - encuestas;
 * - rociados;
 * - animales;
 * - consumos.
 *
 * @param {string} token
 * @param {string} operativoId
 * @returns {Promise<{
 *   operativo:Record<string, any>,
 *   totales:Record<string, any>,
 *   manzanas:Array<Record<string, any>>
 * }>}
 */
export async function consultarDetalleOperativo(
    token,
    operativoId
) {
    validarToken(token);

    const id = normalizarUUID(
        operativoId
    );

    if (!id) {
        throw new Error(
            "El identificador del operativo es obligatorio."
        );
    }

    const { data, error } = await supabase.rpc(
        "consultar_detalle_operativo",
        {
            p_token: token,
            p_operativo_id: id
        }
    );

    if (error) {
        throw crearError(
            error,
            "No fue posible consultar el detalle del operativo."
        );
    }

    const respuesta = validarRespuesta(
        data,
        "No fue posible consultar el detalle del operativo."
    );

    return {
        operativo:
            respuesta.operativo &&
            typeof respuesta.operativo === "object"
                ? respuesta.operativo
                : {},

        totales:
            respuesta.totales &&
            typeof respuesta.totales === "object"
                ? respuesta.totales
                : {},

        manzanas:
            Array.isArray(respuesta.manzanas)
                ? respuesta.manzanas
                : Array.isArray(
                    respuesta.manzanas_detalle
                )
                    ? respuesta.manzanas_detalle
                    : []
    };
}


/*
==========================================================
CONSULTA DE INVENTARIO
==========================================================
*/

/**
 * Consulta el inventario autorizado.
 *
 * @param {string} token
 * @param {Object} filtros
 * @param {string} [filtros.jurisdiccion]
 * @param {string} [filtros.busqueda]
 * @param {string} [filtros.categoria]
 * @param {boolean} [filtros.solo_disponible]
 * @param {number} [filtros.limite]
 * @param {number} [filtros.offset]
 * @returns {Promise<{
 *   total:number,
 *   limite:number,
 *   offset:number,
 *   inventario:Array<Record<string, any>>
 * }>}
 */
export async function consultarInventario(
    token,
    filtros = {}
) {
    validarToken(token);

    const limite = normalizarEntero(
        filtros.limite,
        100,
        1,
        500
    );

    const offset = normalizarEntero(
        filtros.offset,
        0,
        0,
        Number.MAX_SAFE_INTEGER
    );

    const { data, error } = await supabase.rpc(
        "consultar_inventario",
        {
            p_token: token,

            p_jurisdiccion:
                normalizarTexto(
                    filtros.jurisdiccion
                ),

            p_busqueda:
                normalizarTexto(
                    filtros.busqueda
                ),

            p_categoria:
                normalizarTexto(
                    filtros.categoria
                ),

            p_solo_disponible:
                Boolean(
                    filtros.solo_disponible
                ),

            p_limite: limite,

            p_offset: offset
        }
    );

    if (error) {
        throw crearError(
            error,
            "No fue posible consultar el inventario."
        );
    }

    const respuesta = validarRespuesta(
        data,
        "No fue posible consultar el inventario."
    );

    return {
        total:
            Number(respuesta.total) || 0,

        limite:
            Number(respuesta.limite) ||
            limite,

        offset:
            Number(respuesta.offset) ||
            offset,

        inventario:
            Array.isArray(
                respuesta.inventario
            )
                ? respuesta.inventario
                : []
    };
}


/*
==========================================================
VERIFICACIONES PENDIENTES
==========================================================
*/

/**
 * Consulta los ciclos de verificación.
 *
 * @param {string} token
 * @param {Object} filtros
 * @param {string} [filtros.jurisdiccion]
 * @param {string} [filtros.estatus]
 * @returns {Promise<Array<Record<string, any>>>}
 */
export async function consultarVerificaciones(
    token,
    filtros = {}
) {
    validarToken(token);

    const { data, error } = await supabase.rpc(
        "consultar_verificaciones_pendientes",
        {
            p_token: token,

            p_jurisdiccion:
                normalizarTexto(
                    filtros.jurisdiccion
                ),

            p_estatus:
                normalizarTexto(
                    filtros.estatus
                )
        }
    );

    if (error) {
        throw crearError(
            error,
            "No fue posible consultar las verificaciones."
        );
    }

    const respuesta = validarRespuesta(
        data,
        "No fue posible consultar las verificaciones."
    );

    return Array.isArray(
        respuesta.verificaciones
    )
        ? respuesta.verificaciones
        : [];
}


/*
==========================================================
CREAR VERIFICACIÓN ADICIONAL
==========================================================
*/

/**
 * Programa una verificación adicional para
 * un caso confirmado.
 *
 * @param {string} token
 * @param {Object} datos
 * @param {string} datos.operativo_base_id
 * @param {string|null} [datos.fecha_programada]
 * @param {string|null} [datos.motivo]
 * @returns {Promise<Record<string, any>>}
 */
export async function crearVerificacionAdicional(
    token,
    datos
) {
    validarToken(token);

    if (
        !datos ||
        typeof datos !== "object"
    ) {
        throw new Error(
            "La información de la verificación no es válida."
        );
    }

    const operativoId = normalizarUUID(
        datos.operativo_base_id
    );

    if (!operativoId) {
        throw new Error(
            "Seleccione el operativo base."
        );
    }

    const { data, error } = await supabase.rpc(
        "crear_verificacion_adicional",
        {
            p_token: token,

            p_operativo_base_id:
                operativoId,

            p_fecha_programada:
                normalizarFecha(
                    datos.fecha_programada
                ),

            p_motivo:
                normalizarTexto(
                    datos.motivo
                )
        }
    );

    if (error) {
        throw crearError(
            error,
            "No fue posible programar la verificación."
        );
    }

    return validarRespuesta(
        data,
        "No fue posible programar la verificación."
    );
}


/*
==========================================================
INICIAR VERIFICACIÓN
==========================================================
*/

/**
 * Cambia una verificación a EN_PROCESO.
 *
 * @param {string} token
 * @param {string} verificacionId
 * @param {string|null} fechaInicio
 * @returns {Promise<Record<string, any>>}
 */
export async function iniciarVerificacion(
    token,
    verificacionId,
    fechaInicio = null
) {
    validarToken(token);

    const id = normalizarUUID(
        verificacionId
    );

    if (!id) {
        throw new Error(
            "El identificador de la verificación es obligatorio."
        );
    }

    const { data, error } = await supabase.rpc(
        "iniciar_verificacion",
        {
            p_token: token,

            p_verificacion_id:
                id,

            p_fecha_inicio:
                normalizarFecha(
                    fechaInicio
                )
        }
    );

    if (error) {
        throw crearError(
            error,
            "No fue posible iniciar la verificación."
        );
    }

    return validarRespuesta(
        data,
        "No fue posible iniciar la verificación."
    );
}


/*
==========================================================
FINALIZAR VERIFICACIÓN
==========================================================
*/

/**
 * Finaliza una verificación que ya tenga visitas
 * o actividades asociadas.
 *
 * @param {string} token
 * @param {string} verificacionId
 * @param {string|null} fechaFinalizacion
 * @returns {Promise<Record<string, any>>}
 */
export async function finalizarVerificacion(
    token,
    verificacionId,
    fechaFinalizacion = null
) {
    validarToken(token);

    const id = normalizarUUID(
        verificacionId
    );

    if (!id) {
        throw new Error(
            "El identificador de la verificación es obligatorio."
        );
    }

    const { data, error } = await supabase.rpc(
        "finalizar_verificacion",
        {
            p_token: token,

            p_verificacion_id:
                id,

            p_fecha_finalizacion:
                normalizarFecha(
                    fechaFinalizacion
                )
        }
    );

    if (error) {
        throw crearError(
            error,
            "No fue posible finalizar la verificación."
        );
    }

    return validarRespuesta(
        data,
        "No fue posible finalizar la verificación."
    );
}


/*
==========================================================
PAGINACIÓN
==========================================================
*/

/**
 * Calcula información de paginación para
 * las páginas del frontend.
 *
 * @param {number} total
 * @param {number} limite
 * @param {number} offset
 * @returns {{
 *   paginaActual:number,
 *   totalPaginas:number,
 *   tieneAnterior:boolean,
 *   tieneSiguiente:boolean,
 *   offsetAnterior:number,
 *   offsetSiguiente:number
 * }}
 */
export function calcularPaginacion(
    total,
    limite,
    offset
) {
    const totalNormalizado = Math.max(
        Number(total) || 0,
        0
    );

    const limiteNormalizado = Math.max(
        Number(limite) || 1,
        1
    );

    const offsetNormalizado = Math.max(
        Number(offset) || 0,
        0
    );

    const totalPaginas = Math.max(
        Math.ceil(
            totalNormalizado /
            limiteNormalizado
        ),
        1
    );

    const paginaActual = Math.min(
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