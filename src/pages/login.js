import { CONFIG } from "../../config.js";

import { iniciarSesion } from "../services/auth.service.js";

import { guardarCookie } from "../utils/cookies.js";

import { navegar } from "../utils/router.js";

export function mostrarLogin() {
    const app = document.getElementById("app");

    document.title = `Iniciar sesión | ${CONFIG.APP_NAME}`;

    app.innerHTML = `
        <main class="login-page">
            <section class="login-card" aria-labelledby="login-title">
                <div class="login-brand">
                    <div class="login-brand__icon" aria-hidden="true">
                        SE
                    </div>

                    <div>
                        <h1 id="login-title">${CONFIG.APP_NAME}</h1>
                        <p>Control epidemiológico y operativo</p>
                    </div>
                </div>

                <form id="login-form" class="login-form" novalidate>
                    <div class="form-group">
                        <label for="login-usuario">Usuario</label>

                        <input
                            id="login-usuario"
                            name="usuario"
                            type="text"
                            autocomplete="username"
                            maxlength="100"
                            required
                            autofocus
                            placeholder="Ingrese su usuario"
                        >
                    </div>

                    <div class="form-group">
                        <label for="login-password">Contraseña</label>

                        <div class="password-control">
                            <input
                                id="login-password"
                                name="password"
                                type="password"
                                autocomplete="current-password"
                                maxlength="200"
                                required
                                placeholder="Ingrese su contraseña"
                            >

                            <button
                                id="toggle-password"
                                class="password-toggle"
                                type="button"
                                aria-label="Mostrar contraseña"
                            >
                                Mostrar
                            </button>
                        </div>
                    </div>

                    <div
                        id="login-mensaje"
                        class="form-message"
                        role="alert"
                        aria-live="polite"
                    ></div>

                    <button
                        id="login-submit"
                        class="button button--primary button--block"
                        type="submit"
                    >
                        Ingresar
                    </button>
                </form>

                <footer class="login-footer">
                    Versión ${CONFIG.VERSION}
                </footer>
            </section>
        </main>
    `;

    const formulario = document.getElementById("login-form");
    const botonPassword = document.getElementById("toggle-password");

    formulario.addEventListener("submit", procesarLogin);
    botonPassword.addEventListener("click", alternarPassword);
}

function alternarPassword() {
    const campo = document.getElementById("login-password");
    const boton = document.getElementById("toggle-password");

    const mostrar = campo.type === "password";

    campo.type = mostrar ? "text" : "password";
    boton.textContent = mostrar ? "Ocultar" : "Mostrar";

    boton.setAttribute(
        "aria-label",
        mostrar ? "Ocultar contraseña" : "Mostrar contraseña"
    );
}

async function procesarLogin(evento) {
    evento.preventDefault();

    const formulario = evento.currentTarget;
    const boton = document.getElementById("login-submit");
    const mensaje = document.getElementById("login-mensaje");

    const datosFormulario = new FormData(formulario);

    const usuario = String(
        datosFormulario.get("usuario") || ""
    ).trim();

    const password = String(
        datosFormulario.get("password") || ""
    );

    mensaje.textContent = "";
    mensaje.className = "form-message";

    if (!usuario || !password) {
        mostrarError("Ingrese el usuario y la contraseña.");
        return;
    }

    bloquearFormulario(boton, true);

    try {
        const respuesta = await iniciarSesion(
            usuario,
            password
        );

        guardarCookie(
            CONFIG.SESSION_COOKIE,
            respuesta.token,
            CONFIG.SESSION_HOURS
        );

        navegar("/inicio", true);
    } catch (error) {
        mostrarError(
            error.message || "No fue posible iniciar sesión."
        );
    } finally {
        bloquearFormulario(boton, false);
    }
}

function mostrarError(texto) {
    const mensaje = document.getElementById("login-mensaje");

    mensaje.textContent = texto;
    mensaje.className = "form-message form-message--error";
}

function bloquearFormulario(boton, bloqueado) {
    const controles = document.querySelectorAll(
        "#login-form input, #login-form button"
    );

    controles.forEach(control => {
        control.disabled = bloqueado;
    });

    boton.textContent = bloqueado
        ? "Validando..."
        : "Ingresar";
}