import { supabase } from "./supabase.js";

function validarToken(token) {
    if (!token || typeof token !== "string") {
        throw new Error("No existe una sesión activa.");
    }
}

function texto(valor) {
    if (valor === undefined || valor === null) return null;
    const resultado = String(valor).trim();
    return resultado || null;
}

function numero(valor) {
    if (valor === undefined || valor === null || valor === "") return null;
    const resultado = Number(valor);
    if (!Number.isFinite(resultado)) throw new Error("Cantidad inválida.");
    return resultado;
}

function unidad(valor) {
    const resultado = texto(valor)?.toUpperCase() || null;
    return resultado;
}

function validarRespuesta(data, mensaje) {
    if (!data) throw new Error(mensaje);
    if (data.ok === false) throw new Error(data.mensaje || mensaje);
    return data;
}

function crearError(error, mensaje) {
    return new Error(error?.message || mensaje);
}

async function rpc(nombre, parametros, mensaje) {
    const { data, error } = await supabase.rpc(nombre, parametros);
    if (error) throw crearError(error, mensaje);
    return validarRespuesta(data, mensaje);
}

export async function obtenerCatalogosInventario(token) {
    validarToken(token);

    const [catalogosResultado, presentacionesResultado] = await Promise.all([
        supabase.rpc("obtener_catalogos_inventario", { p_token: token }),
        supabase.rpc("obtener_presentaciones_inventario", { p_token: token })
    ]);

    if (catalogosResultado.error) {
        throw crearError(catalogosResultado.error, "No fue posible obtener los catálogos.");
    }

    if (presentacionesResultado.error) {
        throw crearError(presentacionesResultado.error, "No fue posible obtener las presentaciones.");
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
        presentaciones: Array.isArray(presentaciones.presentaciones)
            ? presentaciones.presentaciones
            : []
    };
}

export async function registrarProductoInventario(token, datos) {
    validarToken(token);

    return rpc(
        "registrar_producto_inventario",
        {
            p_token: token,
            p_payload: {
                nombre: texto(datos.nombre),
                categoria_id: texto(datos.categoria_id),
                categoria_codigo: texto(datos.categoria_codigo),
                categoria: texto(datos.categoria),
                observaciones: texto(datos.observaciones)
            }
        },
        "No fue posible registrar el insumo."
    );
}

export async function registrarPresentacionProducto(token, datos) {
    validarToken(token);

    return rpc(
        "registrar_presentacion_producto",
        {
            p_token: token,
            p_payload: {
                producto_id: texto(datos.producto_id),
                nombre: texto(datos.nombre),
                contenido: numero(datos.contenido),
                unidad_medida: unidad(datos.unidad_medida)
            }
        },
        "No fue posible registrar la presentación."
    );
}

export async function registrarRecepcionInventario(token, datos) {
    validarToken(token);

    const cantidad = numero(datos.cantidad_capturada ?? datos.cantidad);
    if (!cantidad || cantidad <= 0) {
        throw new Error("La cantidad recibida debe ser mayor que cero.");
    }

    const distribuciones = Array.isArray(datos.distribuciones)
        ? datos.distribuciones
            .map(item => ({
                cve_jur_res: texto(item.cve_jur_res),
                cantidad_capturada: numero(item.cantidad_capturada),
                tipo_captura: texto(item.tipo_captura || datos.tipo_captura)
            }))
            .filter(item => item.cve_jur_res && item.cantidad_capturada > 0)
        : [];

    return rpc(
        "registrar_recepcion_inventario",
        {
            p_token: token,
            p_payload: {
                modo_lote: texto(datos.modo_lote || "NUEVO"),
                lote_id: texto(datos.lote_id),
                producto_id: texto(datos.producto_id),
                presentacion_id: texto(datos.presentacion_id),
                lote: texto(datos.lote),
                cantidad_capturada: cantidad,
                tipo_captura: texto(datos.tipo_captura || "PRESENTACION"),
                fecha_fabricacion: texto(datos.fecha_fabricacion),
                fecha_caducidad: texto(datos.fecha_caducidad),
                observaciones: texto(datos.observaciones),
                distribuciones
            }
        },
        "No fue posible registrar la recepción."
    );
}

export async function registrarMovimientoInventario(token, datos) {
    validarToken(token);

    const cantidad = numero(datos.cantidad_capturada ?? datos.cantidad);
    if (!cantidad || cantidad <= 0) {
        throw new Error("La cantidad debe ser mayor que cero.");
    }

    const tipoCaptura = (texto(datos.tipo_captura) || "UNIDAD_BASE")
        .toUpperCase()
        .replace("PRESENTACIONES", "PRESENTACION");

    return rpc(
        "registrar_movimiento_inventario",
        {
            p_token: token,
            p_payload: {
                lote_id: texto(datos.lote_id),
                tipo_movimiento: texto(datos.tipo_movimiento),
                cve_jur_res: texto(datos.cve_jur_res),
                cantidad_capturada: cantidad,
                tipo_captura: tipoCaptura,
                referencia_id: texto(datos.referencia_id),
                referencia_tipo: texto(datos.referencia_tipo),
                fecha_movimiento: texto(datos.fecha_movimiento),
                origen_tipo: texto(datos.origen_tipo),
                origen_id: texto(datos.origen_id),
                destino_tipo: texto(datos.destino_tipo),
                destino_id: texto(datos.destino_id),
                motivo: texto(datos.motivo),
                observaciones: texto(datos.observaciones)
            }
        },
        "No fue posible registrar el movimiento."
    );
}

export async function consultarInventario(token, filtros = {}) {
    validarToken(token);

    return rpc(
        "consultar_inventario",
        {
            p_token: token,
            p_jurisdiccion: texto(filtros.jurisdiccion),
            p_busqueda: texto(filtros.busqueda),
            p_categoria: texto(filtros.categoria),
            p_solo_disponible: Boolean(filtros.solo_disponible),
            p_limite: Number(filtros.limite || 50),
            p_offset: Number(filtros.offset || 0)
        },
        "No fue posible consultar el inventario."
    );
}

export async function consultarMovimientosInventario(token, filtros = {}) {
    validarToken(token);

    return rpc(
        "consultar_movimientos_inventario",
        {
            p_token: token,
            p_jurisdiccion: texto(filtros.jurisdiccion),
            p_tipo_movimiento: texto(filtros.tipo_movimiento),
            p_busqueda: texto(filtros.busqueda),
            p_fecha_inicio: texto(filtros.fecha_inicio),
            p_fecha_fin: texto(filtros.fecha_fin),
            p_limite: Number(filtros.limite || 50),
            p_offset: Number(filtros.offset || 0)
        },
        "No fue posible consultar los movimientos."
    );
}

export async function obtenerResumenInventario(token, jurisdiccion = null) {
    validarToken(token);

    return rpc(
        "obtener_resumen_inventario",
        {
            p_token: token,
            p_jurisdiccion: jurisdiccion
        },
        "No fue posible obtener el resumen."
    );
}

/* Compatibilidad con código anterior. */
export async function registrarLote(token, datos) {
    return registrarRecepcionInventario(token, {
        ...datos,
        modo_lote: "NUEVO",
        cantidad_capturada: datos.cantidad_inicial,
        tipo_captura: datos.tipo_captura_inicial || "PRESENTACION",
        distribuciones: []
    });
}
