import { sequelize } from '../connection';
import { User } from './User';
import { Vehicle } from './Vehicle';
import { FinancialRecord } from './FinancialRecord';
import { Ride } from './Ride';
import { Schedule } from './Schedule';
import { DailyLog } from './DailyLog';
import {
  CityEvent,
  DemandRegion,
  CommunityPost,
  Journey,
  SmartPlanner,
  FuturePrediction,
  TaximeterRate,
  SimulatorRecord,
} from './ExtraModels';

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

User.hasMany(DailyLog, { foreignKey: 'driver_id' });
DailyLog.belongsTo(User, { foreignKey: 'driver_id' });

User.hasMany(CommunityPost, { foreignKey: 'driver_id' });
CommunityPost.belongsTo(User, { foreignKey: 'driver_id' });

User.hasMany(Journey, { foreignKey: 'driver_id' });
Journey.belongsTo(User, { foreignKey: 'driver_id' });

User.hasMany(SmartPlanner, { foreignKey: 'driver_id' });
SmartPlanner.belongsTo(User, { foreignKey: 'driver_id' });

User.hasMany(FuturePrediction, { foreignKey: 'driver_id' });
FuturePrediction.belongsTo(User, { foreignKey: 'driver_id' });

User.hasMany(TaximeterRate, { foreignKey: 'driver_id' });
TaximeterRate.belongsTo(User, { foreignKey: 'driver_id' });

User.hasMany(SimulatorRecord, { foreignKey: 'driver_id' });
SimulatorRecord.belongsTo(User, { foreignKey: 'driver_id' });

export {
  sequelize,
  User,
  Vehicle,
  FinancialRecord,
  Ride,
  Schedule,
  DailyLog,
  CityEvent,
  DemandRegion,
  CommunityPost,
  Journey,
  SmartPlanner,
  FuturePrediction,
  TaximeterRate,
  SimulatorRecord,
};

