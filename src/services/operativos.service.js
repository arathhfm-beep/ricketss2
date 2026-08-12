import { supabase } from "./supabase.js";

/*
==========================================================
UTILIDADES
==========================================================
*/

function crearError(error, mensajePredeterminado) {
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


function normalizarEntero(
    valor,
    predeterminado = 0,
    minimo = 0,
    maximo = Number.MAX_SAFE_INTEGER
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


function normalizarDecimal(
    valor,
    predeterminado = 0
) {
    const numero =
        Number(valor);

    return Number.isFinite(numero)
        ? numero
        : predeterminado;
}


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


function validarUUID(
    valor,
    nombre = "identificador"
) {
    const uuid =
        normalizarTexto(valor);

    if (!uuid) {
        throw new Error(
            `El ${nombre} es obligatorio.`
        );
    }

    const patron =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!patron.test(uuid)) {
        throw new Error(
            `El ${nombre} no es válido.`
        );
    }

    return uuid;
}


/*
==========================================================
CATÁLOGOS
==========================================================
*/

export async function obtenerCatalogosOperativo(
    token
) {
    validarToken(token);

    const { data, error } =
        await supabase.rpc(
            "obtener_catalogos_operativo",
            {
                p_token: token
            }
        );

    if (error) {
        throw crearError(
            error,
            "No fue posible cargar los catálogos."
        );
    }

    return validarRespuesta(
        data,
        "No fue posible cargar los catálogos."
    );
}


/*
==========================================================
CASOS
==========================================================
*/

export async function buscarCasosOperativo(
    token,
    busqueda = "",
    limite = 30
) {
    validarToken(token);

    const { data, error } = await supabase.rpc(
        "buscar_casos_operativo",
        {
            p_token: token,
            p_busqueda:
                String(busqueda || "").trim() || null,
            p_limite: Math.min(
                Math.max(Number(limite) || 30, 1),
                100
            )
        }
    );

    console.log(
        "[buscarCasosOperativo] Respuesta RPC:",
        data
    );

    if (error) {
        console.error(
            "[buscarCasosOperativo] Error RPC:",
            error
        );

        throw crearError(
            error,
            "No fue posible consultar los casos."
        );
    }

    /*
    La llamada normal de Supabase devuelve directamente:

    {
        ok: true,
        casos: [...],
        total: 49,
        usuario: {...}
    }

    Esta normalización también tolera:
    [{ resultado: {...} }]
    o
    { resultado: {...} }
    */

    let respuesta = data;

    if (
        Array.isArray(respuesta) &&
        respuesta.length === 1 &&
        respuesta[0]?.resultado
    ) {
        respuesta = respuesta[0].resultado;
    }

    if (
        respuesta?.resultado &&
        typeof respuesta.resultado === "object"
    ) {
        respuesta = respuesta.resultado;
    }

    if (
        !respuesta ||
        typeof respuesta !== "object" ||
        Array.isArray(respuesta)
    ) {
        throw new Error(
            "La RPC devolvió una respuesta con formato inválido."
        );
    }

    if (respuesta.ok === false) {
        throw new Error(
            respuesta.mensaje ||
            "La consulta de casos fue rechazada."
        );
    }

    const casos = Array.isArray(respuesta.casos)
        ? respuesta.casos
        : [];

    console.log(
        "[buscarCasosOperativo] Casos normalizados:",
        casos.length
    );

    return {
        ok: true,
        total:
            Number(respuesta.total) ||
            casos.length,
        mensaje:
            respuesta.mensaje || null,
        usuario:
            respuesta.usuario || null,
        casos
    };
}


/*
==========================================================
INVENTARIO
==========================================================
*/

export async function obtenerInventarioOperativo(
    token,
    jurisdiccion = null
) {
    validarToken(token);

    const { data, error } =
        await supabase.rpc(
            "obtener_inventario_operativo",
            {
                p_token:
                    token,

                p_jurisdiccion:
                    normalizarTexto(
                        jurisdiccion
                    )
            }
        );

    if (error) {
        throw crearError(
            error,
            "No fue posible consultar el inventario."
        );
    }

    const respuesta =
        validarRespuesta(
            data,
            "No fue posible consultar el inventario."
        );

    return {
        jurisdiccion:
            respuesta.jurisdiccion ??
            null,

        inventario:
            obtenerArreglo(
                respuesta.inventario
            )
    };
}


/*
==========================================================
CREAR EXPEDIENTE OPERATIVO
==========================================================
*/

export async function registrarOperativo(
    token,
    operativo
) {
    validarToken(token);

    const payload =
        construirPayloadOperativo(
            operativo
        );

    const { data, error } =
        await supabase.rpc(
            "registrar_operativo_base",
            {
                p_token:
                    token,

                p_payload:
                    payload
            }
        );

    if (error) {
        throw crearError(
            error,
            "No fue posible crear el expediente operativo."
        );
    }

    return validarRespuesta(
        data,
        "No fue posible crear el expediente operativo."
    );
}


function construirPayloadOperativo(
    operativo
) {
    const datos =
        obtenerObjeto(
            operativo
        );

    if (!datos.programa_id) {
        throw new Error(
            "Seleccione el programa."
        );
    }

    if (!datos.tipo_operativo_id) {
        throw new Error(
            "Seleccione el tipo de operativo."
        );
    }

    if (!datos.cve_jur_res) {
        throw new Error(
            "Seleccione la jurisdicción."
        );
    }

    if (!datos.fecha_inicio) {
        throw new Error(
            "Ingrese la fecha de inicio."
        );
    }

    return {
        programa_id:
            validarUUID(
                datos.programa_id,
                "programa"
            ),

        tipo_operativo_id:
            validarUUID(
                datos.tipo_operativo_id,
                "tipo de operativo"
            ),

        folio_caso:
            normalizarTexto(
                datos.folio_caso
            ),

        cve_jur_res:
            normalizarTexto(
                datos.cve_jur_res
            ),

        cve_mpo_res:
            normalizarTexto(
                datos.cve_mpo_res
            ),

        localidad:
            normalizarTexto(
                datos.localidad
            ),

        domicilio:
            normalizarTexto(
                datos.domicilio
            ),

        fecha_inicio:
            normalizarTexto(
                datos.fecha_inicio
            ),

        nombre_referencia:
            normalizarTexto(
                datos.nombre_referencia
            ),

        motivo:
            normalizarTexto(
                datos.motivo
            ),

        observaciones:
            normalizarTexto(
                datos.observaciones
            ),

        estatus:
            normalizarTexto(
                datos.estatus
            ) || "ACTIVO"
    };
}


/*
==========================================================
BUSCAR OPERATIVOS PARA RETOMAR
==========================================================
*/

export async function buscarOperativosRetomar(
    token,
    filtros = {}
) {
    validarToken(token);

    const { data, error } =
        await supabase.rpc(
            "buscar_operativos_retomar",
            {
                p_token:
                    token,

                p_busqueda:
                    normalizarTexto(
                        filtros.busqueda
                    ),

                p_jurisdiccion:
                    normalizarTexto(
                        filtros.jurisdiccion
                    ),

                p_limite:
                    normalizarEntero(
                        filtros.limite,
                        20,
                        1,
                        100
                    )
            }
        );

    if (error) {
        throw crearError(
            error,
            "No fue posible buscar los operativos."
        );
    }

    const respuesta =
        validarRespuesta(
            data,
            "No fue posible buscar los operativos."
        );

    return {
        usuario:
            obtenerObjeto(
                respuesta.usuario
            ),

        resultados:
            obtenerArreglo(
                respuesta.resultados
            )
    };
}


/*
==========================================================
OBTENER OPERATIVO E HISTORIAL
==========================================================
*/

export async function obtenerOperativoJornadas(
    token,
    operativoId
) {
    validarToken(token);

    const { data, error } =
        await supabase.rpc(
            "obtener_operativo_jornadas",
            {
                p_token:
                    token,

                p_operativo_id:
                    validarUUID(
                        operativoId,
                        "identificador del operativo"
                    )
            }
        );

    if (error) {
        throw crearError(
            error,
            "No fue posible consultar el historial del operativo."
        );
    }

    const respuesta =
        validarRespuesta(
            data,
            "No fue posible consultar el historial del operativo."
        );

    return {
        operativo:
            obtenerObjeto(
                respuesta.operativo
            ),

        tipos_jornada:
            obtenerArreglo(
                respuesta.tipos_jornada
            ),

        jornadas:
            obtenerArreglo(
                respuesta.jornadas
            )
    };
}


/*
==========================================================
GUARDAR JORNADA
==========================================================
*/

export async function guardarJornadaOperativo(
    token,
    datos
) {
    validarToken(token);

    const payload =
        construirPayloadJornada(
            datos
        );

    const { data, error } =
        await supabase.rpc(
            "guardar_jornada_operativo",
            {
                p_token:
                    token,

                p_datos:
                    payload
            }
        );

    if (error) {
        throw crearError(
            error,
            "No fue posible guardar la jornada."
        );
    }

    return validarRespuesta(
        data,
        "No fue posible guardar la jornada."
    );
}


export function construirPayloadJornada(
    datos = {}
) {
    const operativoId =
        validarUUID(
            datos.operativo_id,
            "identificador del operativo"
        );

    const tipoJornada =
        String(
            normalizarTexto(
                datos.tipo_jornada
            ) || ""
        ).toUpperCase();

    const tiposPermitidos =
        new Set([
            "INICIAL",
            "CONTINUACION",
            "VERIFICACION",
            "REINTERVENCION"
        ]);

    if (
        !tiposPermitidos.has(
            tipoJornada
        )
    ) {
        throw new Error(
            "Seleccione un tipo de jornada válido."
        );
    }

    const fecha =
        normalizarTexto(
            datos.fecha
        );

    if (!fecha) {
        throw new Error(
            "La fecha de la jornada es obligatoria."
        );
    }

    const sectores =
        obtenerArreglo(
            datos.sectores
        )
            .map(
                construirSectorJornada
            )
            .filter(
                sector =>
                    sector.manzanas.length > 0
            );

    if (sectores.length === 0) {
        throw new Error(
            "Agregue al menos una manzana trabajada."
        );
    }

    validarManzanasDuplicadas(
        sectores
    );

    return {
        operativo_id:
            operativoId,

        tipo_jornada:
            tipoJornada,

        fecha,

        hora_inicio:
            normalizarTexto(
                datos.hora_inicio
            ),

        hora_fin:
            normalizarTexto(
                datos.hora_fin
            ),

        motivo:
            normalizarTexto(
                datos.motivo
            ),

        observaciones:
            normalizarTexto(
                datos.observaciones
            ),

        sectores
    };
}


function construirSectorJornada(
    sector,
    indice
) {
    const datos =
        obtenerObjeto(
            sector
        );

    const codigo =
        normalizarTexto(
            datos.sector
        );

    if (!codigo) {
        throw new Error(
            `El sector ${indice + 1} no tiene clave.`
        );
    }

    const manzanas =
        obtenerArreglo(
            datos.manzanas
        ).map(
            (
                manzana,
                indiceManzana
            ) =>
                construirManzanaJornada(
                    manzana,
                    codigo,
                    indiceManzana
                )
        );

    return {
        sector:
            codigo,

        manzanas
    };
}


function construirManzanaJornada(
    manzana,
    sector,
    indice
) {
    const datos =
        obtenerObjeto(
            manzana
        );

    const codigo =
        normalizarTexto(
            datos.manzana
        );

    if (!codigo) {
        throw new Error(
            `La manzana ${indice + 1} del sector ${sector} no tiene clave.`
        );
    }

    return {
        manzana:
            codigo,

        resumen:
            construirResumenManzana(
                datos.resumen,
                sector,
                codigo
            ),

        actividades:
            obtenerArreglo(
                datos.actividades
            ).map(
                construirActividadManzana
            )
    };
}


function construirResumenManzana(
    resumen,
    sector,
    manzana
) {
    const datos =
        obtenerObjeto(
            resumen
        );

    const resultado = {
        viviendas_visitadas:
            normalizarEntero(
                datos.viviendas_visitadas
            ),

        viviendas_trabajadas:
            normalizarEntero(
                datos.viviendas_trabajadas
            ),

        viviendas_cerradas:
            normalizarEntero(
                datos.viviendas_cerradas
            ),

        viviendas_deshabitadas:
            normalizarEntero(
                datos.viviendas_deshabitadas
            ),

        viviendas_renuentes:
            normalizarEntero(
                datos.viviendas_renuentes
            ),

        otros_inmuebles:
            normalizarEntero(
                datos.otros_inmuebles
            ),

        habitantes_beneficiados:
            normalizarEntero(
                datos.habitantes_beneficiados
            ),

        viviendas_con_perros:
            normalizarEntero(
                datos.viviendas_con_perros
            ),

        viviendas_con_gatos:
            normalizarEntero(
                datos.viviendas_con_gatos
            ),

        viviendas_con_perros_gatos:
            normalizarEntero(
                datos.viviendas_con_perros_gatos
            ),

        viviendas_sin_animales:
            normalizarEntero(
                datos.viviendas_sin_animales
            ),

        perros_censados:
            normalizarEntero(
                datos.perros_censados
            ),

        gatos_censados:
            normalizarEntero(
                datos.gatos_censados
            ),

        observaciones:
            normalizarTexto(
                datos.observaciones
            )
    };

    const viviendasConResultado =
        resultado.viviendas_trabajadas +
        resultado.viviendas_cerradas +
        resultado.viviendas_deshabitadas +
        resultado.viviendas_renuentes;

    // Regla operativa: visitadas es la suma exacta de los cuatro resultados.
    resultado.viviendas_visitadas = viviendasConResultado;

    const distribucionAnimales =
        resultado.viviendas_con_perros +
        resultado.viviendas_con_gatos +
        resultado.viviendas_con_perros_gatos +
        resultado.viviendas_sin_animales;

    if (
        resultado.viviendas_trabajadas > 0 &&
        distribucionAnimales >
            resultado.viviendas_trabajadas
    ) {
        throw new Error(
            `En el sector ${sector}, manzana ${manzana}, la distribución por animales supera las viviendas trabajadas.`
        );
    }

    return resultado;
}


function construirActividadManzana(
    actividad,
    indice
) {
    const datos =
        obtenerObjeto(
            actividad
        );

    return {
        tipo_actividad_id:
            validarUUID(
                datos.tipo_actividad_id,
                `tipo de actividad ${indice + 1}`
            ),

        fecha:
            normalizarTexto(
                datos.fecha
            ),

        brigadista1:
            normalizarTexto(
                datos.brigadista1
            ),

        brigadista2:
            normalizarTexto(
                datos.brigadista2
            ),

        supervisor:
            normalizarTexto(
                datos.supervisor
            ),

        viviendas_cubiertas:
            normalizarEntero(
                datos.viviendas_cubiertas
            ),

        viviendas_encuestadas:
            normalizarEntero(
                datos.viviendas_encuestadas
            ),

        viviendas_rociadas:
            normalizarEntero(
                datos.viviendas_rociadas
            ),

        viviendas_ectodesparasitadas:
            normalizarEntero(
                datos.viviendas_ectodesparasitadas
            ),

        perros_intervenidos:
            normalizarEntero(
                datos.perros_intervenidos
            ),

        gatos_intervenidos:
            normalizarEntero(
                datos.gatos_intervenidos
            ),

        viviendas_inspeccionadas:
            normalizarEntero(
                datos.viviendas_inspeccionadas
            ),

        viviendas_con_garrapata:
            normalizarEntero(
                datos.viviendas_con_garrapata
            ),

        perros_inspeccionados:
            normalizarEntero(
                datos.perros_inspeccionados
            ),

        perros_con_garrapata:
            normalizarEntero(
                datos.perros_con_garrapata
            ),

        gatos_inspeccionados:
            normalizarEntero(
                datos.gatos_inspeccionados
            ),

        gatos_con_garrapata:
            normalizarEntero(
                datos.gatos_con_garrapata
            ),

        garrapatas_en_viviendas:
            normalizarEntero(
                datos.garrapatas_en_viviendas
            ),

        garrapatas_en_perros:
            normalizarEntero(
                datos.garrapatas_en_perros
            ),

        garrapatas_en_gatos:
            normalizarEntero(
                datos.garrapatas_en_gatos
            ),

        larvas_encontradas:
            normalizarEntero(
                datos.larvas_encontradas
            ),

        ninfas_encontradas:
            normalizarEntero(
                datos.ninfas_encontradas
            ),

        adultos_encontrados:
            normalizarEntero(
                datos.adultos_encontrados
            ),

        observaciones:
            normalizarTexto(
                datos.observaciones
            ),

        insumos:
            obtenerArreglo(
                datos.insumos
            ).map(
                construirInsumoActividad
            )
    };
}


function construirInsumoActividad(
    insumo,
    indice
) {
    const datos =
        obtenerObjeto(insumo);

    const tipoCaptura =
        String(
            normalizarTexto(
                datos.tipo_captura
            ) || "UNIDAD_BASE"
        )
            .trim()
            .toUpperCase();

    if (
        ![
            "PRESENTACION",
            "UNIDAD_BASE"
        ].includes(tipoCaptura)
    ) {
        throw new Error(
            `El tipo de captura del insumo ${
                indice + 1
            } no es válido.`
        );
    }

    const cantidadCapturada =
        normalizarDecimal(
            datos.cantidad_capturada
        );

    const contenidoPresentacion =
        normalizarDecimal(
            datos.contenido_presentacion
        );

    if (cantidadCapturada <= 0) {
        throw new Error(
            `La cantidad capturada del insumo ${
                indice + 1
            } debe ser mayor que cero.`
        );
    }

    if (
        tipoCaptura === "PRESENTACION" &&
        contenidoPresentacion <= 0
    ) {
        throw new Error(
            `La presentación del insumo ${
                indice + 1
            } no tiene una conversión válida.`
        );
    }

    const cantidadBase =
        tipoCaptura === "PRESENTACION"
            ? cantidadCapturada *
              contenidoPresentacion
            : cantidadCapturada;

    return {
        lote_id:
            validarUUID(
                datos.lote_id,
                `lote del insumo ${
                    indice + 1
                }`
            ),

        /*
         * Cantidad que realmente se descuenta
         * del inventario.
         */
        cantidad:
            cantidadBase,

        /*
         * Lo que capturó el usuario.
         */
        cantidad_capturada:
            cantidadCapturada,

        tipo_captura:
            tipoCaptura,

        contenido_presentacion:
            tipoCaptura === "PRESENTACION"
                ? contenidoPresentacion
                : null,

        unidad:
            normalizarTexto(
                datos.unidad
            ),

        presentacion:
            normalizarTexto(
                datos.presentacion
            ),

        rangos_folios:
            obtenerArreglo(
                datos.rangos_folios
            ).map(
                (
                    rango,
                    indiceRango
                ) => {
                    const datosRango =
                        obtenerObjeto(
                            rango
                        );

                    const folioDesde =
                        normalizarEntero(
                            datosRango.folio_desde
                        );

                    const folioHasta =
                        normalizarEntero(
                            datosRango.folio_hasta
                        );

                    if (
                        folioDesde <= 0 ||
                        folioHasta <= 0 ||
                        folioHasta < folioDesde
                    ) {
                        throw new Error(
                            `El rango de folios ${
                                indiceRango + 1
                            } del insumo ${
                                indice + 1
                            } no es válido.`
                        );
                    }

                    return {
                        id:
                            normalizarTexto(
                                datosRango.id
                            ),

                        folio_desde:
                            folioDesde,

                        folio_hasta:
                            folioHasta
                    };
                }
            )
    };
}

function validarManzanasDuplicadas(
    sectores
) {
    const claves =
        new Set();

    for (const sector of sectores) {
        for (const manzana of sector.manzanas) {
            const clave =
                `${sector.sector.trim().toUpperCase()}::${manzana.manzana.trim().toUpperCase()}`;

            if (claves.has(clave)) {
                throw new Error(
                    `La manzana ${manzana.manzana} del sector ${sector.sector} está repetida.`
                );
            }

            claves.add(clave);
        }
    }
}


/*
==========================================================
SELECTORES
==========================================================
*/



/*
==========================================================
EDITAR JORNADA EXISTENTE
==========================================================
*/
export async function editarJornadaOperativo(token, jornadaId, datos = {}) {
    validarToken(token);
    const id = validarUUID(jornadaId, "identificador de la jornada");
    const motivoEdicion = normalizarTexto(datos.motivo_edicion);
    if (!motivoEdicion) {
        throw new Error("Indique el motivo de la edición.");
    }

    const payload = {
        fecha: normalizarTexto(datos.fecha),
        hora_inicio: normalizarTexto(datos.hora_inicio),
        hora_fin: normalizarTexto(datos.hora_fin),
        motivo: normalizarTexto(datos.motivo),
        observaciones: normalizarTexto(datos.observaciones),
        motivo_edicion: motivoEdicion,
        manzanas: obtenerArreglo(datos.manzanas).map(m => ({
            id: normalizarTexto(m.id),
            sector: normalizarTexto(m.sector),
            manzana: normalizarTexto(m.manzana),
            fecha_inicio: normalizarTexto(m.fecha_inicio),
            fecha_fin: normalizarTexto(m.fecha_fin),
            estatus: normalizarTexto(m.estatus) || "TRABAJADA",
            observaciones: normalizarTexto(m.observaciones ?? m.resumen?.observaciones),
            resumen: construirResumenManzana(m.resumen, m.sector || "", m.manzana || ""),
            actividades: obtenerArreglo(m.actividades).map((a, i) => {
                const base = construirActividadManzana(a, i);
                return {
                    ...base,
                    id: normalizarTexto(a.id),
                    insumos: obtenerArreglo(a.insumos).map((insumo, j) => {
                        if (insumo.id && !insumo.accion) {
                            return { id: insumo.id, accion: "SIN_CAMBIO" };
                        }
                        const accion = String(insumo.accion || "AGREGAR").toUpperCase();
                        if (accion === "SIN_CAMBIO") return { id: insumo.id, accion };
                        const construido = construirInsumoActividad(insumo, j);
                        return { ...construido, id: normalizarTexto(insumo.id), accion };
                    })
                };
            })
        }))
    };

    const { data, error } = await supabase.rpc("editar_jornada_operativo", {
        p_token: token,
        p_jornada_id: id,
        p_datos: payload
    });
    if (error) throw crearError(error, "No fue posible editar la jornada.");
    return validarRespuesta(data, "No fue posible editar la jornada.");
}

export function obtenerResultadosOperativosRetomar(
    respuesta
) {
    return obtenerArreglo(
        respuesta?.resultados
    );
}


export function obtenerDatosOperativoJornadas(
    respuesta
) {
    return obtenerObjeto(
        respuesta?.operativo
    );
}


export function obtenerTiposJornada(
    respuesta
) {
    return obtenerArreglo(
        respuesta?.tipos_jornada
    );
}


export function obtenerHistorialJornadas(
    respuesta
) {
    return obtenerArreglo(
        respuesta?.jornadas
    );
}


export function puedeConsultarOperativosEstatales(
    respuesta
) {
    return Boolean(
        respuesta?.usuario
            ?.puede_consultar_estado
    );
}


export function obtenerJurisdiccionOperativosUsuario(
    respuesta
) {
    return respuesta?.usuario
        ?.jurisdiccion ??
        null;
}


/*
==========================================================
TOTALES
==========================================================
*/

export function calcularTotalesJornadas(
    jornadas
) {
    const totales = {
        jornadas: 0,
        verificaciones: 0,
        reintervenciones: 0,
        manzanas: 0,
        viviendas_visitadas: 0,
        viviendas_trabajadas: 0,
        habitantes_beneficiados: 0,
        perros_censados: 0,
        gatos_censados: 0,
        actividades: 0
    };

    for (
        const jornada
        of obtenerArreglo(jornadas)
    ) {
        if (jornada?.cancelada) {
            continue;
        }

        totales.jornadas += 1;

        const tipo =
            String(
                jornada.tipo_jornada || ""
            ).toUpperCase();

        if (tipo === "VERIFICACION") {
            totales.verificaciones += 1;
        }

        if (tipo === "REINTERVENCION") {
            totales.reintervenciones += 1;
        }

        if (
            jornada.suma_indicadores ===
            false
        ) {
            continue;
        }

        const resumen =
            obtenerObjeto(
                jornada.totales
            );

        totales.manzanas +=
            Number(
                resumen.manzanas
            ) || 0;

        totales.viviendas_visitadas +=
            Number(
                resumen.viviendas_visitadas
            ) || 0;

        totales.viviendas_trabajadas +=
            Number(
                resumen.viviendas_trabajadas
            ) || 0;

        totales.habitantes_beneficiados +=
            Number(
                resumen.habitantes_beneficiados
            ) || 0;

        totales.perros_censados +=
            Number(
                resumen.perros_censados
            ) || 0;

        totales.gatos_censados +=
            Number(
                resumen.gatos_censados
            ) || 0;

        totales.actividades +=
            Number(
                resumen.actividades
            ) || 0;
    }

    return totales;
}


/*
==========================================================
CLASES VISUALES
==========================================================
*/

export function obtenerClaseTipoJornada(
    tipoJornada
) {
    const tipo =
        String(
            tipoJornada || ""
        ).toUpperCase();

    switch (tipo) {
        case "INICIAL":
            return "journey-type--initial";

        case "CONTINUACION":
            return "journey-type--continuation";

        case "VERIFICACION":
            return "journey-type--verification";

        case "REINTERVENCION":
            return "journey-type--reintervention";

        default:
            return "journey-type--neutral";
    }
}