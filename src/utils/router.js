import { CONFIG } from "../../config.js";

import {
    mostrarLogin
} from "../pages/login.js";

import {
    mostrarInicio
} from "../pages/inicio.js";

import {
    mostrarRegistrarOperativo
} from "../pages/operativos.js";

import {
    mostrarConsultas
} from "../pages/consultas.js";

import {
    mostrarInventarios
} from "../pages/inventarios.js";

import {
    mostrarIndicadores
} from "../pages/indicadores.js";

import {
    mostrarAlertas
} from "../pages/alertas.js";

import {
    mostrarReportes
} from "../pages/reportes.js";

import {
    validarSesion,
    renovarSesion
} from "../services/auth.service.js";

import {
    obtenerCookie,
    guardarCookie,
    eliminarCookie
} from "./cookies.js";


/*
==========================================================
RUTAS
==========================================================
*/

const RUTAS_PUBLICAS = new Set([
    "/login"
]);


const RUTAS_PROTEGIDAS = new Set([
    "/inicio",
    "/operativos/nuevo",
    "/consultas",
    "/inventarios",
    "/inventarios/movimientos",
    "/indicadores",
    "/alertas",
    "/reportes",
    "/mapas"
]);


/*
==========================================================
ESTADO DEL ROUTER
==========================================================
*/

let navegando = false;

let rutaPendiente = null;

let intervaloRenovacion = null;

let sesionActual = null;

let ultimaValidacion = 0;


const DURACION_CACHE_SESION =
    60 * 1000;


/*
==========================================================
INICIAR ROUTER
==========================================================
*/

export function iniciarRouter() {
    window.addEventListener(
        "hashchange",
        resolverRuta
    );

    document.addEventListener(
        "click",
        interceptarNavegacion
    );

    resolverRuta();
}


/*
==========================================================
NAVEGACIÓN
==========================================================
*/

export function navegar(
    ruta,
    reemplazar = false
) {
    const rutaNormalizada =
        normalizarRuta(ruta);

    const hash =
        `#${rutaNormalizada}`;

    if (reemplazar) {
        history.replaceState(
            null,
            "",
            hash
        );

        resolverRuta();

        return;
    }

    if (
        window.location.hash === hash
    ) {
        resolverRuta();

        return;
    }

    window.location.hash =
        hash;
}


/*
==========================================================
RESOLUCIÓN DE RUTAS
==========================================================
*/

export async function resolverRuta() {
    const rutaSolicitada =
        obtenerRutaActual();

    if (navegando) {
        rutaPendiente =
            rutaSolicitada;

        return;
    }

    navegando = true;

    try {
        await procesarRuta(
            rutaSolicitada
        );
    } catch (error) {
        mostrarErrorRuta(
            error,
            rutaSolicitada
        );
    } finally {
        navegando = false;

        if (rutaPendiente) {
            const siguienteRuta =
                rutaPendiente;

            rutaPendiente = null;

            if (
                siguienteRuta !==
                obtenerRutaActual()
            ) {
                navegar(
                    siguienteRuta,
                    true
                );
            } else {
                resolverRuta();
            }
        }
    }
}


/*
==========================================================
PROCESAR RUTA
==========================================================
*/

async function procesarRuta(ruta) {
    /*
    ------------------------------------------------------
    RUTA NO REGISTRADA
    ------------------------------------------------------
    */

    if (
        !RUTAS_PUBLICAS.has(ruta) &&
        !RUTAS_PROTEGIDAS.has(ruta)
    ) {
        navegar(
            "/inicio",
            true
        );

        return;
    }


    /*
    ------------------------------------------------------
    RUTA PÚBLICA
    ------------------------------------------------------
    */

    if (
        RUTAS_PUBLICAS.has(ruta)
    ) {
        const sesion =
            await obtenerSesionValida(
                false
            );

        if (sesion?.valida) {
            navegar(
                "/inicio",
                true
            );

            return;
        }

        limpiarSesionLocal();

        await mostrarLogin();

        return;
    }


    /*
    ------------------------------------------------------
    RUTA PROTEGIDA
    ------------------------------------------------------
    */

    const sesion =
        await obtenerSesionValida();

    if (!sesion?.valida) {
        cerrarSesionLocal();

        return;
    }

    sesionActual =
        sesion;

    iniciarRenovacionAutomatica();

    await renderizarRutaProtegida(
        ruta
    );
}


