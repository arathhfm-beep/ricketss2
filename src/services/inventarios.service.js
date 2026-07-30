import { supabase } from "./supabase.js";

/*
==========================================================
UTILIDADES
==========================================================
*/

function validarToken(token) {
    if (!token || typeof token !== "string") {
        throw new Error("No existe una sesión activa.");
    }
}

function normalizarTexto(valor) {
    if (valor === undefined || valor === null) {
        return null;
    }

    const texto = String(valor).trim();

    return texto === "" ? null : texto;
}

function normalizarUUID(valor) {
    return normalizarTexto(valor);
}

function normalizarFecha(valor) {
    return normalizarTexto(valor);
}

function normalizarNumero(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return null;
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        throw new Error("Cantidad inválida.");
    }

    return numero;
}

function validarRespuesta(data, mensaje) {

    if (!data) {
        throw new Error(mensaje);
    }

    if (data.ok === false) {
        throw new Error(
            data.mensaje || mensaje
        );
    }

    return data;
}

function crearError(error, mensaje) {

    if (error?.message) {
        return new Error(error.message);
    }

    return new Error(mensaje);
}

/*
==========================================================
CATÁLOGOS
==========================================================
*/

export async function obtenerCatalogosInventario(
    token
) {
    validarToken(token);

    const [
        catalogosResultado,
        presentacionesResultado
    ] = await Promise.all([
        supabase.rpc(
            "obtener_catalogos_inventario",
            {
                p_token: token
            }
        ),
        supabase.rpc(
            "obtener_presentaciones_inventario",
            {
                p_token: token
            }
        )
    ]);

    if (catalogosResultado.error) {
        throw crearError(
            catalogosResultado.error,
            "No fue posible obtener los catálogos."
        );
    }

    if (presentacionesResultado.error) {
        throw crearError(
            presentacionesResultado.error,
            "No fue posible obtener las presentaciones."
        );
    }

    const catalogos = validarRespuesta(
        catalogosResultado.data,
        "No fue posible obtener los catálogos."
    );

    const presentaciones = validarRespuesta(
        presentacionesResultado.data,
        "No fue posible obtener las presentaciones."
    );

    return {
        ...catalogos,
        presentaciones:
            Array.isArray(
                presentaciones.presentaciones
            )
                ? presentaciones.presentaciones
                : []
    };
}

/*
==========================================================
REGISTRAR PRESENTACIÓN
==========================================================
*/

export async function registrarPresentacionProducto(
    token,
    datos
) {
    validarToken(token);

    const payload = {
        producto_id: normalizarUUID(datos.producto_id),
        nombre: normalizarTexto(datos.nombre),
        contenido: normalizarNumero(datos.contenido),
        unidad_medida: normalizarTexto(datos.unidad_medida)
    };

    const { data, error } = await supabase.rpc(
        "registrar_presentacion_producto",
        {
            p_token: token,
            p_payload: payload
        }
    );

    if (error) {
        throw crearError(
            error,
            "No fue posible registrar la presentación."
        );
    }

    return validarRespuesta(
        data,
        "No fue posible registrar la presentación."
    );
}

/*
==========================================================
REGISTRAR LOTE
==========================================================
*/

export async function registrarLote(
    token,
    datos
) {

    validarToken(token);

    const payload = {

        producto_id:
            normalizarUUID(
                datos.producto_id
            ),

        lote:
            normalizarTexto(
                datos.lote
            ),

        presentacion_id:
            normalizarUUID(
                datos.presentacion_id
            ),

        presentacion:
            normalizarTexto(
                datos.presentacion
            ),

        unidad_medida:
            normalizarTexto(
                datos.unidad_medida
            ),

        cantidad_inicial:
            normalizarNumero(
                datos.cantidad_inicial
            ),

        fecha_fabricacion:
            normalizarFecha(
                datos.fecha_fabricacion
            ),

        fecha_caducidad:
            normalizarFecha(
                datos.fecha_caducidad
            )

    };

    const {
        data,
        error
    } = await supabase.rpc(
        "registrar_lote_producto",
        {
            p_token: token,
            p_payload: payload
        }
    );

    if (error) {

        throw crearError(
            error,
            "No fue posible registrar el lote."
        );

    }

    return validarRespuesta(
        data,
        "No fue posible registrar el lote."
    );

}

