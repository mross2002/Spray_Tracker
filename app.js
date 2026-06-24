const map = L.map('map').setView([39.9526, -75.1652], 18);

L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
        attribution: 'Tiles © Esri',
        maxZoom: 20
    }
).addTo(map);

let marker = null;
let spraying = false;

const coverageLine = L.polyline([], {
    color: '#00ff66',
    weight: 14,
    opacity: 0.7
}).addTo(map);

const sprayButton = document.getElementById("sprayButton");

sprayButton.addEventListener("click", () => {
    spraying = !spraying;

    sprayButton.textContent = spraying ? "Spray ON" : "Spray OFF";
    sprayButton.className = spraying ? "spray-on" : "spray-off";
});

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

        if (spraying) {
            coverageLine.addLatLng([lat, lon]);
        }
    },
    (error) => {
        console.error(error);
        alert(error.message);
    },
    {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
    }
);
