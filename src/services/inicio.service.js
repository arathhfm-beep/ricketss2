import { supabase } from "./supabase.js";

export async function obtenerInicio(token) {
    if (!token) {
        throw new Error("No existe una sesión activa.");
    }

    const { data, error } = await supabase.rpc(
        "obtener_inicio",
        {
            p_token: token
        }
    );

    if (error) {
        throw new Error(
            error.message ||
            "No fue posible cargar la información de inicio."
        );
    }

    if (!data?.ok) {
        throw new Error(
            data?.mensaje ||
            "No fue posible cargar la página de inicio."
        );
    }

    return data;
}