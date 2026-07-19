import { User, Vehicle } from './src/db/models';
import { sequelize } from './src/db/connection';

async function fix() {
  const driver = await User.findOne({ where: { custom_url: 'joao' } });
  if (driver) {
    let vehicle = await Vehicle.findOne({ where: { driver_id: driver.id } });
    if (!vehicle) {
      await Vehicle.create({
        driver_id: driver.id,
        make: 'VW',
        model: 'Fox 1.0',
        year: 2014,
        color: 'Preto',
        ownership_status: 'paid_off',
        average_consumption_km_l: 12.5,
        fixed_monthly_cost: 450.00,
        monthly_km_goal: 3000,
      });
      console.log("Vehicle created!");
    } else {
      console.log("Vehicle already exists!");
    }
  }
}
fix();
