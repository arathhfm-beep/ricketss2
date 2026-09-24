/*
==========================================================
PERMISOS PROVISIONALES DE INTERFAZ
==========================================================

IMPORTANTE:
Este archivo controla la interfaz y la experiencia del usuario.

NO sustituye la autorización del backend.
Posteriormente los mismos permisos deberán aplicarse
en RPC / PostgreSQL.
*/


const ROLES = Object.freeze({
    SUPERVISOR: "SUPERVISOR",
    JURISDICCIONAL: "JURISDICCIONAL",
    ADMINISTRATIVO: "ADMINISTRATIVO",
    EPIDEMIOLOGO: "EPIDEMIOLOGO"
});


const MATRIZ_PERMISOS = Object.freeze({

    SUPERVISOR: {
        consultar: true,
        consultar_estado: true,

        registrar_operativos: true,
        editar_operativos: true,

        administrar_inventario: true,
        registrar_movimientos_inventario: true,

        atender_alertas: true,

        consultar_indicadores: true,
        consultar_reportes: true
    },


    JURISDICCIONAL: {
        consultar: true,
        consultar_estado: false,

        registrar_operativos: true,
        editar_operativos: true,

        administrar_inventario: false,
        registrar_movimientos_inventario: true,

        atender_alertas: true,

        consultar_indicadores: true,
        consultar_reportes: true
    },


    ADMINISTRATIVO: {
        consultar: true,
        consultar_estado: false,

        registrar_operativos: false,
        editar_operativos: false,

        administrar_inventario: false,
        registrar_movimientos_inventario: false,

        atender_alertas: false,

        consultar_indicadores: true,
        consultar_reportes: true
    },


    EPIDEMIOLOGO: {
        consultar: true,
        consultar_estado: false,

        registrar_operativos: false,
        editar_operativos: false,

        administrar_inventario: false,
        registrar_movimientos_inventario: false,

        atender_alertas: false,

        consultar_indicadores: true,
        consultar_reportes: true
    }

});


export function normalizarRol(usuario = {}) {

    const rolCrudo =
        usuario.codigo_rol ||
        usuario.rol_codigo ||
        usuario.rol?.codigo ||
        usuario.rol?.nombre ||
        usuario.rol ||
        usuario.nombre_rol ||
        "";

    const rol = String(rolCrudo)
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_");


    /*
    Compatibilidad temporal con nombres anteriores.
    */


    if (rol.includes("SUPERVISOR")) {
        return ROLES.SUPERVISOR;
    }


    if (
        rol.includes("JURISDICCIONAL") ||
        rol.includes("JURISDICCION")
    ) {
        return ROLES.JURISDICCIONAL;
    }


    if (
    rol === "ADMIN" ||
    rol === "ADMINISTRADOR" ||
    rol.includes("ADMINISTRATIVO")
) {
    return ROLES.ADMINISTRATIVO;
}


    if (
        rol.includes("EPIDEMIOLOGO") ||
        rol.includes("EPIDEMIOLOGIA")
    ) {
        return ROLES.EPIDEMIOLOGO;
    }


    return rol;
}


export function obtenerPermisos(usuario = {}) {

    const rol =
        normalizarRol(usuario);

    return (
        MATRIZ_PERMISOS[rol] || {
            consultar: false,
            consultar_estado: false,

            registrar_operativos: false,
            editar_operativos: false,

            administrar_inventario: false,
            registrar_movimientos_inventario: false,

            atender_alertas: false,

            consultar_indicadores: false,
            consultar_reportes: false
        }
    );
}


export function tienePermiso(
    usuario,
    permiso
) {

    const permisos =
        obtenerPermisos(usuario);

    return permisos[permiso] === true;
}


export function puedeConsultarEstado(
    usuario
) {
    return tienePermiso(
        usuario,
        "consultar_estado"
    );
}


export function puedeRegistrarOperativos(
    usuario
) {
    return tienePermiso(
        usuario,
        "registrar_operativos"
    );
}


export function puedeEditarOperativos(
    usuario
) {
    return tienePermiso(
        usuario,
        "editar_operativos"
    );
}


export function puedeAdministrarInventario(
    usuario
) {
    return tienePermiso(
        usuario,
        "administrar_inventario"
    );
}


export function puedeRegistrarMovimientoInventario(
    usuario
) {
    return tienePermiso(
        usuario,
        "registrar_movimientos_inventario"
    );
}


export function puedeAtenderAlertas(
    usuario
) {
    return tienePermiso(
        usuario,
        "atender_alertas"
    );
}


export function esSoloLectura(
    usuario
) {

    const rol =
        normalizarRol(usuario);

    return (
        rol === ROLES.ADMINISTRATIVO ||
        rol === ROLES.EPIDEMIOLOGO
    );
}


export function obtenerJurisdiccionUsuario(
    usuario = {}
) {

    return (
        usuario.cve_jur_res ||
        usuario.jurisdiccion ||
        usuario.jurisdiccion_usuario ||
        null
    );
}


export {
    ROLES,
    MATRIZ_PERMISOS
};