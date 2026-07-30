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


function normalizarBooleano(
    valor,
    predeterminado = true
) {
    if (
        valor === undefined ||
        valor === null
    ) {
        return predeterminado;
    }

    return Boolean(valor);
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
CATÁLOGOS DE REPORTES
==========================================================
*/

/**
 * Obtiene catálogos, permisos y tipos de reporte.
 *
 * @param {string} token
 * @returns {Promise<{
 *   usuario: Record<string, any>,
 *   jurisdicciones: Array<Record<string, any>>,
 *   programas: Array<Record<string, any>>,
 *   tipos_operativo: Array<Record<string, any>>,
 *   tipos_actividad: Array<Record<string, any>>,
 *   tipos_reporte: Array<Record<string, any>>
 * }>}
 */
export async function obtenerCatalogosReportes(
    token
) {
    validarToken(token);

    const {
        data,
        error
    } = await supabase.rpc(
        "obtener_catalogos_reportes",
        {
            p_token:
                token
        }
    );

    if (error) {
        throw crearError(
            error,
            "No fue posible obtener los catálogos de reportes."
        );
    }

    const respuesta =
        validarRespuesta(
            data,
            "No fue posible obtener los catálogos de reportes."
        );

    return {
        usuario:
            obtenerObjeto(
                respuesta.usuario
            ),

        jurisdicciones:
            obtenerArreglo(
                respuesta.jurisdicciones
            ),

        programas:
            obtenerArreglo(
                respuesta.programas
            ),

        tipos_operativo:
            obtenerArreglo(
                respuesta.tipos_operativo
            ),

        tipos_actividad:
            obtenerArreglo(
                respuesta.tipos_actividad
            ),

        tipos_reporte:
            obtenerArreglo(
                respuesta.tipos_reporte
            )
    };
}


/*
==========================================================
GENERAR REPORTE
==========================================================
*/

/**
 * Genera un reporte paginado.
 *
 * @param {string} token
 * @param {Object} filtros
 * @param {string} filtros.tipo_reporte
 * @param {string|null} [filtros.fecha_inicio]
 * @param {string|null} [filtros.fecha_fin]
 * @param {string|null} [filtros.jurisdiccion]
 * @param {string|null} [filtros.programa_id]
 * @param {string|null} [filtros.tipo_operativo_id]
 * @param {string|null} [filtros.tipo_actividad_id]
 * @param {string|null} [filtros.busqueda]
 * @param {boolean} [filtros.incluir_verificaciones]
 * @param {number} [filtros.limite]
 * @param {number} [filtros.offset]
 * @returns {Promise<{
 *   tipo_reporte: string,
 *   generado_en: string|null,
 *   usuario: Record<string, any>,
 *   filtros: Record<string, any>,
 *   columnas: string[],
 *   total: number,
 *   limite: number,
 *   offset: number,
 *   registros: Array<Record<string, any>>
 * }>}
 */
export async function generarReporte(
    token,
    filtros = {}
) {
    validarToken(token);

    const tipoReporte =
        normalizarTexto(
            filtros.tipo_reporte
        );

    if (!tipoReporte) {
        throw new Error(
            "Seleccione un tipo de reporte."
        );
    }

    const limite =
        normalizarEntero(
            filtros.limite,
            100,
            1,
            5000
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
        "generar_reporte_app",
        {
            p_token:
                token,

            p_tipo_reporte:
                tipoReporte,

            p_fecha_inicio:
                normalizarFecha(
                    filtros.fecha_inicio
                ),

            p_fecha_fin:
                normalizarFecha(
                    filtros.fecha_fin
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

            p_tipo_actividad_id:
                normalizarUUID(
                    filtros.tipo_actividad_id
                ),

            p_busqueda:
                normalizarTexto(
                    filtros.busqueda
                ),

            p_incluir_verificaciones:
                normalizarBooleano(
                    filtros.incluir_verificaciones,
                    true
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
            "No fue posible generar el reporte."
        );
    }

    const respuesta =
        validarRespuesta(
            data,
            "No fue posible generar el reporte."
        );

    return {
        tipo_reporte:
            String(
                respuesta.tipo_reporte ||
                tipoReporte
            ),

        generado_en:
            respuesta.generado_en ||
            null,

        usuario:
            obtenerObjeto(
                respuesta.usuario
            ),

        filtros:
            obtenerObjeto(
                respuesta.filtros
            ),

        columnas:
            obtenerArreglo(
                respuesta.columnas
            ).map(
                columna =>
                    String(columna)
            ),

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

        registros:
            obtenerArreglo(
                respuesta.registros
            )
    };
}


/*
==========================================================
GENERAR REPORTE COMPLETO PARA EXPORTACIÓN
==========================================================
*/

/**
 * Descarga todos los registros del reporte en bloques.
 *
 * La RPC permite hasta 5000 registros por consulta.
 * Esta función pagina automáticamente hasta completar
 * el total.
 *
 * @param {string} token
 * @param {Object} filtros
 * @param {number} [tamanoBloque]
 * @returns {Promise<{
 *   tipo_reporte: string,
 *   generado_en: string|null,
 *   filtros: Record<string, any>,
 *   columnas: string[],
 *   total: number,
 *   registros: Array<Record<string, any>>
 * }>}
 */
export async function generarReporteCompleto(
    token,
    filtros = {},
    tamanoBloque = 5000
) {
    validarToken(token);

    const limite =
        normalizarEntero(
            tamanoBloque,
            5000,
            1,
            5000
        );

    let offset = 0;
    let total = 0;

    let tipoReporte = "";
    let generadoEn = null;
    let filtrosAplicados = {};
    let columnas = [];

    const registros = [];

    do {
        const respuesta =
            await generarReporte(
                token,
                {
                    ...filtros,
                    limite,
                    offset
                }
            );

        tipoReporte =
            respuesta.tipo_reporte;

        generadoEn =
            respuesta.generado_en;

        filtrosAplicados =
            respuesta.filtros;

        columnas =
            respuesta.columnas;

        total =
            respuesta.total;

        registros.push(
            ...respuesta.registros
        );

        offset +=
            respuesta.registros.length;

        if (
            respuesta.registros.length === 0
        ) {
            break;
        }
    } while (
        registros.length < total
    );

    return {
        tipo_reporte:
            tipoReporte,

        generado_en:
            generadoEn,

        filtros:
            filtrosAplicados,

        columnas,

        total,

        registros
    };
}


/*
==========================================================
EXPORTACIÓN CSV
==========================================================
*/

/**
 * Convierte registros a CSV compatible con Excel.
 *
 * @param {Array<Record<string, any>>} registros
 * @param {string[]} columnas
 * @returns {string}
 */
export function convertirReporteCSV(
    registros,
    columnas
) {
    const filas =
        obtenerArreglo(
            registros
        );

    const encabezados =
        resolverColumnas(
            filas,
            columnas
        );

    if (encabezados.length === 0) {
        return "";
    }

    const separador = ",";

    const lineas = [
        encabezados
            .map(
                convertirValorCSV
            )
            .join(separador)
    ];

    for (const registro of filas) {
        const linea =
            encabezados
                .map(columna =>
                    convertirValorCSV(
                        obtenerValorColumna(
                            registro,
                            columna
                        )
                    )
                )
                .join(separador);

        lineas.push(linea);
    }

    /*
    BOM UTF-8 para que Excel reconozca correctamente
    acentos, ñ y caracteres especiales.
    */
    return `\uFEFF${lineas.join("\r\n")}`;
}


/**
 * Crea y descarga un archivo CSV en el navegador.
 *
 * @param {string} contenidoCSV
 * @param {string} nombreArchivo
 */
export function descargarCSV(
    contenidoCSV,
    nombreArchivo
) {
    if (
        !contenidoCSV ||
        typeof contenidoCSV !==
            "string"
    ) {
        throw new Error(
            "No existen datos para exportar."
        );
    }

    const nombre =
        asegurarExtensionCSV(
            normalizarNombreArchivo(
                nombreArchivo ||
                "reporte"
            )
        );

    const blob =
        new Blob(
            [contenidoCSV],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const enlace =
        document.createElement("a");

    enlace.href =
        url;

    enlace.download =
        nombre;

    enlace.style.display =
        "none";

    document.body.appendChild(
        enlace
    );

    enlace.click();

    enlace.remove();

    window.setTimeout(
        () => {
            URL.revokeObjectURL(
                url
            );
        },
        1000
    );
}


/**
 * Genera un nombre estándar para el reporte.
 *
 * @param {string} tipoReporte
 * @param {Object} filtros
 * @returns {string}
 */
export function crearNombreArchivoReporte(
    tipoReporte,
    filtros = {}
) {
    const tipo =
        String(
            tipoReporte ||
            "reporte"
        )
            .trim()
            .toLowerCase()
            .replaceAll("_", "-");

    const partes = [
        "secr-etv",
        tipo
    ];

    if (filtros.jurisdiccion) {
        partes.push(
            `jur-${String(
                filtros.jurisdiccion
            ).trim()}`
        );
    } else {
        partes.push("estatal");
    }

    if (filtros.fecha_inicio) {
        partes.push(
            String(
                filtros.fecha_inicio
            ).slice(0, 10)
        );
    }

    if (filtros.fecha_fin) {
        partes.push(
            String(
                filtros.fecha_fin
            ).slice(0, 10)
        );
    }

    return asegurarExtensionCSV(
        normalizarNombreArchivo(
            partes.join("_")
        )
    );
}


/*
==========================================================
SELECTORES DE CATÁLOGOS
==========================================================
*/

export function obtenerUsuarioReportes(
    catalogos
) {
    return obtenerObjeto(
        catalogos?.usuario
    );
}


export function obtenerJurisdiccionesReportes(
    catalogos
) {
    return obtenerArreglo(
        catalogos?.jurisdicciones
    );
}


export function obtenerProgramasReportes(
    catalogos
) {
    return obtenerArreglo(
        catalogos?.programas
    );
}


export function obtenerTiposOperativoReportes(
    catalogos
) {
    return obtenerArreglo(
        catalogos?.tipos_operativo
    );
}


export function obtenerTiposActividadReportes(
    catalogos
) {
    return obtenerArreglo(
        catalogos?.tipos_actividad
    );
}


export function obtenerTiposReporte(
    catalogos
) {
    return obtenerArreglo(
        catalogos?.tipos_reporte
    );
}


/*
==========================================================
PERMISOS
==========================================================
*/

export function puedeConsultarReportesEstatales(
    catalogos
) {
    return Boolean(
        catalogos?.usuario
            ?.puede_consultar_estado
    );
}


export function obtenerJurisdiccionReporteUsuario(
    catalogos
) {
    return catalogos?.usuario
        ?.jurisdiccion ??
        null;
}


export function obtenerRolReportes(
    catalogos
) {
    return catalogos?.usuario
        ?.rol ??
        null;
}


/*
==========================================================
FILTROS DE CATÁLOGOS
==========================================================
*/

/**
 * Filtra los tipos de operativo de acuerdo con el
 * programa seleccionado.
 *
 * @param {Array<Record<string, any>>} tipos
 * @param {string|null} programaId
 * @returns {Array<Record<string, any>>}
 */
export function filtrarTiposOperativo(
    tipos,
    programaId
) {
    const registros =
        obtenerArreglo(
            tipos
        );

    const programa =
        normalizarUUID(
            programaId
        );

    if (!programa) {
        return registros;
    }

    return registros.filter(
        tipo =>
            tipo.programa_id ===
            programa
    );
}


/**
 * Filtra actividades de acuerdo con el programa.
 *
 * @param {Array<Record<string, any>>} tipos
 * @param {string|null} programaId
 * @returns {Array<Record<string, any>>}
 */
export function filtrarTiposActividad(
    tipos,
    programaId
) {
    const registros =
        obtenerArreglo(
            tipos
        );

    const programa =
        normalizarUUID(
            programaId
        );

    if (!programa) {
        return registros;
    }

    return registros.filter(
        tipo =>
            tipo.programa_id ===
            programa
    );
}


/*
==========================================================
PAGINACIÓN
==========================================================
*/

export function calcularPaginacionReportes(
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
COLUMNAS Y VALORES CSV
==========================================================
*/

function resolverColumnas(
    registros,
    columnas
) {
    const columnasDefinidas =
        obtenerArreglo(
            columnas
        )
            .map(columna =>
                String(columna)
            )
            .filter(Boolean);

    if (
        columnasDefinidas.length >
        0
    ) {
        return columnasDefinidas;
    }

    const conjunto =
        new Set();

    for (
        const registro
        of obtenerArreglo(registros)
    ) {
        if (
            !registro ||
            typeof registro !==
                "object" ||
            Array.isArray(registro)
        ) {
            continue;
        }

        Object.keys(
            registro
        ).forEach(
            clave =>
                conjunto.add(clave)
        );
    }

    return Array.from(
        conjunto
    );
}


function obtenerValorColumna(
    registro,
    columna
) {
    if (
        !registro ||
        typeof registro !==
            "object"
    ) {
        return "";
    }

    const valor =
        registro[columna];

    if (
        valor === null ||
        valor === undefined
    ) {
        return "";
    }

    if (
        typeof valor === "object"
    ) {
        return JSON.stringify(
            valor
        );
    }

    return valor;
}


function convertirValorCSV(valor) {
    if (
        valor === null ||
        valor === undefined
    ) {
        return "";
    }

    let texto;

    if (
        typeof valor === "boolean"
    ) {
        texto =
            valor
                ? "Sí"
                : "No";
    } else if (
        typeof valor === "object"
    ) {
        texto =
            JSON.stringify(valor);
    } else {
        texto =
            String(valor);
    }

    /*
    Neutraliza valores que Excel podría interpretar
    como fórmulas.
    */
    if (
        /^[=+\-@]/.test(texto)
    ) {
        texto =
            `'${texto}`;
    }

    const textoEscapado =
        texto.replaceAll(
            "\"",
            "\"\""
        );

    return `"${textoEscapado}"`;
}


/*
==========================================================
NOMBRE DEL ARCHIVO
==========================================================
*/

function normalizarNombreArchivo(
    valor
) {
    const nombre =
        String(
            valor ||
            "reporte"
        )
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /[^a-zA-Z0-9._-]+/g,
                "-"
            )
            .replace(
                /-+/g,
                "-"
            )
            .replace(
                /^[-_.]+|[-_.]+$/g,
                ""
            )
            .toLowerCase();

    return nombre || "reporte";
}


function asegurarExtensionCSV(
    nombre
) {
    return String(nombre)
        .toLowerCase()
        .endsWith(".csv")
            ? nombre
            : `${nombre}.csv`;
}


/*
==========================================================
TIPOS SEGUROS
==========================================================
*/

function obtenerArreglo(valor) {
    return Array.isArray(valor)
        ? valor
        : [];
}


function obtenerObjeto(valor) {
    return (
        valor &&
        typeof valor === "object" &&
        !Array.isArray(valor)
    )
        ? valor
        : {};
}