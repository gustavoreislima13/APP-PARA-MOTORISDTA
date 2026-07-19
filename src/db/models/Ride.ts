import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../connection';
import { User } from './User';

export class Ride extends Model {
  declare id: number;
  declare driver_id: number;
  declare passenger_id: number | null;
  declare passenger_name: string | null;
  declare passenger_email: string | null;
  declare origin: string;
  declare destination: string;
  declare stops: object | null; // JSON array of stops
  declare distance_km: number;
  declare estimated_time_mins: number;
  declare price: number;
  declare net_profit: number;
  declare status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  declare scheduled_time: Date | null;
}

Ride.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    driver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    passenger_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Nullable if the ride was entered manually without a registered passenger
      references: {
        model: User,
        key: 'id',
      },
    },
    passenger_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    passenger_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    origin: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    destination: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    stops: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    distance_km: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    estimated_time_mins: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    net_profit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
      defaultValue: 'scheduled',
    },
    scheduled_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'rides',
    timestamps: true,
  }
);
