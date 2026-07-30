function usarCookieSegura() {
    return window.location.protocol === "https:";
}

export function guardarCookie(
    nombre,
    valor,
    horas = 12
) {
    if (!nombre || valor === undefined || valor === null) {
        throw new Error("Nombre y valor de cookie requeridos.");
    }

    const maxAge = Math.max(
        1,
        Math.floor(Number(horas) * 60 * 60)
    );

    const partes = [
        `${encodeURIComponent(nombre)}=${encodeURIComponent(valor)}`,
        "Path=/",
        `Max-Age=${maxAge}`,
        "SameSite=Strict"
    ];

    if (usarCookieSegura()) {
        partes.push("Secure");
    }

    document.cookie = partes.join("; ");
}

export function obtenerCookie(nombre) {
    const nombreCodificado = `${encodeURIComponent(nombre)}=`;

    const cookies = document.cookie
        .split(";")
        .map(cookie => cookie.trim());

    const cookieEncontrada = cookies.find(
        cookie => cookie.startsWith(nombreCodificado)
    );

    if (!cookieEncontrada) {
        return null;
    }

    const valor = cookieEncontrada.substring(
        nombreCodificado.length
    );

    try {
        return decodeURIComponent(valor);
    } catch {
        return valor;
    }
}

export function existeCookie(nombre) {
    return obtenerCookie(nombre) !== null;
}

export function eliminarCookie(nombre) {
    const partes = [
        `${encodeURIComponent(nombre)}=`,
        "Path=/",
        "Max-Age=0",
        "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
        "SameSite=Strict"
    ];

    if (usarCookieSegura()) {
        partes.push("Secure");
    }

    document.cookie = partes.join("; ");
}