/*
==========================================================
RUTAS PROTEGIDAS
==========================================================
*/

async function renderizarRutaProtegida(
    ruta
) {
    cerrarElementosTemporales();

    switch (ruta) {
        case "/inicio":
            await mostrarInicio();
            break;

        case "/operativos/nuevo":
            await mostrarRegistrarOperativo();
            break;

        case "/consultas":
            await mostrarConsultas();
            break;

        case "/inventarios":
            await mostrarInventarios();
            break;

        case "/inventarios/movimientos":
            await mostrarInventarios({
                pestañaInicial:
                    "movimientos"
            });
            break;

        case "/indicadores":
            await mostrarIndicadores();
            break;

        case "/alertas":
            await mostrarAlertas();
            break;

        case "/reportes":
            await mostrarReportes();
            break;

        case "/mapas":
            mostrarModuloPendiente(
                "Mapas",
                "La integración geográfica se desarrollará posteriormente."
            );
            break;

        default:
            navegar(
                "/inicio",
                true
            );
    }
}


/*
==========================================================
VALIDAR SESIÓN
==========================================================
*/

async function obtenerSesionValida(
    usarCache = true
) {
    const token =
        obtenerCookie(
            CONFIG.SESSION_COOKIE
        );

    if (!token) {
        sesionActual = null;

        return null;
    }

    const ahora =
        Date.now();

    if (
        usarCache &&
        sesionActual?.valida &&
        ahora - ultimaValidacion <
            DURACION_CACHE_SESION
    ) {
        return sesionActual;
    }

    const sesion =
        await validarSesion(token);

    if (!sesion?.valida) {
        sesionActual = null;
        ultimaValidacion = 0;

        return null;
    }

    sesionActual =
        sesion;

    ultimaValidacion =
        ahora;

    return sesion;
}


/*
==========================================================
RENOVACIÓN AUTOMÁTICA
==========================================================
*/

export function iniciarRenovacionAutomatica() {
    detenerRenovacionAutomatica();

    const minutos =
        Number(
            CONFIG.SESSION_RENEW_MINUTES
        );

    if (
        !Number.isFinite(minutos) ||
        minutos < 5
    ) {
        return;
    }

    intervaloRenovacion =
        window.setInterval(
            renovarSesionActual,
            minutos * 60 * 1000
        );
}


export function detenerRenovacionAutomatica() {
    if (!intervaloRenovacion) {
        return;
    }

    window.clearInterval(
        intervaloRenovacion
    );

    intervaloRenovacion = null;
}


async function renovarSesionActual() {
    const token =
        obtenerCookie(
            CONFIG.SESSION_COOKIE
        );

    if (!token) {
        cerrarSesionLocal();

        return;
    }

    try {
        const respuesta =
            await renovarSesion(token);

        if (
            !respuesta?.renovada &&
            !respuesta?.valida
        ) {
            cerrarSesionLocal();

            return;
        }

        const tokenRenovado =
            respuesta.token ||
            respuesta.nuevo_token ||
            token;

        guardarCookie(
            CONFIG.SESSION_COOKIE,
            tokenRenovado,
            CONFIG.SESSION_HOURS
        );

        sesionActual = {
            ...sesionActual,
            valida: true
        };

        ultimaValidacion =
            Date.now();
    } catch (error) {
        console.error(
            "No fue posible renovar la sesión:",
            error
        );
    }
}


/*
==========================================================
CERRAR SESIÓN LOCAL
==========================================================
*/

export function cerrarSesionLocal() {
    limpiarSesionLocal();

    if (
        obtenerRutaActual() ===
        "/login"
    ) {
        mostrarLogin();

        return;
    }

    navegar(
        "/login",
        true
    );
}


export function limpiarSesionLocal() {
    eliminarCookie(
        CONFIG.SESSION_COOKIE
    );

    detenerRenovacionAutomatica();

    sesionActual = null;

    ultimaValidacion = 0;
}


/*
==========================================================
NAVEGACIÓN INTERNA
==========================================================
*/

