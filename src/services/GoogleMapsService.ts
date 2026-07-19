export class GoogleMapsService {
  /**
   * Calculates the distance and duration using the Google Maps Distance Matrix API.
   * Processes segments sequentially: origin -> stop1 -> stop2 -> destination.
   * 
   * @param origin Starting point address
   * @param destination Ending point address
   * @param stops Array of intermediate stops
   * @returns Object containing total distance in kilometers and total time in minutes
   */
  public static async calculateRouteMetrics(origin: string, destination: string, stops: string[] = []): Promise<{ distanceKm: number, timeMins: number }> {
    const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY?.trim();
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      throw new Error("A chave GOOGLE_MAPS_PLATFORM_KEY não está configurada.");
    }

    const waypoints = [origin, ...stops, destination].filter(Boolean);
    
    if (waypoints.length < 2) {
      throw new Error("Pelo menos origem e destino são necessários.");
    }

    let totalDistanceKm = 0;
    let totalTimeMins = 0;

    const origins = waypoints.slice(0, -1);
    const destinations = waypoints.slice(1);

    const originsStr = origins.map(o => encodeURIComponent(o)).join('|');
    const destinationsStr = destinations.map(d => encodeURIComponent(d)).join('|');

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originsStr}&destinations=${destinationsStr}&key=${apiKey}`;

    const headers: Record<string, string> = {}; if (process.env.APP_URL) { headers['Referer'] = process.env.APP_URL; } const response = await fetch(url, { headers });
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${data.status} - ${data.error_message || ''}`);
    }

    // Extract the diagonal of the matrix.
    // origin[i] to destination[i] is at data.rows[i].elements[i]
    for (let i = 0; i < origins.length; i++) {
      const element = data.rows[i].elements[i];
      if (element.status === 'OK') {
        totalDistanceKm += element.distance.value / 1000;
        totalTimeMins += element.duration.value / 60;
      } else {
        throw new Error(`Não foi possível calcular a rota para o trecho: ${origins[i]} -> ${destinations[i]}`);
      }
    }

    return {
      distanceKm: totalDistanceKm,
      timeMins: totalTimeMins
    };
  }
}
