export function capitalizar(texto){


return texto

.charAt(0)

.toUpperCase()

+

texto

.slice(1)

.toLowerCase();


}



export function esNumero(valor){

    return !isNaN(valor);

}