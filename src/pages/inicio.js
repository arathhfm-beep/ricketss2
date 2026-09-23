import { CONFIG } from "../../config.js";

import { obtenerInicio } from "../services/inicio.service.js";

import { cerrarSesion } from "../services/auth.service.js";

import {
    obtenerCookie,
    eliminarCookie
} from "../utils/cookies.js";

import { navegar } from "../utils/router.js";

import {
    puedeRegistrarOperativos
} from "../utils/permisos.js";

const ICONOS = Object.freeze({
    clipboard: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5h6v2H9V5Zm-2 0H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2V3h-2.2A3 3 0 0 0 12 1a3 3 0 0 0-2.8 2H7v2Zm5-2a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/>
        </svg>
    `,

    search: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m21 19.6-5.2-5.2a7 7 0 1 0-1.4 1.4l5.2 5.2L21 19.6ZM5 10a5 5 0 1 1 10 0 5 5 0 0 1-10 0Z"/>
        </svg>
    `,

    inventory: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 4h18v5H3V4Zm2 7h14v9H5v-9Zm5 2v2h4v-2h-4Z"/>
        </svg>
    `,

    chart: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 20V10h4v10H4Zm6 0V4h4v16h-4Zm6 0v-7h4v7h-4Z"/>
        </svg>
    `,

    alert: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2 1 21h22L12 2Zm1 15h-2v-2h2v2Zm0-4h-2V8h2v5Z"/>
        </svg>
    `,

    report: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 2h9l5 5v15H6V2Zm8 2v5h5l-5-5ZM9 13h8v2H9v-2Zm0 4h8v2H9v-2Zm0-8h3v2H9V9Z"/>
        </svg>
    `,

    transfer: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m7 7 4-4 1.4 1.4L10.8 6H21v2H10.8l1.6 1.6L11 11 7 7Zm10 10-4 4-1.4-1.4 1.6-1.6H3v-2h10.2l-1.6-1.6L13 13l4 4Z"/>
        </svg>
    `
});


export async function mostrarInicio() {
    const app = document.getElementById("app");

    document.title = `Inicio | ${CONFIG.APP_NAME}`;

    app.innerHTML = crearCargandoInicio();

    const token = obtenerCookie(CONFIG.SESSION_COOKIE);

    try {
        const datos = await obtenerInicio(token);

        renderizarInicio(datos);
    } catch (error) {
        renderizarErrorInicio(error);
    }
}


function renderizarInicio(datos) {
    const app = document.getElementById("app");

    const usuario = datos.usuario || {};
    const resumen = datos.resumen || {};

    const accionesOriginales =
        Array.isArray(datos.acciones)
            ? datos.acciones.filter(
                accion => accion.visible
            )
            : [];

    const acciones =
        filtrarAccionesPorPermisos(
            accionesOriginales,
            usuario
        );

    app.innerHTML = `
        <div class="app-shell">

            ${crearBarraSuperior(usuario)}

            <div
                id="mobile-overlay"
                class="mobile-overlay"
                hidden
            ></div>

            <aside
                id="app-sidebar"
                class="app-sidebar"
                aria-label="Navegación principal"
            >
                ${crearSidebar(usuario)}
            </aside>

            <main class="app-main">

                <section class="home-heading">
                    <div>
                        <p class="home-heading__eyebrow">
                            CENTRO DE INFORMACIÓN
                        </p>

                        <h1>
                            Sistema Estatal para el Control de la Rickettsiosis – Entomología y Vectores
                        </h1>

                        <p class="home-heading__description">
                            Consulta información o registra actividad
                            operativa desde un solo lugar.
                        </p>
                    </div>
                </section>

                <section
                    class="summary-grid"
                    aria-label="Resumen operativo"
                >
                    ${crearResumen(resumen)}
                </section>

                <section class="home-section">
                    <div class="home-section__header">
                        <div>
                            <p class="home-section__eyebrow">
                                Acciones
                            </p>

                            <h2>Accesos rápidos</h2>
                        </div>
                    </div>

                    <div class="home-actions">
                        ${acciones.map(crearAccion).join("")}
                    </div>
                </section>

            </main>
        </div>
    `;

    registrarEventosInicio();
}

function filtrarAccionesPorPermisos(
    acciones,
    usuario
) {
    return acciones.filter(accion => {

        const ruta = String(
            accion?.ruta || ""
        )
            .trim()
            .toLowerCase();

        /*
        El usuario sin permiso de captura
        no debe recibir accesos rápidos
        para registrar operativos.
        */
        if (
            ruta.startsWith("/operativos") &&
            !puedeRegistrarOperativos(usuario)
        ) {
            return false;
        }

        return true;
    });
}

function crearBarraSuperior(usuario) {
    const nombre = escaparHTML(
        usuario.nombre || "Usuario"
    );

    const jurisdiccion = escaparHTML(
        usuario.nombre_jurisdiccion ||
        usuario.jurisdiccion ||
        "Estatal"
    );

    return `
        <header class="topbar">
            <div class="topbar__left">
                <button
                    id="btn-sidebar"
                    class="icon-button topbar__menu"
                    type="button"
                    aria-label="Abrir menú"
                    aria-expanded="false"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <div class="topbar__brand">
                    <span class="topbar__brand-mark">
                        SE
                    </span>

                    <div>
                        <strong>${CONFIG.APP_NAME}</strong>
                        <small>v${CONFIG.VERSION}</small>
                    </div>
                </div>
            </div>

            <div class="topbar__user">
                <div class="topbar__user-text">
                    <strong>${nombre}</strong>
                    <small>${jurisdiccion}</small>
                </div>

                <button
                    id="btn-logout"
                    class="button button--light"
                    type="button"
                >
                    Cerrar sesión
                </button>
            </div>
        </header>
    `;
}


function crearSidebar(usuario) {
    const nombre = escaparHTML(
        usuario.nombre || "Usuario"
    );

    const jurisdiccion = escaparHTML(
        usuario.nombre_jurisdiccion ||
        usuario.jurisdiccion ||
        "Estatal"
    );

    const puedeCapturar =
        puedeRegistrarOperativos(usuario);

    return `
        <div class="sidebar-profile">
            <div class="sidebar-profile__avatar">
                ${obtenerIniciales(nombre)}
            </div>

            <div>
                <strong>${nombre}</strong>
                <span>${jurisdiccion}</span>
            </div>
        </div>

        <nav class="sidebar-nav">

            ${crearEnlaceSidebar(
                "/inicio",
                "Inicio",
                "home",
                true
            )}

            ${
                puedeCapturar
                    ? crearEnlaceSidebar(
                        "/operativos/nuevo",
                        "Registrar operativo",
                        "clipboard"
                    )
                    : ""
            }

            ${crearEnlaceSidebar(
                "/consultas",
                "Consultas",
                "search"
            )}

            ${crearEnlaceSidebar(
                "/inventarios",
                "Inventarios",
                "inventory"
            )}

            ${crearEnlaceSidebar(
                "/indicadores",
                "Indicadores",
                "chart"
            )}

            ${crearEnlaceSidebar(
                "/alertas",
                "Alertas",
                "alert"
            )}

            ${crearEnlaceSidebar(
                "/reportes",
                "Reportes",
                "report"
            )}

        </nav>

        <div class="sidebar-footer">
            <span>${CONFIG.APP_NAME}</span>
            <small>Versión ${CONFIG.VERSION}</small>
        </div>
    `;
}


function crearEnlaceSidebar(
    ruta,
    texto,
    icono,
    activo = false
) {
    return `
        <button
            class="sidebar-link${activo ? " is-active" : ""}"
            type="button"
            data-route="${escaparHTML(ruta)}"
        >
            <span class="sidebar-link__icon">
                ${obtenerIcono(icono)}
            </span>

            <span>${escaparHTML(texto)}</span>
        </button>
    `;
}


function crearResumen(resumen) {
    const elementos = [
        {
            etiqueta: "Casos",
            valor: resumen.casos,
            clase: "blue"
        },
        {
            etiqueta: "Operativos",
            valor: resumen.operativos,
            clase: "green"
        },
        {
            etiqueta: "Manzanas",
            valor: resumen.manzanas,
            clase: "purple"
        },
        {
            etiqueta: "Viviendas",
            valor: resumen.viviendas,
            clase: "orange"
        },
        {
            etiqueta: "Alertas",
            valor: resumen.alertas,
            clase: "red"
        }
    ];

    return elementos
        .map(elemento => `
            <article class="summary-card summary-card--${elemento.clase}">
                <span class="summary-card__label">
                    ${escaparHTML(elemento.etiqueta)}
                </span>

                <strong class="summary-card__value">
                    ${formatearEntero(elemento.valor)}
                </strong>
            </article>
        `)
        .join("");
}


function crearAccion(accion) {
    return `
        <button
            class="home-action"
            type="button"
            data-route="${escaparHTML(accion.ruta)}"
        >
            <span class="home-action__icon">
                ${obtenerIcono(accion.icono)}
            </span>

            <span class="home-action__content">
                <strong>
                    ${escaparHTML(accion.titulo)}
                </strong>

                <small>
                    ${escaparHTML(accion.descripcion)}
                </small>
            </span>

            <span
                class="home-action__arrow"
                aria-hidden="true"
            >
                →
            </span>
        </button>
    `;
}


function registrarEventosInicio() {
    document
        .querySelectorAll("[data-route]")
        .forEach(elemento => {
            elemento.addEventListener(
                "click",
                () => navegar(elemento.dataset.route)
            );
        });

    document
        .getElementById("btn-logout")
        .addEventListener(
            "click",
            procesarLogout
        );

    document
        .getElementById("btn-sidebar")
        .addEventListener(
            "click",
            alternarSidebar
        );

    document
        .getElementById("mobile-overlay")
        .addEventListener(
            "click",
            cerrarSidebar
        );
}


async function procesarLogout() {
    const boton = document.getElementById("btn-logout");
    const token = obtenerCookie(CONFIG.SESSION_COOKIE);

    boton.disabled = true;
    boton.textContent = "Cerrando...";

    try {
        await cerrarSesion(token);
    } finally {
        eliminarCookie(CONFIG.SESSION_COOKIE);
        navegar("/login", true);
    }
}


function alternarSidebar() {
    const sidebar = document.getElementById("app-sidebar");
    const overlay = document.getElementById("mobile-overlay");
    const boton = document.getElementById("btn-sidebar");

    const abierto = sidebar.classList.toggle("is-open");

    overlay.hidden = !abierto;
    boton.setAttribute(
        "aria-expanded",
        String(abierto)
    );
}


function cerrarSidebar() {
    const sidebar = document.getElementById("app-sidebar");
    const overlay = document.getElementById("mobile-overlay");
    const boton = document.getElementById("btn-sidebar");

    sidebar.classList.remove("is-open");
    overlay.hidden = true;
    boton.setAttribute("aria-expanded", "false");
}


function crearCargandoInicio() {
    return `
        <main class="initial-loader">
            <div class="initial-loader__content">
                <div
                    class="initial-loader__spinner"
                    aria-hidden="true"
                ></div>

                <p>Cargando información...</p>
            </div>
        </main>
    `;
}


function renderizarErrorInicio(error) {
    const app = document.getElementById("app");

    app.innerHTML = `
        <main class="system-error">
            <section class="system-error__card">
                <h1>No fue posible cargar el inicio</h1>

                <p>
                    ${escaparHTML(
                        error?.message ||
                        "Ocurrió un error inesperado."
                    )}
                </p>

                <button
                    id="btn-reintentar-inicio"
                    class="button button--primary"
                    type="button"
                >
                    Reintentar
                </button>

                <button
                    id="btn-salir-error"
                    class="button button--secondary"
                    type="button"
                >
                    Cerrar sesión
                </button>
            </section>
        </main>
    `;

    document
        .getElementById("btn-reintentar-inicio")
        .addEventListener(
            "click",
            mostrarInicio
        );

    document
        .getElementById("btn-salir-error")
        .addEventListener(
            "click",
            () => {
                eliminarCookie(CONFIG.SESSION_COOKIE);
                navegar("/login", true);
            }
        );
}


function obtenerIcono(nombre) {
    return ICONOS[nombre] || ICONOS.clipboard;
}


function obtenerIniciales(nombre) {
    return nombre
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(parte => parte.charAt(0).toUpperCase())
        .join("");
}


function formatearEntero(valor) {
    return new Intl.NumberFormat(
        "es-MX",
        {
            maximumFractionDigits: 0
        }
    ).format(Number(valor) || 0);
}


function escaparHTML(valor) {
    const elemento = document.createElement("div");

    elemento.textContent = String(valor ?? "");

    return elemento.innerHTML;
}