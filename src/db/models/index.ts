import { sequelize } from '../connection';
import { User } from './User';
import { Vehicle } from './Vehicle';
import { FinancialRecord } from './FinancialRecord';
import { Ride } from './Ride';
import { Schedule } from './Schedule';

// Define relationships
User.hasOne(Vehicle, { foreignKey: 'driver_id' });
Vehicle.belongsTo(User, { foreignKey: 'driver_id' });

User.hasMany(FinancialRecord, { foreignKey: 'driver_id' });
FinancialRecord.belongsTo(User, { foreignKey: 'driver_id' });

User.hasMany(Ride, { foreignKey: 'driver_id', as: 'driven_rides' });
Ride.belongsTo(User, { foreignKey: 'driver_id', as: 'driver' });

User.hasMany(Ride, { foreignKey: 'passenger_id', as: 'passenger_rides' });
Ride.belongsTo(User, { foreignKey: 'passenger_id', as: 'passenger' });

Ride.hasOne(Schedule, { foreignKey: 'ride_id' });
Schedule.belongsTo(Ride, { foreignKey: 'ride_id' });

User.hasMany(Schedule, { foreignKey: 'driver_id' });
Schedule.belongsTo(User, { foreignKey: 'driver_id' });

export {
  sequelize,
  User,
  Vehicle,
  FinancialRecord,
  Ride,
  Schedule,
};
