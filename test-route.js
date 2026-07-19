async function getRoute(waypoints) {
  const coords = [];
  for (const wp of waypoints) {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(wp)}&format=json&limit=1`, {
      headers: { 'User-Agent': 'DriverMetricsApp/1.0 (reisanselmo7@gmail.com)' }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      coords.push(`${data[0].lon},${data[0].lat}`);
    } else {
      throw new Error(`Não foi possível encontrar o endereço: ${wp}`);
    }
  }
  
  const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords.join(';')}?overview=false`);
  const osrmData = await osrmRes.json();

  if (osrmData.routes && osrmData.routes.length > 0) {
    const route = osrmData.routes[0];
    return {
      distanceKm: route.distance / 1000,
      timeMins: route.duration / 60
    };
  }
}
getRoute(['Av Paulista, Sao Paulo', 'Ibirapuera, Sao Paulo']).then(console.log).catch(console.error);
