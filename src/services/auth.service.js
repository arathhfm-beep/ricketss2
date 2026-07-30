import { supabase } from "./supabase.js";

function obtenerMensajeError(error) {
    if (!error) {
        return "Ocurrió un error desconocido.";
    }

    if (error.message) {
        return error.message;
    }

    return "No fue posible completar la operación.";
}

export async function iniciarSesion(usuario, password) {
    const { data, error } = await supabase.rpc(
        "login_usuario",
        {
            p_usuario: usuario,
            p_password: password
        }
    );

    if (error) {
        throw new Error(obtenerMensajeError(error));
    }

    if (!data?.ok) {
        throw new Error(
            data?.mensaje || "Usuario o contraseña incorrectos."
        );
    }

    return data;
}

export async function validarSesion(token) {
    if (!token) {
        return {
            ok: false,
            valida: false
        };
    }

    const { data, error } = await supabase.rpc(
        "validar_sesion",
        {
            p_token: token
        }
    );

    if (error) {
        console.error("Error validando la sesión:", error);

        return {
            ok: false,
            valida: false,
            mensaje: error.message
        };
    }

    return data || {
        ok: false,
        valida: false
    };
}

export async function renovarSesion(token) {
    if (!token) {
        return {
            ok: false,
            renovada: false
        };
    }

    const { data, error } = await supabase.rpc(
        "renovar_sesion",
        {
            p_token: token
        }
    );

    if (error) {
        console.error("Error renovando la sesión:", error);

        return {
            ok: false,
            renovada: false,
            mensaje: error.message
        };
    }

    return data || {
        ok: false,
        renovada: false
    };
}

export async function cerrarSesion(token) {
    if (!token) {
        return {
            ok: true
        };
    }

    const { data, error } = await supabase.rpc(
        "logout_usuario",
        {
            p_token: token
        }
    );

    if (error) {
        console.error("Error cerrando la sesión:", error);

        return {
            ok: false,
            mensaje: error.message
        };
    }

    return data || {
        ok: true
    };
}