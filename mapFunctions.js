// Criando um mapa
var map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM() // Usando OpenStreetMap como fonte
        })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([-51.0862248, -0.0114405]), // Coordenadas iniciais
        zoom: 14 // Nível de zoom inicial
    })
});

// Função para buscar a rota específica
function fetchBusRoute() {
    var query = `
        [out:json];
        relation(18302047);
        out body;
        >;
        out skel qt;
    `;
    var overpassUrl = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);

    fetch(overpassUrl) // Fazendo a chamada pra API do Overpass
        .then(response => response.json()) // Transformando a resposta em JSON
        .then(data => {
            if (data.elements && data.elements.length > 0) { // Se achamos alguma coisa
                let coordinates = []; // Array pra guardar as coordenadas que vamos pegar
                data.elements.forEach(element => { // Pra cada elemento que encontramos...
                    if (element.type === "relation") { // Se for uma relação...
                        element.members.forEach(member => { // Vamos ver os membros dela
                            if (member.type === "way") { // Se for um 'way', vamos buscar as coordenadas
                                fetchWayCoordinates(member.ref, coordinates);
                            }
                        });
                    } else if (element.type === "node") { // Se for um nó...
                        let coord = ol.proj.fromLonLat([element.lon, element.lat]); // Transformando pra coordenadas do OpenLayers
                        // Adiciona só se não for um ponto isolado
                        if (coordinates.length === 0 || !coordinates[coordinates.length - 1].equals(coord)) {
                            coordinates.push(coord); // Adiciona a coordenada ao array
                        }
                    }
                });
            } else {
                console.error('Nenhum elemento encontrado para a relação especificada.'); // Se não achou nada, avisa no console
            }
        })
        .catch(error => console.error('Erro ao buscar a rota:', error)); // Se der erro, mostra no console também
}

// Função para buscar coordenadas do way
function fetchWayCoordinates(wayId, coordinates) {
    var query = `
        [out:json];
        way(${wayId});
        out geom;
    `;
    var overpassUrl = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);

    fetch(overpassUrl) // Fazendo a chamada pra API de novo
        .then(response => response.json())
        .then(data => {
            if (data.elements && data.elements.length > 0) {
                var way = data.elements[0]; // Pegamos o primeiro elemento que é o nosso 'way'
                if (way.geometry) {
                    way.geometry.forEach(coord => {
                        coordinates.push(ol.proj.fromLonLat([coord.lon, coord.lat])); // Adicionando as coordenadas ao nosso array
                    });
                    drawLine(coordinates); // Agora desenhamos a linha no mapa com essas coordenadas
                } else {
                    console.error('Geometria não encontrada para o way especificado.');
                }
            } else {
                console.error('Nenhum dado encontrado para o way especificado.');
            }
        })
        .catch(error => console.error('Erro ao buscar coordenadas do way:', error));
}

// Função para desenhar a linha no mapa com as coordenadas que pegamos
// Função para desenhar a linha no mapa com as coordenadas que pegamos
function drawLine(coordinates) {
    if (coordinates.length > 0) {
        // Definir uma tolerância para coordenadas próximas
        const tolerance = 0.00001; // Ajuste conforme necessário

        let uniqueCoordinates = coordinates.filter((coord, index, self) => {
            if (index === 0) return true; // Sempre mantém a primeira coordenada
            const prevCoord = self[index - 1];
            return Math.abs(coord[0] - prevCoord[0]) > tolerance || Math.abs(coord[1] - prevCoord[1]) > tolerance;
        });

        var lineString = new ol.geom.LineString(uniqueCoordinates); // Criando uma linha com as coordenadas únicas

        var feature = new ol.Feature({
            geometry: lineString // Criando uma feature com nossa linha
        });

        var vectorSource = new ol.source.Vector({
            features: [feature] // Fonte vetorial pra armazenar nossa linha
        });

        var linesLayer = new ol.layer.Vector({
            source: vectorSource,
            style: new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'gray', // Cor da linha
                    width: 6 // Espessura da linha
                })
            })
        });

        map.addLayer(linesLayer); // Adiciona a camada de linhas ao mapa
    } else {
        console.error('Nenhuma coordenada válida encontrada para desenhar a linha.');
    }
}

// Chama a função para buscar e desenhar a rota quando tudo carrega
fetchBusRoute();