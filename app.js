// =========================
// SprayTrack V0.4
// Dashboard shell + working coverage
// =========================

// ---------- Settings ----------

const SWATH_WIDTH_FEET = 6.0;
const TARGET_SPEED_MPH = 3.0;
const DUMMY_PRESSURE_PSI = 28;
const DUMMY_RATE_GPA = 15;

const FEET_TO_METERS = 0.3048;
const SQ_METERS_PER_ACRE = 4046.8564224;

const SWATH_WIDTH_METERS = SWATH_WIDTH_FEET * FEET_TO_METERS;

// ---------- App State ----------

let marker = null;
let spraying = false;
let lastSprayPoint = null;
let coverageAreaSqMeters = 0;
let coverageLayers = [];

// ---------- Map ----------

const map = L.map('map', {
    zoomControl: true
}).setView([39.9526, -75.1652], 18);

L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
        attribution: 'Tiles © Esri',
        maxZoom: 20
    }
).addTo(map);

// ---------- UI Elements ----------

const sprayButton = document.getElementById("sprayButton");
const clearButton = document.getElementById("clearButton");
const sprayStatusPill = document.getElementById("sprayStatusPill");

const gpsAccuracyEl = document.getElementById("gpsAccuracy");
const speedEl = document.getElementById("speed");
const actualSpeedCoachEl = document.getElementById("actualSpeedCoach");
const swathWidthEl = document.getElementById("swathWidth");
const areaCoveredEl = document.getElementById("areaCovered");
const pressureEl = document.getElementById("pressure");
const rateTargetEl = document.getElementById("rateTarget");
const targetSpeedEl = document.getElementById("targetSpeed");
const speedCoachStatusEl = document.getElementById("speedCoachStatus");
const gpsQualityEl = document.getElementById("gpsQuality");

// ---------- Initial UI ----------

swathWidthEl.textContent = SWATH_WIDTH_FEET.toFixed(1);
pressureEl.textContent = DUMMY_PRESSURE_PSI;
rateTargetEl.textContent = DUMMY_RATE_GPA;
targetSpeedEl.textContent = TARGET_SPEED_MPH.toFixed(1);

// ---------- Controls ----------

sprayButton.addEventListener("click", () => {
    spraying = !spraying;
    lastSprayPoint = null;
    updateSprayUi();
});

clearButton.addEventListener("click", () => {
    clearCoverage();
});

// ---------- GPS Watch ----------

navigator.geolocation.watchPosition(
    (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const currentPoint = { lat, lon };

        const speedMph = getSpeedMph(position);
        const accuracyFt = position.coords.accuracy * 3.28084;

        updatePositionMarker(currentPoint);
        updateTelemetry(speedMph, accuracyFt);

        if (spraying) {
            if (lastSprayPoint) {
                const addedArea = addSwathPolygon(
                    lastSprayPoint,
                    currentPoint,
                    SWATH_WIDTH_METERS
                );

                coverageAreaSqMeters += addedArea;
                updateAreaUi();
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

// ---------- UI Update Functions ----------

function updateSprayUi() {
    sprayButton.textContent = spraying ? "Spray ON" : "Spray OFF";
    sprayButton.className = spraying ? "spray-on" : "spray-off";

    sprayStatusPill.textContent = spraying ? "● ON" : "● OFF";
    sprayStatusPill.className = spraying
        ? "status-pill status-on"
        : "status-pill status-off";
}

function updateTelemetry(speedMph, accuracyFt) {
    speedEl.textContent = speedMph.toFixed(1);
    actualSpeedCoachEl.textContent = speedMph.toFixed(1);

    gpsAccuracyEl.textContent = Math.round(accuracyFt);

    if (accuracyFt <= 10) {
        gpsQualityEl.textContent = "Good";
    } else if (accuracyFt <= 25) {
        gpsQualityEl.textContent = "Fair";
    } else {
        gpsQualityEl.textContent = "Poor";
    }

    updateSpeedCoach(speedMph);
}

function updateSpeedCoach(speedMph) {
    const diff = speedMph - TARGET_SPEED_MPH;

    if (Math.abs(diff) <= 0.4) {
        speedCoachStatusEl.textContent = "ON TARGET";
        speedCoachStatusEl.style.color = "#86efac";
    } else if (diff > 0.4) {
        speedCoachStatusEl.textContent = "SLOW DOWN";
        speedCoachStatusEl.style.color = "#facc15";
    } else {
        speedCoachStatusEl.textContent = "SPEED UP";
        speedCoachStatusEl.style.color = "#facc15";
    }
}

function updateAreaUi() {
    const acres = coverageAreaSqMeters / SQ_METERS_PER_ACRE;
    areaCoveredEl.textContent = acres.toFixed(3);
}

function updatePositionMarker(point) {
    if (!marker) {
        marker = L.circleMarker([point.lat, point.lon], {
            radius: 8,
            color: '#ffffff',
            weight: 2,
            fillColor: '#38bdf8',
            fillOpacity: 1
        }).addTo(map);

        map.setView([point.lat, point.lon], 19);
    } else {
        marker.setLatLng([point.lat, point.lon]);
    }
}

function clearCoverage() {
    coverageLayers.forEach(layer => map.removeLayer(layer));
    coverageLayers = [];
    coverageAreaSqMeters = 0;
    lastSprayPoint = null;
    updateAreaUi();
}

// ---------- Coverage Geometry ----------

function addSwathPolygon(pointA, pointB, widthMeters) {
    const distance = distanceMeters(pointA, pointB);

    // Ignore tiny GPS jitter.
    if (distance < 0.75) {
        return 0;
    }

    const halfWidth = widthMeters / 2;

    const bearing = bearingRadians(pointA, pointB);
    const leftBearing = bearing - Math.PI / 2;
    const rightBearing = bearing + Math.PI / 2;

    const aLeft = offsetPoint(pointA, halfWidth, leftBearing);
    const aRight = offsetPoint(pointA, halfWidth, rightBearing);
    const bRight = offsetPoint(pointB, halfWidth, rightBearing);
    const bLeft = offsetPoint(pointB, halfWidth, leftBearing);

    const polygon = L.polygon(
        [
            [aLeft.lat, aLeft.lon],
            [bLeft.lat, bLeft.lon],
            [bRight.lat, bRight.lon],
            [aRight.lat, aRight.lon]
        ],
        {
            stroke: false,
            fillColor: '#f97316',
            fillOpacity: 0.22,
            interactive: false
        }
    ).addTo(map);

    coverageLayers.push(polygon);

    return distance * widthMeters;
}

// ---------- GPS Helpers ----------

function getSpeedMph(position) {
    if (position.coords.speed === null || position.coords.speed === undefined) {
        return 0;
    }

    return position.coords.speed * 2.23694;
}

// ---------- Geo Math ----------

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

function offsetPoint(point, distanceMetersValue, bearingRadiansValue) {
    const earthRadius = 6371000;

    const lat1 = degreesToRadians(point.lat);
    const lon1 = degreesToRadians(point.lon);

    const angularDistance = distanceMetersValue / earthRadius;

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
