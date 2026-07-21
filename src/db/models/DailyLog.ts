import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../connection';
import { User } from './User';

export class DailyLog extends Model {
  declare id: number;
  declare driver_id: number;
  declare date: string;
  declare earnings: number;
  declare km: number;
  declare hours_worked: number;
  declare notes: string | null;
}

DailyLog.init(
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    earnings: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    km: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    hours_worked: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'daily_logs',
    timestamps: true,
  }
);
