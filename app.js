import {
    iniciarRouter
} from "./src/utils/router.js";


/*
==========================================================
INICIAR APLICACIÓN
==========================================================
*/

document.addEventListener(
    "DOMContentLoaded",
    iniciarAplicacion
);


function iniciarAplicacion() {
    try {
        validarEstructura();

        iniciarRouter();

        registrarServiceWorker();
    } catch (error) {
        mostrarErrorInicial(error);
    }
}


/*
==========================================================
VALIDAR ESTRUCTURA
==========================================================
*/

function validarEstructura() {
    const app =
        document.getElementById("app");

    if (!app) {
        throw new Error(
            "No se encontró el contenedor principal #app."
        );
    }
}


/*
==========================================================
SERVICE WORKER
==========================================================
*/

async function registrarServiceWorker() {
    if (
        !("serviceWorker" in navigator)
    ) {
        return;
    }

    try {
        const registro =
            await navigator
                .serviceWorker
                .register(
                    "./service-worker.js",
                    {
                        scope: "./"
                    }
                );

        registro.addEventListener(
            "updatefound",
            () => {
                const worker =
                    registro.installing;

                if (!worker) {
                    return;
                }

                worker.addEventListener(
                    "statechange",
                    () => {
                        if (
                            worker.state ===
                                "installed" &&
                            navigator
                                .serviceWorker
                                .controller
                        ) {
                            mostrarActualizacionDisponible(
                                registro
                            );
                        }
                    }
                );
            }
        );

        navigator.serviceWorker
            .addEventListener(
                "controllerchange",
                () => {
                    window.location.reload();
                }
            );
    } catch (error) {
        console.warn(
            "No fue posible registrar el Service Worker:",
            error
        );
    }
}


/*
==========================================================
ACTUALIZACIÓN DISPONIBLE
==========================================================
*/

function mostrarActualizacionDisponible(
    registro
) {
    if (
        document.getElementById(
            "app-update-notice"
        )
    ) {
        return;
    }

    const aviso =
        document.createElement("div");

    aviso.id =
        "app-update-notice";

    aviso.className =
        "app-update";

    aviso.innerHTML = `
        <span>
            Existe una nueva versión disponible.
        </span>

        <button
            id="btn-app-update"
            type="button"
        >
            Actualizar
        </button>
    `;

    document.body.appendChild(
        aviso
    );

    document
        .getElementById(
            "btn-app-update"
        )
        ?.addEventListener(
            "click",
            () => {
                if (
                    registro.waiting
                ) {
                    registro.waiting
                        .postMessage({
                            type:
                                "SKIP_WAITING"
                        });

                    return;
                }

                window.location.reload();
            }
        );
}


/*
==========================================================
ERROR INICIAL
==========================================================
*/

function mostrarErrorInicial(error) {
    console.error(
        "Error al iniciar SECR-ETV:",
        error
    );

    const app =
        document.getElementById("app");

    if (!app) {
        document.body.innerHTML = `
            <main class="system-error">

                <section class="system-error__card">

                    <h1>
                        No fue posible iniciar SECR-ETV
                    </h1>

                    <p>
                        ${escaparHTML(
                            error?.message ||
                            "Revise la configuración de la aplicación."
                        )}
                    </p>

                    <button
                        id="btn-reload-app"
                        class="button button--primary"
                        type="button"
                    >
                        Reintentar
                    </button>

                </section>

            </main>
        `;
    } else {
        app.innerHTML = `
            <main class="system-error">

                <section class="system-error__card">

                    <h1>
                        No fue posible iniciar SECR-ETV
                    </h1>

                    <p>
                        ${escaparHTML(
                            error?.message ||
                            "Revise la configuración de la aplicación."
                        )}
                    </p>

                    <button
                        id="btn-reload-app"
                        class="button button--primary"
                        type="button"
                    >
                        Reintentar
                    </button>

                </section>

            </main>
        `;
    }

    document
        .getElementById(
            "btn-reload-app"
        )
        ?.addEventListener(
            "click",
            () => {
                window.location.reload();
            }
        );
}


/*
==========================================================
UTILIDAD
==========================================================
*/

function escaparHTML(valor) {
    const elemento =
        document.createElement("div");

    elemento.textContent =
        String(valor ?? "");

    return elemento.innerHTML;
}