/*
==========================================================
REGISTRAR MOVIMIENTO
==========================================================
*/

export async function registrarMovimientoInventario(
    token,
    datos
) {

    validarToken(token);

    const payload = {

        lote_id:
            normalizarUUID(
                datos.lote_id
            ),

        tipo_movimiento:
            normalizarTexto(
                datos.tipo_movimiento
            ),

        cve_jur_res:
            normalizarTexto(
                datos.cve_jur_res
            ),

        cantidad:
            normalizarNumero(
                datos.cantidad
            ),

        cantidad_capturada:
            normalizarNumero(
                datos.cantidad_capturada ??
                datos.cantidad
            ),

        tipo_captura:
            normalizarTexto(
                datos.tipo_captura ||
                "UNIDAD_BASE"
            ),

        referencia_id:
            normalizarUUID(
                datos.referencia_id
            ),

        fecha_movimiento:
            normalizarFecha(
                datos.fecha_movimiento
            ),

        origen_tipo:
            normalizarTexto(
                datos.origen_tipo
            ),

        origen_id:
            normalizarTexto(
                datos.origen_id
            ),

        destino_tipo:
            normalizarTexto(
                datos.destino_tipo
            ),

        destino_id:
            normalizarTexto(
                datos.destino_id
            ),

        observaciones:
            normalizarTexto(
                datos.observaciones
            )

    };

    const {
        data,
        error
    } = await supabase.rpc(
        "registrar_movimiento_inventario",
        {
            p_token: token,
            p_payload: payload
        }
    );

    if (error) {

        throw crearError(
            error,
            "No fue posible registrar el movimiento."
        );

    }

    return validarRespuesta(
        data,
        "No fue posible registrar el movimiento."
    );

}

/*
==========================================================
CONSULTAR INVENTARIO
==========================================================
*/

export async function consultarInventario(
    token,
    filtros = {}
) {

    validarToken(token);

    const {
        data,
        error
    } = await supabase.rpc(
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

            p_limite:
                Number(
                    filtros.limite || 50
                ),

            p_offset:
                Number(
                    filtros.offset || 0
                )

        }
    );

    if (error) {

        throw crearError(
            error,
            "No fue posible consultar el inventario."
        );

    }

    return validarRespuesta(
        data,
        "No fue posible consultar el inventario."
    );

}

/*
==========================================================
MOVIMIENTOS
==========================================================
*/

export async function consultarMovimientosInventario(
    token,
    filtros = {}
) {

    validarToken(token);

    const {
        data,
        error
    } = await supabase.rpc(
        "consultar_movimientos_inventario",
        {

            p_token: token,

            p_jurisdiccion:
                normalizarTexto(
                    filtros.jurisdiccion
                ),

            p_tipo_movimiento:
                normalizarTexto(
                    filtros.tipo_movimiento
                ),

            p_busqueda:
                normalizarTexto(
                    filtros.busqueda
                ),

            p_fecha_inicio:
                normalizarFecha(
                    filtros.fecha_inicio
                ),

            p_fecha_fin:
                normalizarFecha(
                    filtros.fecha_fin
                ),

            p_limite:
                Number(
                    filtros.limite || 50
                ),

            p_offset:
                Number(
                    filtros.offset || 0
                )

        }
    );

    if (error) {

        throw crearError(
            error,
            "No fue posible consultar los movimientos."
        );

    }

    return validarRespuesta(
        data,
        "No fue posible consultar los movimientos."
    );

}

/*
==========================================================
RESUMEN
==========================================================
*/

export async function obtenerResumenInventario(
    token,
    jurisdiccion = null
) {

    validarToken(token);

    const {
        data,
        error
    } = await supabase.rpc(
        "obtener_resumen_inventario",
        {
            p_token: token,
            p_jurisdiccion: jurisdiccion
        }
    );

    if (error) {

        throw crearError(
            error,
            "No fue posible obtener el resumen."
        );

    }

    return validarRespuesta(
        data,
        "No fue posible obtener el resumen."
    );

}