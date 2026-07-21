import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../connection';

export class User extends Model {
  declare id: number;
  declare firebase_uid: string | null;
  declare role: 'driver' | 'passenger';
  declare name: string;
  declare email: string;
  declare phone: string;
  declare pix_key: string | null;
  declare photo_url: string | null;
  declare custom_url: string | null; // For drivers to share their profile
  declare desired_hourly_rate: number | null;
  declare desired_profit_per_km: number | null;
  declare net_income_goal_monthly: number;
  declare work_days_per_month: number;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    firebase_uid: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    role: {
      type: DataTypes.ENUM('driver', 'passenger'),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pix_key: {
      type: DataTypes.STRING,
      allowNull: true, // Only applicable for drivers usually
    },
    photo_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    custom_url: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    desired_hourly_rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    desired_profit_per_km: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    net_income_goal_monthly: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 5000,
    },
    work_days_per_month: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 22,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
  }
);
