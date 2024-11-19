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
var currentRouteLayer = null;
// Função para buscar a rota específica
function fetchBusRoute(relationId) {
    var query = `
        [out:json];
        relation(${relationId});
        out body;
        >;
        out skel qt;
    `;
    var overpassUrl = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);

    fetch(overpassUrl)
        .then(response => response.json())
        .then(data => {
            if (data.elements && data.elements.length > 0) {
                let coordinates = [];
                data.elements.forEach(element => {
                    if (element.type === "relation") {
                        element.members.forEach(member => {
                            if (member.type === "way") {
                                fetchWayCoordinates(member.ref, coordinates);
                            }
                        });
                    } else if (element.type === "node") {
                        let coord = ol.proj.fromLonLat([element.lon, element.lat]);
                        if (coordinates.length === 0 || !areCoordinatesEqual(coordinates[coordinates.length - 1], coord)) {
                            coordinates.push(coord);
                        }
                    }
                });
            } else {
                console.error('Nenhum elemento encontrado para a relação especificada.');
            }
        })
        .catch(error => console.error('Erro ao buscar a rota:', error));    
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
function drawLine(coordinates) {
    if (coordinates.length > 0) {
        let uniqueCoordinates = coordinates.filter((coord, index, self) =>
            index === 0 || !(coord[0] === self[index - 1][0] && coord[1] === self[index - 1][1])
        );

        var lineString = new ol.geom.LineString(uniqueCoordinates);
        var feature = new ol.Feature({
            geometry: lineString
        });

        var vectorSource = new ol.source.Vector({
            features: [feature]
        });

        var newRouteLayer = new ol.layer.Vector({
            source: vectorSource,
            style: new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'gray',
                    width: 6
                })
            })
        });

        if (currentRouteLayer) {
            map.removeLayer(currentRouteLayer); // Remove a camada de rota anterior, se existir
        }
        
        map.addLayer(newRouteLayer);
        currentRouteLayer = newRouteLayer; // Adiciona a nova camada de rota ao mapa
    } else {
        console.error('Nenhuma coordenada válida encontrada para desenhar a linha.');
    }
}

function toggleMenu() {
    var menuContent = document.getElementById('menuContent');
    menuContent.style.display = menuContent.style.display === 'none' || menuContent.style.display === '' ? 'block' : 'none';
}

// Chama a função para buscar e desenhar a rota quando tudo carrega
fetchBusRoute();