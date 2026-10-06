(() => {
  const element = document.querySelector('#coverage-map');
  if (!element) return;
  const fallback = document.querySelector('#map-fallback');
  const reset = document.querySelector('.map-reset');
  async function initialize() {
    try {
      if (!window.L) throw new Error('Map library unavailable');
      const [boundaryResponse, placesResponse] = await Promise.all([
        fetch('assets/map/service-area.geojson'), fetch('assets/map/places.json')
      ]);
      if (!boundaryResponse.ok || !placesResponse.ok) throw new Error('Boundary unavailable');
      const [data, places] = await Promise.all([boundaryResponse.json(), placesResponse.json()]);
      if (data.features?.length !== 1 || data.features[0].geometry?.type !== 'Polygon') throw new Error('Invalid service outline');
      const map = L.map(element, {scrollWheelZoom:false, zoomControl:true, zoomSnap:0.1, minZoom:6, maxZoom:15, attributionControl:true});
      map.attributionControl.setPrefix(false);
      map.fitBounds(L.geoJSON(data).getBounds(), {paddingTopLeft:[28,45],paddingBottomRight:[28,28],animate:false});
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors', maxZoom:19, keepBuffer:1
      }).addTo(map);
      L.geoJSON(data, {interactive:false, style:{color:'#fff', weight:7, opacity:0.95, fill:false, lineJoin:'round'}}).addTo(map);
      const coverage = L.geoJSON(data, {interactive:false, style:{color:'#67b2e8',weight:3.5,opacity:1,fillColor:'#bfdd9f',fillOpacity:0.05,lineJoin:'round',className:'beautiful-coverage-outline'}}).addTo(map);
      for (const place of places) {
        const dot = L.circleMarker([place.lat,place.lon], {radius:3.5,color:'#235d83',weight:1.5,fillColor:'#fff',fillOpacity:1}).addTo(map);
        const label = document.createElement('span');
        label.textContent = place.name + (place.state === 'OH' ? ', OH' : '');
        dot.bindTooltip(label, {direction:'top',className:'map-town-label'});
      }
      const fit = () => {
        map.invalidateSize({pan:false});
        map.fitBounds(coverage.getBounds(), {paddingTopLeft:[28,45],paddingBottomRight:[28,28],animate:false});
      };
      fit(); reset.hidden = false; reset.addEventListener('click', fit);
      new ResizeObserver(fit).observe(element);
      tiles.on('tileerror', () => {element.dataset.backgroundError = 'true';});
      element.dataset.loaded = 'true'; fallback.hidden = true;
    } catch (error) {
      element.dataset.error = error.message;
      console.warn("Service map unavailable:", error.stack);
      element.hidden = true; reset.hidden = true; fallback.hidden = false;
    }
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {observer.disconnect(); initialize();}
    }, {rootMargin:'250px'});
    observer.observe(element);
  } else initialize();
})();
