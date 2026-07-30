export function formatoFecha(fecha){


return new Intl.DateTimeFormat(

"es-MX",

{

day:"2-digit",

month:"long",

year:"numeric"

}

)

.format(

new Date(fecha)

);


}