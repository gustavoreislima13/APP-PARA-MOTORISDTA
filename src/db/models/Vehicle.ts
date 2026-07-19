import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../connection';
import { User } from './User';

export class Vehicle extends Model {
  declare id: number;
  declare driver_id: number;
  declare make: string;
  declare model: string;
  declare year: number;
  declare color: string;
  declare ownership_status: 'rented' | 'financed' | 'paid_off';
  declare average_consumption_km_l: number; // KM/L
  declare fixed_monthly_cost: number; // Rent, insurance, tracking
  declare monthly_km_goal: number; // Meta KM
  declare maintenance_reserve_per_km: number; // R$/KM
  
  declare is_active: boolean;
  declare car_payment_monthly: number;
  declare insurance_monthly: number;
  declare ipva_yearly: number;
  declare internet_monthly: number;
  declare tires_total: number;
}

Vehicle.init(
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
    make: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ownership_status: {
      type: DataTypes.ENUM('rented', 'financed', 'paid_off'),
      allowNull: false,
    },
    average_consumption_km_l: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    fixed_monthly_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    monthly_km_goal: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    maintenance_reserve_per_km: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.15,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    car_payment_monthly: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    insurance_monthly: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    ipva_yearly: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    internet_monthly: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    tires_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'vehicles',
    timestamps: true,
  }
);
