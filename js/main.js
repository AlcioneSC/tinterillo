/* LECTOR LEY CHILE
Rationale: El sitio web http://www.leychile.cl permite ver todas
las leyes y reglamentos de Chile en base a una API basada en XML.
Sin embargo, el aspecto de las leyes en ese sistema es feo,
ya que usa tipos de letra monoespaciados y es muy poco eficiente
en el uso de papel. Por eso necesito un lector personal.
El sistema parsea los archivos XML que están disponibles como API
pública en el sistema LeyChile y su schema está disponible en
https://www.bcn.cl/leychile/consulta/legislacion_abierta_web_service
*/

function retrieveStatute(statCode) {
    // cleanup
    const sect = document.querySelector("#container");
    while(sect.firstChild) {
        sect.firstChild.remove();
    }

    /* Se tuvo que introducir aquí un proxy CORS. Sin el proxy CORS
    el código no funciona. Eso es porque el servidor de LeyChile
    está mal configurado. */
    const Statute = fetch(`https://corsproxy.io/?https://www.leychile.cl/Consulta/obtxml?opt=7&idNorma=${statCode}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/xml',
        },
        cache: 'default'
    })
    .then(response => {
        if (response.ok) {
            console.log("XML correcto");
            return response.text();
        }
    }).then((value) => {
        // Opcional: XML a la consola.
        //console.log(value);
        const Parser = new DOMParser;
        const xmlStatute = Parser.parseFromString(value,"application/xml");
        const xmlHeader = xmlStatute.getElementsByTagName("Encabezado")[0];
        let xmlTitle = xmlStatute.getElementsByTagName("TituloNorma")[0].innerHTML;
        let headerTXT = document.createElement("h1");
        let headerBase = document.createElement("p")
        headerTXT.innerHTML = xmlTitle;
        headerBase.innerHTML = xmlHeader.innerHTML.replace(/[\n\r]+\s/g,"</p><p>")
        sect.appendChild(headerTXT);
        sect.appendChild(headerBase);
        const xmlText = xmlStatute.getElementsByTagName("EstructuraFuncional");
        // ¿por qué no un foreach? ver 
        // https://leanylabs.com/blog/js-forEach-map-reduce-vs-for-for_of/
        for (let i=0; i < xmlText.length; i++) {
            //Atributos útiles:
            //tipoParte = Libro, Título, Capítulo, Párrafo, Enumeración o Artículo.
            //fechaVersion = la fecha en que el artículo fue modificado.
            //derogado = ¿Está derogado el artículo?. "derogado" / "no derogado"
            const corrAttr = xmlText[i].getAttribute("tipoParte");
            let corrString = xmlText[i].getElementsByTagName("Texto")[0].innerHTML;
            //console.log(corrString);
            corrString = corrString.replace("�","í");
            //regex: retorno de carro + avance de línea + espacio = párrafo
            corrString = corrString.replace(/[\n\r]+\s{2,}/g,"</p><p>");
            //regex: eliminación de citas legales hardcoded
            corrString = corrString.replace(/(?:\b|(?<=[\,|\.|\)|á|í|ó|\:|\;]))\s{3,}(?:Art|L\.|LEY|Inc|D\.O\.|letra|Nº)+.*/gi,"");
            if(corrAttr=="Libro") {
                corrString = "<h2>" + corrString + "</h2>"
            } else if(corrAttr=="Título") {
                corrString = "<h3>" + corrString + "</h3>"
            } else if(corrAttr=="Capítulo"||corrAttr=="Párrafo"||corrAttr=="Enumeración") {
                corrString = "<h4>" + corrString + "</h4>"
            } else {
                corrString = "<p>" + corrString + "</p>"
            }
            corrString = corrString.replace("<p></p>","");
            let para = document.createElement("div");
            para.innerHTML = corrString;
            //Si está derogado, añadimos la clase derogado. Luego CSS va a atenuar el artículo
            if(xmlText[i].getAttribute("derogado")=="derogado") {
                para.classList.add("derogado");
            }
            sect.appendChild(para)
        }
        //Decreto promulgatorio. Por obvias razones sólo hay uno.
        if(xmlStatute.getElementsByTagName("Promulgacion").length > 0) {
            let footerPub = xmlStatute.getElementsByTagName("Promulgacion")[0];
            let pubElement = document.createElement("p");
            pubElement.innerHTML = footerPub.innerHTML.replace(/[\n\r]+\s/g,"</p><p>");
            pubElement.classList.add("promulgacion");
            sect.appendChild(pubElement);
        }
        //Anexos (Sentencias del Tribunal Constitucional). PUEDE NO HABER.
        if(xmlStatute.getElementsByTagName("Anexos").length > 0) {
            let footerAnnex = xmlStatute.getElementsByTagName("Anexos")[0];
            let footerElement = document.createElement("p");
            footerElement.innerHTML = footerAnnex.innerHTML.replace(/[\n\r]+\s/g,"</p><p>");
            footerElement.classList.add("anexo");
            sect.appendChild(footerElement);    
        }
    }).catch((err) => {
        console.log(err)
    });
}

function listStatute() {
    const paraList = fetch("./data/leyes.json", {
        method: 'GET',
        headers: {
            'Content-Type': 'application/xml',
        },
        cache: 'default'
    }).then(response => {
        if (response.ok) {
            console.log("Lista correcta");
            return response.text();
        }
    }).then((value) => {
        const sect = document.querySelector("#indexList");
        const statArray = JSON.parse(value);
        for (let i=0; i < statArray.length; i++) {
            const itemL = document.createElement("li");
            itemL.innerText = statArray[i].desc;
            itemL.setAttribute("onclick",`retrieveStatute(${statArray[i].id})`)
            sect.appendChild(itemL)
        }
    }).catch((err) => {
        console.log(err)
    });
}

//El argumento es el número de la ley. Se obtiene de LeyChile.
//TODO: esto es perfecto para consultar una serie de normas en una 
//base de datos JSON separada.
listStatute()

document.getElementById("inputFilter").addEventListener("keyup", () => {
    let filterText = document.getElementById("inputFilter").value
    filterText = filterText.toLowerCase()
    let lis = document.querySelectorAll("#indexList li");
    for (let i=0;i < lis.length; i++) {
        let innerLow = lis[i].innerText.toLowerCase()
        if(filterText === "" || innerLow.includes(filterText)) {
            lis[i].classList.remove("hidden")
        } else {
            lis[i].classList.add("hidden")
        }
    }
})