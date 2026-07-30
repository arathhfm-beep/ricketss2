export function moneda(numero){


return new Intl.NumberFormat(

"es-MX",

{

style:"currency",

currency:"MXN"

}

).format(numero);


}



export function entero(numero){


return new Intl.NumberFormat(

"es-MX"

).format(numero);


}