import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import {
    CONFIG
} from "../../config.js";


/*
==========================================================
VALIDAR CONFIGURACIÓN
==========================================================
*/

function validarConfiguracion() {
    const urlValida =
        typeof CONFIG.SUPABASE_URL ===
            "string" &&
        CONFIG.SUPABASE_URL.startsWith(
            "https://"
        ) &&
        CONFIG.SUPABASE_URL.includes(
            ".supabase.co"
        );


    const claveValida =
        typeof CONFIG.SUPABASE_ANON_KEY ===
            "string" &&
        CONFIG.SUPABASE_ANON_KEY.length >
            20;


    if (
        !urlValida ||
        !claveValida
    ) {
        throw new Error(
            "Configura SUPABASE_URL y SUPABASE_ANON_KEY en config.js."
        );
    }
}


validarConfiguracion();


/*
==========================================================
CLIENTE SUPABASE
==========================================================
*/

export const supabase =
    createClient(
        CONFIG.SUPABASE_URL,
        CONFIG.SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession:
                    false,

                autoRefreshToken:
                    false,

                detectSessionInUrl:
                    false
            },

            global: {
                headers: {
                    "X-Client-Info":
                        `${CONFIG.APP_NAME}/${CONFIG.APP_VERSION}`
                }
            }
        }
    );