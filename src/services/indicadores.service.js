import { supabase } from "./supabase.js";

/*
==========================================================
UTILIDADES
==========================================================
*/

function validarToken(token) {

    if (!token) {

        throw new Error(
            "La sesión ha expirado."
        );

    }

}

function normalizarFecha(valor) {

    if (
        valor === undefined ||
        valor === null ||
        valor === ""
    ) {

        return null;

    }

    return valor;

}

function normalizarTexto(valor) {

    if (
        valor === undefined ||
        valor === null
    ) {

        return null;

    }

    const texto = String(valor).trim();

    return texto === ""
        ? null
        : texto;

}

function validarRespuesta(
    data,
    mensaje
) {

    if (!data) {

        throw new Error(mensaje);

    }

    if (data.ok === false) {

        throw new Error(
            data.mensaje ||
            mensaje
        );

    }

    return data;

}

/*
==========================================================
OBTENER INDICADORES
==========================================================
*/

export async function obtenerIndicadores(

    token,

    filtros = {}

) {

    validarToken(token);

    const {

        data,

        error

    } = await supabase.rpc(

        "obtener_indicadores_app",

        {

            p_token: token,

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
                )

        }

    );

    if (error) {

        throw new Error(
            error.message
        );

    }

    return validarRespuesta(

        data,

        "No fue posible obtener los indicadores."

    );

}

/*
==========================================================
RESUMEN
==========================================================
*/

export function obtenerResumen(
    respuesta
) {

    return respuesta.resumen ??
        {};

}

/*
==========================================================
CASOS
==========================================================
*/

export function obtenerCasos(
    respuesta
) {

    return respuesta.casos ??
        {};

}

/*
==========================================================
OPERACIÓN
==========================================================
*/

export function obtenerOperacion(
    respuesta
) {

    return respuesta.operacion ??
        {};

}

/*
==========================================================
VIVIENDAS
==========================================================
*/

export function obtenerViviendas(
    respuesta
) {

    return respuesta.viviendas ??
        {};

}

/*
==========================================================
ANIMALES
==========================================================
*/

export function obtenerAnimales(
    respuesta
) {

    return respuesta.animales ??
        {};

}

/*
==========================================================
ENTOMOLOGÍA
==========================================================
*/

export function obtenerEntomologia(
    respuesta
) {

    return respuesta.entomologia ??
        {};

}

/*
==========================================================
VERIFICACIONES
==========================================================
*/

export function obtenerVerificaciones(
    respuesta
) {

    return respuesta.verificaciones ??
        {};

}

/*
==========================================================
CONSUMOS
==========================================================
*/

export function obtenerConsumos(
    respuesta
) {

    return respuesta.consumos ??
        {};

}

/*
==========================================================
ACTIVIDADES POR TIPO
==========================================================
*/

export function obtenerActividadesTipo(
    respuesta
) {

    return Array.isArray(
        respuesta.actividades_por_tipo
    )

        ? respuesta.actividades_por_tipo

        : [];

}

/*
==========================================================
CONSUMOS POR PRODUCTO
==========================================================
*/

export function obtenerConsumosProducto(
    respuesta
) {

    return Array.isArray(
        respuesta.consumos_por_producto
    )

        ? respuesta.consumos_por_producto

        : [];

}

/*
==========================================================
RESULTADOS POR JURISDICCIÓN
==========================================================
*/

export function obtenerJurisdicciones(
    respuesta
) {

    return Array.isArray(
        respuesta.por_jurisdiccion
    )

        ? respuesta.por_jurisdiccion

        : [];

}

/*
==========================================================
TENDENCIA
==========================================================
*/

export function obtenerTendencia(
    respuesta
) {

    return Array.isArray(
        respuesta.tendencia_mensual
    )

        ? respuesta.tendencia_mensual

        : [];

}

/*
==========================================================
PERMISOS
==========================================================
*/

export function puedeConsultarTodo(
    respuesta
) {

    return Boolean(

        respuesta.usuario
            ?.puede_consultar_estado

    );

}

export function obtenerJurisdiccionUsuario(
    respuesta
) {

    return respuesta.usuario
        ?.jurisdiccion ??
        null;

}

export function obtenerRol(
    respuesta
) {

    return respuesta.usuario
        ?.rol ??
        null;

}

/*
==========================================================
FILTROS UTILIZADOS
==========================================================
*/

export function obtenerFiltros(
    respuesta
) {

    return respuesta.filtros ??
        {};

}