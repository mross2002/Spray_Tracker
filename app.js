// Create map

const map = L.map('map').setView([39.9526, -75.1652], 18);

// Esri satellite imagery

L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
        attribution: 'Tiles © Esri',
        maxZoom: 20
    }
).addTo(map);

// Track phone position

let marker = null;

navigator.geolocation.watchPosition(
    (position) => {

        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        if (!marker) {

            marker = L.marker([lat, lon]).addTo(map);

            map.setView([lat, lon], 19);

        } else {

            marker.setLatLng([lat, lon]);

        }
    },
    (error) => {
        console.error(error);
        alert(error.message);
    },
    {
        enableHighAccuracy: true,
        maximumAge: 0
    }
);