import { Vehicle } from '../db/models/Vehicle';

export class CostCalculatorService {
  /**
   * Calculates the true cost of a ride based on distance, time, and vehicle parameters.
   * Inspired by 'Meu Km' logic.
   *
   * @param vehicle - The vehicle used for the ride.
   * @param distanceKm - Distance of the ride in kilometers.
   * @param timeMins - Estimated time of the ride in minutes.
   * @param fuelPricePerLiter - Current fuel price.
   * @returns An object containing the breakdown of costs and the total cost.
   */
  public static calculateRideCost(
    vehicle: Vehicle,
    distanceKm: number,
    timeMins: number,
    fuelPricePerLiter: number
  ) {
    // 1. Variable Cost (Fuel)
    const fuelCost = (distanceKm / Number(vehicle.average_consumption_km_l)) * fuelPricePerLiter;

    // 2. Fixed Cost per KM (Diluted by monthly KM goal based on ownership status)
    // Monthly cost includes rent/financing/insurance + trackings
    const fixedCostPerKm = Number(vehicle.fixed_monthly_cost) / Number(vehicle.monthly_km_goal);
    const proratedFixedCost = fixedCostPerKm * distanceKm;

    // 3. Maintenance Reserve
    const maintenanceCost = Number(vehicle.maintenance_reserve_per_km) * distanceKm;

    // Calculate total true cost
    const totalCost = fuelCost + proratedFixedCost + maintenanceCost;

    return {
      fuelCost,
      proratedFixedCost,
      maintenanceCost,
      totalCost,
    };
  }

  /**
   * Evaluates if a ride is profitable given an offered price.
   *
   * @param vehicle - The vehicle used for the ride.
   * @param distanceKm - Distance of the ride in kilometers.
   * @param timeMins - Estimated time of the ride in minutes.
   * @param offeredPrice - The price offered for the ride.
   * @param fuelPricePerLiter - Current fuel price.
   * @returns An object containing the profit, profitability status, and cost breakdown.
   */
  public static evaluateRideProfitability(
    vehicle: Vehicle,
    distanceKm: number,
    timeMins: number,
    offeredPrice: number,
    fuelPricePerLiter: number
  ) {
    const costs = this.calculateRideCost(vehicle, distanceKm, timeMins, fuelPricePerLiter);
    const netProfit = offeredPrice - costs.totalCost;
    
    // Additional metrics
    const profitPerKm = netProfit / distanceKm;
    const profitPerHour = (netProfit / timeMins) * 60;

    const isProfitable = netProfit > 0;

    return {
      isProfitable,
      netProfit,
      profitPerKm,
      profitPerHour,
      costs,
    };
  }
}
