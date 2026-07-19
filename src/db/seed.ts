import { sequelize } from './connection';
import { User, Vehicle } from './models';

async function seed() {
  try {
    console.log('Synchronizing database models...');
    await sequelize.sync({ force: true }); // Warning: Drops tables first in development

    console.log('Creating test user...');
    const testUser = await User.create({
      role: 'driver',
      name: 'João Motorista',
      email: 'joao@drivermetrics.pro',
      phone: '+5511999999999',
      pix_key: 'joao@pix.com',
      custom_url: 'joao',
    });

    console.log('Creating test vehicle: VW Fox 1.0 2014 Preto...');
    const testVehicle = await Vehicle.create({
      driver_id: testUser.id,
      make: 'VW',
      model: 'Fox 1.0',
      year: 2014,
      color: 'Preto',
      ownership_status: 'paid_off',
      average_consumption_km_l: 12.5,
      fixed_monthly_cost: 450.00, // Safe estimation for insurance/trackers
      monthly_km_goal: 3000,
    });

    console.log('Database seeded successfully!');
    console.log(`Created User ID: ${testUser.id}`);
    console.log(`Created Vehicle ID: ${testVehicle.id}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Execute the seed
seed();