function interceptarNavegacion(
    evento
) {
    const elemento =
        evento.target.closest(
            "[data-route]"
        );

    if (!elemento) {
        return;
    }

    const ruta =
        elemento.dataset.route;

    if (!ruta) {
        return;
    }

    evento.preventDefault();

    navegar(ruta);
}


/*
==========================================================
LIMPIAR MODALES AL CAMBIAR DE RUTA
==========================================================
*/

function cerrarElementosTemporales() {
    document.body.classList.remove(
        "modal-open"
    );

    document
        .querySelectorAll(
            ".modal-root"
        )
        .forEach(elemento => {
            elemento.innerHTML = "";
        });
}


/*
==========================================================
MÓDULO PENDIENTE
==========================================================
*/

function mostrarModuloPendiente(
    titulo,
    descripcion
) {
    const app =
        obtenerApp();

    document.title =
        `${titulo} | ${CONFIG.APP_NAME}`;

    app.innerHTML = `
        <main class="pending-page">

            <section class="pending-card">

                <p class="pending-card__eyebrow">
                    Módulo futuro
                </p>

                <h1>
                    ${escaparHTML(titulo)}
                </h1>

                <p>
                    ${escaparHTML(descripcion)}
                </p>

                <button
                    id="btn-volver-inicio"
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
            "btn-volver-inicio"
        )
        ?.addEventListener(
            "click",
            () => navegar("/inicio")
        );
}


/*
==========================================================
ERRORES
==========================================================
*/

function mostrarErrorRuta(
    error,
    ruta
) {
    console.error(
        "Error del router:",
        error
    );

    const mensaje =
        error?.message ||
        "Ocurrió un error inesperado.";

    const mensajeNormalizado =
        mensaje.toLowerCase();

    if (
        mensajeNormalizado.includes(
            "sesión"
        ) &&
        (
            mensajeNormalizado.includes(
                "expir"
            ) ||
            mensajeNormalizado.includes(
                "no válida"
            ) ||
            mensajeNormalizado.includes(
                "no existe"
            )
        )
    ) {
        cerrarSesionLocal();

        return;
    }

    const app =
        obtenerApp();

    document.title =
        `Error | ${CONFIG.APP_NAME}`;

    app.innerHTML = `
        <main class="system-error">

            <section class="system-error__card">

                <h1>
                    No fue posible abrir el módulo
                </h1>

                <p>
                    ${escaparHTML(mensaje)}
                </p>

                <div class="system-error__actions">

                    <button
                        id="btn-error-reintentar"
                        class="button button--primary"
                        type="button"
                    >
                        Reintentar
                    </button>

                    <button
                        id="btn-error-inicio"
                        class="button button--secondary"
                        type="button"
                    >
                        Volver al inicio
                    </button>

                </div>

            </section>

        </main>
    `;

    document
        .getElementById(
            "btn-error-reintentar"
        )
        ?.addEventListener(
            "click",
            () => navegar(
                ruta,
                true
            )
        );

    document
        .getElementById(
            "btn-error-inicio"
        )
        ?.addEventListener(
            "click",
            () => navegar(
                "/inicio",
                true
            )
        );
}


/*
==========================================================
UTILIDADES
==========================================================
*/

function obtenerRutaActual() {
    const hash =
        window.location.hash
            .replace(
                /^#/,
                ""
            );

    return normalizarRuta(
        hash || "/inicio"
    );
}


function normalizarRuta(ruta) {
    const limpia =
        String(ruta || "")
            .trim()
            .replace(
                /^#/,
                ""
            );

    if (
        !limpia ||
        limpia === "/"
    ) {
        return "/inicio";
    }

    const rutaNormalizada =
        limpia.startsWith("/")
            ? limpia
            : `/${limpia}`;

    return rutaNormalizada.length > 1
        ? rutaNormalizada.replace(
            /\/+$/,
            ""
        )
        : rutaNormalizada;
}


function obtenerApp() {
    const app =
        document.getElementById(
            "app"
        );

    if (!app) {
        throw new Error(
            "No se encontró el contenedor principal."
        );
    }

    return app;
}


function escaparHTML(valor) {
    const elemento =
        document.createElement(
            "div"
        );

    elemento.textContent =
        String(valor ?? "");

    return elemento.innerHTML;
}