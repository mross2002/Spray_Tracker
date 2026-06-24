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
let lastSprayPoint = null;

const SWATH_WIDTH_FEET = 6;
const FEET_TO_METERS = 0.3048;
const SWATH_WIDTH_METERS = SWATH_WIDTH_FEET * FEET_TO_METERS;

const sprayButton = document.getElementById("sprayButton");

sprayButton.addEventListener("click", () => {
    spraying = !spraying;

    sprayButton.textContent = spraying ? "Spray ON" : "Spray OFF";
    sprayButton.className = spraying ? "spray-on" : "spray-off";

    // Break the polygon chain when turning spraying off/on.
    lastSprayPoint = null;
});

navigator.geolocation.watchPosition(
    (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const currentPoint = { lat, lon };

        if (!marker) {
            marker = L.marker([lat, lon]).addTo(map);
            map.setView([lat, lon], 19);
        } else {
            marker.setLatLng([lat, lon]);
        }

        if (spraying) {
            if (lastSprayPoint) {
                addSwathPolygon(lastSprayPoint, currentPoint, SWATH_WIDTH_METERS);
            }

            lastSprayPoint = currentPoint;
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

function addSwathPolygon(pointA, pointB, widthMeters) {
    const distance = distanceMeters(pointA, pointB);

    // Ignore tiny GPS jitter.
    if (distance < 0.75) {
        return;
    }

    const halfWidth = widthMeters / 2;

    const bearing = bearingRadians(pointA, pointB);
    const leftBearing = bearing - Math.PI / 2;
    const rightBearing = bearing + Math.PI / 2;

    const aLeft = offsetPoint(pointA, halfWidth, leftBearing);
    const aRight = offsetPoint(pointA, halfWidth, rightBearing);
    const bRight = offsetPoint(pointB, halfWidth, rightBearing);
    const bLeft = offsetPoint(pointB, halfWidth, leftBearing);

    L.polygon(
        [
            [aLeft.lat, aLeft.lon],
            [bLeft.lat, bLeft.lon],
            [bRight.lat, bRight.lon],
            [aRight.lat, aRight.lon]
        ],
        {
            color: '#00ff66',
            weight: 1,
            opacity: 0.45,
            fillColor: '#00ff66',
            fillOpacity: 0.35
        }
    ).addTo(map);
}

function distanceMeters(pointA, pointB) {
    const earthRadius = 6371000;

    const lat1 = degreesToRadians(pointA.lat);
    const lat2 = degreesToRadians(pointB.lat);

    const deltaLat = degreesToRadians(pointB.lat - pointA.lat);
    const deltaLon = degreesToRadians(pointB.lon - pointA.lon);

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
}

function bearingRadians(pointA, pointB) {
    const lat1 = degreesToRadians(pointA.lat);
    const lat2 = degreesToRadians(pointB.lat);
    const deltaLon = degreesToRadians(pointB.lon - pointA.lon);

    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    return Math.atan2(y, x);
}

function offsetPoint(point, distanceMeters, bearingRadiansValue) {
    const earthRadius = 6371000;

    const lat1 = degreesToRadians(point.lat);
    const lon1 = degreesToRadians(point.lon);

    const angularDistance = distanceMeters / earthRadius;

    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(angularDistance) +
        Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRadiansValue)
    );

    const lon2 =
        lon1 +
        Math.atan2(
            Math.sin(bearingRadiansValue) * Math.sin(angularDistance) * Math.cos(lat1),
            Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
        );

    return {
        lat: radiansToDegrees(lat2),
        lon: radiansToDegrees(lon2)
    };
}

function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

function radiansToDegrees(radians) {
    return radians * 180 / Math.PI;
}
