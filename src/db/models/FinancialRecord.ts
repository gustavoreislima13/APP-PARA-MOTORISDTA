import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../connection';
import { User } from './User';

export class FinancialRecord extends Model {
  declare id: number;
  declare driver_id: number;
  declare type: 'revenue' | 'expense';
  declare category: 'ride' | 'fuel' | 'maintenance' | 'rent' | 'insurance' | 'other';
  declare amount: number;
  declare description: string;
  declare date: Date;
}

FinancialRecord.init(
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
    type: {
      type: DataTypes.ENUM('revenue', 'expense'),
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM('ride', 'fuel', 'maintenance', 'rent', 'insurance', 'other'),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'financial_records',
    timestamps: true,
  }
);
