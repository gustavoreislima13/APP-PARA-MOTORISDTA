import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../connection';
import { User } from './User';
import { Ride } from './Ride';

export class Schedule extends Model {
  declare id: number;
  declare driver_id: number;
  declare ride_id: number;
  declare start_time: Date;
  declare end_time: Date;
}

Schedule.init(
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
    ride_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Ride,
        key: 'id',
      },
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'schedules',
    timestamps: true,
  }
);
