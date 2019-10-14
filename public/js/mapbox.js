/* eslint-disable */
export const displayMap = locations => {
    console.log('mapbox loaded. 😊');
    mapboxgl.accessToken =
        'pk.eyJ1IjoiaXN0ZXZrb3Zza2kiLCJhIjoiY2p4YmtzOHdiMDBlejNvcDl6azdzZHp6cSJ9.diH4AvcHrVz6noahp5RdLw';

    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/istevkovski/ck1mwn2z305p51coe930i6qvx'
        // center: [-118.113491, 34.111745],
        // zoom: 10,
        // interactive: false
    });

    const bounds = new mapboxgl.LngLatBounds();
    locations.forEach(loc => {
        // Create marker for every location
        const el = document.createElement('div');
        el.className = 'marker';

        // Add marker on map
        new mapboxgl.Marker({
            element: el,
            anchor: 'bottom'
        })
            .setLngLat(loc.coordinates)
            .addTo(map);

        // Add popup
        new mapboxgl.Popup({
            offset: 30
        })
            .setLngLat(loc.coordinates)
            .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
            .addTo(map);

        // Extend the map bounds to include the current location
        bounds.extend(loc.coordinates);
    });

    map.on('wheel', event => {
        if (
            event.originalEvent.ctrlKey ||
            event.originalEvent.metaKey ||
            event.originalEvent.altKey
        )
            return;
        event.preventDefault();
    });

    // Update map fit bounds
    map.fitBounds(bounds, {
        padding: {
            top: 200,
            bottom: 150,
            left: 100,
            right: 100
        }
    });
};
